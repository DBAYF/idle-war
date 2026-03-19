# Steal Bug: Debugging and Fix Document

## 1. BUG DEFINITION

**Exact bug:** When the game reports that coins were stolen (e.g. “+X stolen”), the CPU target’s displayed coin total does not decrease, so it looks like the steal had no effect.

**Expected behaviour:** When a steal is resolved, (1) the defender’s loose coins decrease in state, (2) the attacker’s loose coins increase, and (3) any UI that shows “the target’s coins” (including the CPU) should show a lower value after the steal.

**Observed incorrect behaviour:** The combat feedback correctly shows “+X stolen”, and state updates are correct (defender loose coins decrease, attacker loose coins increase). However, the only coin value shown for opponents (including the CPU) is **secured wealth**. Steals only affect **loose coins**. So the number the player sees for the CPU never goes down, even though the CPU’s loose coins did decrease in state.

**Why this is critical:** It undermines trust in combat and economy: the player believes steals don’t work against the CPU, or that the game is lying. The bug is **display/UX**: we show the wrong metric for opponents, not a state or resolution bug.

---

## 2. LIKELY ROOT CAUSE HYPOTHESES (RANKED)

1. **Opponent UI shows secured wealth only; steals only affect loose coins** — **CONFIRMED.** ScoreboardStrip and WorldViewOverlay display `p.economy.securedWealth` for every player. Steal resolution only subtracts from `looseCoins`. So the displayed “coins” for the CPU do not change when steals are applied.

2. ~~Target loose coins are not decremented~~ — Ruled out. `resolveArrivingUnits` in `gameStore.ts` correctly subtracts `stealAmount` from the target’s `looseCoins` and adds it to the owner’s.

3. ~~Feedback uses theoretical instead of actual steal~~ — Ruled out. `lastStealFeedback.amount` is set from `totalStolenByLocal`, which is the sum of actual `stealAmount` values applied.

4. ~~Wrong player mutated~~ — Ruled out. Target is resolved by `newPlayers.find(p => p.id === u.targetId)`; CPU and human targets use the same path.

5. ~~Mutated values overwritten later in tick~~ — Ruled out. Order is `tick()` then `resolveArrivingUnits()`; resolution does a single `set({ players: newPlayers, ... })` and nothing else overwrites `players` in the same tick.

---

## 3. FULL STEAL PIPELINE TRACE

| Step | Location | What happens |
|------|----------|--------------|
| Attack created | `gameStore.deployUnit` | Unit added to `unitsInFlight` with `ownerId`, `targetId`. |
| Target resolved | `gameStore.resolveArrivingUnits` | `target = newPlayers.find(p => p.id === u.targetId)` (same for CPU/human). |
| Steal calculated | `combat.resolveUnitArrival(stats, target.economy.looseCoins, attackCount, isLeaderTarget)` | Returns `stealAmount` capped by `targetLooseCoins`; leader/repeat modifiers applied. |
| Shield applied | `gameStore.resolveArrivingUnits` | `stealAmount = Math.floor(stealAmount * (1 - shieldReduction))`. |
| Defender loss | `gameStore.resolveArrivingUnits` | `newPlayers.map`: for `p.id === u.targetId`, `looseCoins: Math.max(0, p.economy.looseCoins - stealAmount)`. |
| Attacker gain | Same loop | For `p.id === u.ownerId`, `looseCoins: p.economy.looseCoins + stealAmount`. |
| Stats | Same block | `coinsLost` and `coinsStolen` incremented by `stealAmount`. |
| Feedback | Same block | `lastStealFeedback = { amount: totalStolenByLocal }` (sum of actual steals by local player). |
| State commit | Same block | `set({ players: newPlayers, unitsInFlight: ..., matchStats: newStats, lastStealFeedback, recentImpacts })`. |
| UI – steal message | `StealFeedback.tsx` | Reads `lastStealFeedback.amount` from store → “+X stolen”. |
| UI – opponent coins | `ScoreboardStrip.tsx`, `WorldViewOverlay.tsx` | Read `p.economy.securedWealth` only → **does not reflect loose coin changes.** |

**Files/modules:**

- **Combat:** `src/domain/combat.ts` — `resolveUnitArrival`, `getShieldReduction`
- **Resolution:** `src/store/gameStore.ts` — `resolveArrivingUnits` (lines ~685–787)
- **Tick order:** `src/features/game/MatchScreen.tsx` — `tick()` then `resolveArrivingUnits()` each TICK_MS
- **Feedback UI:** `src/features/game/components/hud/StealFeedback.tsx` — `lastStealFeedback.amount`
- **Opponent coins UI:** `src/features/game/components/hud/ScoreboardStrip.tsx` (securedWealth), `src/features/game/components/overlays/WorldViewOverlay.tsx` (securedWealth)

---

## 4. ROOT CAUSE FINDING

**Confirmed cause:** The UI that shows “how many coins” an opponent (including the CPU) has uses **secured wealth only**. Steal resolution only changes **loose coins**. So:

- State: defender `looseCoins` decrease and attacker `looseCoins` increase correctly.
- Display: opponent “coins” = `securedWealth` → unchanged by steals → user sees “coins stolen” but no drop in the CPU’s number.

**Code path:** ScoreboardStrip and WorldViewOverlay render `p.economy.securedWealth` for each player. No component shows opponent `looseCoins` (or total wealth) in the main HUD. So the bug appears specifically as “coins stolen but CPU coins don’t go down” because the only visible number for the CPU is one that steal logic never touches.

---

## 5. FIX PLAN

