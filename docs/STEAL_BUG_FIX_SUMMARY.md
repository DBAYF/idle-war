# Steal Bug Fix — Summary

## What was done

1. **Root cause identified**  
   Combat resolution and state updates were correct: defender `looseCoins` decrease and attacker `looseCoins` increase. The bug was **display**: the only “coins” value shown for opponents (including the CPU) was **secured wealth**. Steals only affect **loose coins**, so the number on screen never went down when coins were stolen.

2. **Debug document added**  
   `docs/STEAL_BUG_DEBUG_AND_FIX.md` contains:
   - Bug definition and why it’s a trust issue
   - Ranked hypotheses (display vs state)
   - Full steal pipeline trace (files and steps)
   - Confirmed root cause (UI shows secured only)
   - Fix plan, single source of truth rule, task list
   - Testing plan, tooling, quality gates, out-of-scope, final recommendation

3. **Code changes**
   - **ScoreboardStrip.tsx**  
     - Sort and numeric value now use **total wealth** (`looseCoins + securedWealth`) so the CPU’s number decreases when loose coins are stolen.  
     - Bar fill still uses **secured wealth** vs win threshold (unchanged).
   - **WorldViewOverlay.tsx**  
     - Player coin display changed from `securedWealth` to **total wealth** (`looseCoins + securedWealth`) so overlay numbers reflect steals.
   - **gameStore.ts**  
     - In `resolveArrivingUnits`, added a defensive cap: `stealAmount = Math.min(stealAmount, target.economy.looseCoins)` after shield reduction so we never deduct more than current loose coins.

## Result

- When the game reports “+X stolen”, the **state** was already correct; now the **UI** shows it: the CPU’s (and any opponent’s) displayed “coins” go down because they include loose coins.
- One source of truth: combat uses actual steal; feedback and stats already used it; display now shows a value that includes the pool that was actually stolen (loose coins).

## How to verify

- Steal from the CPU and confirm the scoreboard and world overlay numbers for the CPU decrease by the stolen amount (or by the visible portion of it if multiple hits).
- Confirm win condition and ranking logic are unchanged (still based on secured wealth where applicable).
