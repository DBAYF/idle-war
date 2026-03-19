# Mobile and Intelligent CPU Upgrade — Implementation Summary

## What was done

The **Mobile and Intelligent CPU Upgrade Plan** was implemented end-to-end across five phases.

---

### Phase 1: Mobile diagnosis and critical interaction fixes

- **Pointer/touch handling**
  - **UnitCard:** `onPointerDown` / `onPointerUp` / `onPointerCancel` with `preventDefault()` on down; action fired on pointer up when the pointer was pressed on the same element; `onClick` kept as fallback for keyboard; double-fire avoided via `firedFromPointerRef`.
  - **TargetSelector:** Same pattern per target tab; stored which tab was pressed so release on the same tab selects that target; scroll-into-view for the selected tab.
  - **ResourceClickField:** Pointer handlers with stored `clientX` for float position; same fallback and double-fire guard.
  - `touchAction: 'manipulation'` set on UnitCard and ResourceClickField.

- **Debounce**
  - **UnitCard:** After a successful deploy, a 400 ms lock (`deployLockUntil`) prevents repeat deploys; button is disabled and re-enables after lock.
  - **ResourceClickField:** 300 ms debounce via `clickLockUntilRef` so rapid taps do not double-apply.

- **Deploy visibility and target clarity**
  - **Mobile HUD order:** Deploy section (`hud-bottom`) set to `order: 0` so it appears first in the scrollable HUD; other sections follow (hud-top 1, hud-left 2, hud-right 4, hud-minimap 5).
  - **DeployBar:** "Deploy" section label and `aria-label="Deploy units"` added.
  - **TargetSelector:** "Attacking: [Name]" label when a target is selected; selected tab styling strengthened (border-width, background, box-shadow); scroll-into-view on selection.
  - **CSS:** `.target-attacking-label`, `.deploy-section-label`, stronger `.target-tab.selected`.

---

### Phase 2: Deploy/target execution and instrumentation

- **lastBotAction in gameStore**
  - State: `lastBotAction: { botId: string; action: string; tickIndex: number } | null`.
  - On each bot action (bank, click, upgrade, deploy), `lastBotActionThisTick` is set and written in `set()` (or previous value kept when no bot acts).
  - Actions stored as `'bank'`, `'click'`, `'upgrade:&lt;id&gt;'`, `'deploy:&lt;type&gt;'`.

- **DebugHUD**
  - New row showing last CPU action: bot name, action string, and tick index (e.g. "CPU: Player 2 → deploy:runner (tick 123)").

---

### Phase 3: Utility-based CPU architecture

- **AI_DIFFICULTY_PRESETS extended** ([src/domain/constants.ts](src/domain/constants.ts))
  - New fields: `attackWeight` (easy 0.5 → brutal 1.8), `noiseWidth` (easy 0.35 → brutal 0.06).
  - New type: `AIDifficultyPreset`.

- **getAIAction rewritten** ([src/domain/ai.ts](src/domain/ai.ts))
  - **Model:** All actions compete in one step. For each feasible action (bank, click, one upgrade, deploy options per target/unit), a base score is computed, then perturbed with `(random() - 0.5) * noiseWidth * max(1, score)`. The action with highest perturbed score is chosen; optional 10th parameter `random` (default `Math.random`) for tests.
  - **Scores:** Bank (loose vs threshold, + under threat); click (when cooldown elapsed); upgrade (first affordable, supply/auto priority); deploy (per target and unit: target score × time factor × attackWeight × unit bonus); defender when units targeting bot > 2.
  - **Target scoring:** Leader bonus, wealth, loose coins, low wall, “we’re behind” bonus.
  - **Deploy feasibility:** Uses `deployThrottleMs`, `deployLooseMin`, `deploySupplyMin`; defender when > 2 units targeting bot; attack types from `getFeasibleDeployTypes` (bruiser for low wall, runner when target ahead, saboteur for leader, etc.).
  - **Anti-idle:** If no candidate has score ≥ 0.5 and click cooldown is elapsed, returns `'click'`; if no candidates at all and click elapsed, returns `'click'`.

- **AI tests**
  - Tests use deterministic RNG `() => 0.5` so outcomes are stable.
  - Expectations relaxed where the new model allows multiple valid actions (e.g. deploy vs bank vs upgrade); deploy target and “no deploy when throttle not elapsed” still asserted where relevant.

---

### Phase 4: Controlled randomness and anti-idle

- **Score perturbation:** Already in Phase 3 via `addNoise(score)` and `noiseWidth` per difficulty.
- **Timing jitter:** `effectiveDeployThrottleMs = deployThrottleMs * (0.95 + 0.1 * random())` so deploy timing varies slightly per decision.
- **Anti-idle:** Handled in Phase 3 (force click when no good action and click available).

---

### Phase 5: UX and polish

- **Difficulty descriptions** ([src/features/lobby/GameRulesForm.tsx](src/features/lobby/GameRulesForm.tsx))
  - `AI_DIFFICULTY_DESCRIPTIONS`: short text per difficulty (e.g. "Easy: Focuses on economy; slower to attack.", "Brutal: Very aggressive and accurate; tough opponent.").
  - Shown under the AI difficulty presets; each button has `title` and `aria-label` with the description.
  - Helper text updated to "Affects bot aggression, timing, and targeting."

---

## Files touched

| Area | Files |
|------|--------|
| Mobile / pointer / debounce | [UnitCard.tsx](src/features/game/components/deploy/UnitCard.tsx), [TargetSelector.tsx](src/features/game/components/deploy/TargetSelector.tsx), [ResourceClickField.tsx](src/features/game/components/hud/ResourceClickField.tsx) |
| Deploy visibility / target UX | [DeployBar.tsx](src/features/game/components/deploy/DeployBar.tsx), [App.css](src/App.css) |
| Instrumentation | [gameStore.ts](src/store/gameStore.ts), [DebugHUD.tsx](src/features/game/components/overlays/DebugHUD.tsx) |
| CPU / AI | [ai.ts](src/domain/ai.ts), [constants.ts](src/domain/constants.ts), [ai.test.ts](src/domain/ai.test.ts) |
| UX | [GameRulesForm.tsx](src/features/lobby/GameRulesForm.tsx) |

---

## Verification

- **Tests:** `npm test -- --run` — all 47 tests pass (including `ai.test.ts` and `determinism.test.ts`).
- **Lint:** No reported issues on modified files.
- **Behaviour:** Mobile gets pointer-first handling and debounce; deploy is first in HUD on mobile; target shows "Attacking: X" and scroll-into-view; CPU uses utility scoring with noise and timing jitter; difficulty descriptions and last CPU action are visible in UI and debug HUD.

---

## Summary

- **Mobile:** Reliable tap handling (pointer events + fallback), deploy and click debounce, deploy section first on mobile, clear target selection and "Attacking" label.
- **CPU:** Utility-based AI with bank/click/upgrade/deploy scoring, difficulty-based `attackWeight` and `noiseWidth`, target and unit scoring, timing jitter, anti-idle, and optional deterministic `random` for tests.
- **Observability:** `lastBotAction` in store and DebugHUD for last CPU action.
- **UX:** AI difficulty descriptions in the rules form and clearer helper text.