**Principle:** The value we display as “this player’s coins” must include loose coins so that when steals happen, the displayed value decreases.

| Item | Target | Change | Why | Risk |
|------|--------|--------|-----|------|
| Scoreboard value | `ScoreboardStrip.tsx` | Show total wealth `p.economy.looseCoins + p.economy.securedWealth` instead of only `securedWealth`. | So the scoreboard number for the CPU goes down when loose coins are stolen. | Low. Bar can stay secured-vs-win-threshold for rules. |
| Overlay value | `WorldViewOverlay.tsx` | Show total wealth for each player instead of only `securedWealth`. | Same: overlay “coins” for opponent reflect steals. | Low. |
| (Optional) Defensive cap | `gameStore.resolveArrivingUnits` | After shield, cap `stealAmount = Math.min(stealAmount, target.economy.looseCoins)`. | Guards floating point or ordering; already effectively capped by domain. | Very low. |

No change to combat formulas, stats, or feedback — they already use actual steal amounts and correct state updates.

---

## 6. SINGLE SOURCE OF TRUTH RULE

**Combat / economy (already enforced):**

- `actualSteal = min(calculatedSteal, defender.looseCoins)` — in `resolveUnitArrival` and by reading target from `newPlayers` each arrival.
- Defender: `looseCoins -= actualSteal` (with `Math.max(0, ...)`).
- Attacker: `looseCoins += actualSteal`.
- Feedback: `lastStealFeedback.amount = sum(actualSteal)` for local player.
- Stats: `coinsLost` / `coinsStolen` += `actualSteal`.

**Display rule (fix):**

- Any UI that shows “this player’s coins” for an opponent must use a value that includes **loose coins** (e.g. total wealth = loose + secured) so that steals are visible. Using only secured wealth for opponents is incorrect for steal feedback.

---

## 7. IMPLEMENTATION TASK BREAKDOWN

| # | Objective | Files | Change | Done when | Verify |
|---|-----------|-------|--------|-----------|--------|
| 1 | Scoreboard reflects steals | `ScoreboardStrip.tsx` | Display `looseCoins + securedWealth` for the numeric value; keep bar as secured vs win threshold. | Scoreboard number for CPU decreases after a steal. | Steal from CPU, see scoreboard number drop. |
| 2 | Overlay reflects steals | `WorldViewOverlay.tsx` | Display total wealth (loose + secured) for each player. | Overlay number for CPU decreases after a steal. | Same. |
| 3 | (Optional) Defensive cap | `gameStore.ts` | After shield reduction, `stealAmount = Math.min(stealAmount, target.economy.looseCoins)`. | No over-deduction in edge cases. | Unit tests / manual. |

---

## 8. TESTING PLAN

- **Unit:** `resolveUnitArrival` caps steal by `targetLooseCoins`; shield only reduces.
- **Integration:** Arrival resolution: defender loose coins decrease, attacker increase; stats and feedback use same amount.
- **CPU target:** Steal from CPU; assert defender (CPU) `looseCoins` decreased, attacker increased; **UI shows lower “coins” for CPU** (ScoreboardStrip / WorldViewOverlay).
- **Zero loose:** Target has 0 loose coins; steal amount 0; no state change; no “+X stolen” for that hit.
- **Partial cap:** Target has 30 loose; calculated steal 50; actual steal 30; feedback/stats 30; defender −30, attacker +30.
- **Regression:** Banking, secured wealth, win condition (secured threshold) unchanged; no phantom steals.

---

## 9. DEBUG TOOLING / TEMPORARY INSTRUMENTATION

If needed for verification:

- In `resolveArrivingUnits`, log per arrival: `targetId`, `target.economy.looseCoins` before/after, `stealAmount`, `u.ownerId`, and after loop: defender and attacker entries in `newPlayers` (looseCoins).
- In StealFeedback or store: log `lastStealFeedback.amount` and, for the target, `players.find(p => p.id === targetId).economy.looseCoins` on next tick.

These confirm that state and feedback use the same actual steal and that UI should show total wealth to reflect it.

---

## 10. QUALITY GATES

Fix is complete when:

- When “coins stolen” is shown, the defender’s loose coins actually decreased in state.
- The correct defender is affected (targetId resolution).
- Attacker gain equals actual steal.
- Feedback shows actual transferred value (already true).
- Stats match actual state changes (already true).
- **CPU and human targets both show a decreasing “coins” value when they lose loose coins to steals.**
- No regressions to banking or secured wealth logic.
- No phantom steal events.

---

## 11. OUT-OF-SCOPE / DO NOT DO

- Do not hide or change only the “coins stolen” message.
- Do not fake a UI-only subtraction without state.
- Do not change balance rules without documenting.
- Do not duplicate or split steal logic; keep one resolution path.
- Do not ignore CPU-specific paths (they use the same path; fix is to show the right data in UI).

---

## 12. FINAL RECOMMENDATION

- **Most likely cause:** Opponent “coins” in the UI are secured wealth only; steals only affect loose coins, so the displayed number never drops.
- **Best fix:** Show total wealth (loose + secured) for opponents in ScoreboardStrip and WorldViewOverlay so the number that can be stolen is visible and decreases when steals are applied.
- **Source-of-truth rule:** Combat and state remain as-is; add display rule: opponent “coins” must include loose coins (e.g. total wealth).
- **Implementation order:** (1) ScoreboardStrip, (2) WorldViewOverlay, (3) optional defensive cap in resolution.
- **Regression checks:** Win condition and ranking still use secured wealth; bar in scoreboard can stay secured-based; banking and secured logic untouched.
