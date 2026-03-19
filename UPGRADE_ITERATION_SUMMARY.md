# Click War Upgrade Iteration — Implementation Summary

## Overview

The Click War Upgrade Iteration Plan has been implemented across four phases. This document summarizes all changes made.

---

## Phase 1: Correctness and Architecture Stabilisation

### 1.1 Combat Consolidation

- **`src/domain/combat.ts`**: Added `resolveUnitArrival(stats, targetLooseCoins, attackCount, isLeaderTarget)` as the single source of truth for combat formulas:
  - Leader bonus: 1.1x steal when attacking the wealth leader
  - Repeat-attack penalty: after 3 attacks, reduce steal by 10% per extra attack (min 50%)
- **`src/store/gameStore.ts`**: Replaced inline steal/wall logic in `resolveArrivingUnits` with calls to `resolveUnitArrival`
- Removed unused `calculateStealAmount` and `calculateWallDamage` from combat.ts

### 1.2 Deterministic Simulation Time

- **`src/domain/constants.ts`**: Added `TICK_MS = 1000/60`
- **`src/store/gameStore.ts`**:
  - Added `tickIndex` to `GameState`; incremented each tick
  - `simulationTime = matchStartTime + tickIndex * TICK_MS` used for all tick logic
  - `tick()` and `resolveArrivingUnits()` take no args; use internal state
  - Unit progress via `updateUnitProgress(unit, simulationTime)` from combat.ts
  - `deployUnit` and `applyRemoteAction` (deploy) use `simulationTime` for `spawnTime` and cooldowns
- **`src/features/game/MatchScreen.tsx`**: Tick loop calls `tick()` and `resolveArrivingUnits()` without passing time

### 1.3 Domain Unit Tests

- **`src/domain/economy.test.ts`**: Tests for `getUpgradeCost`, `applyUpgradeEffect`, `bankCoins`, `hasReachedWinThreshold`
- **`src/domain/combat.test.ts`**: Tests for `createUnitInFlight`, `updateUnitProgress`, `resolveUnitArrival`, `getUnitTravelDuration`
- **`src/domain/ai.test.ts`**: Tests for `getAIAction` (bank, click, deploy, upgrade, null cases)
- **`src/store/determinism.test.ts`**: Determinism test — 100 ticks produce identical state checksum on two runs
- **`vitest.config.ts`**: Vitest config with `globals: true`, `environment: 'node'`
- **`package.json`**: Added `test`, `test:watch`, `validate-content` scripts

---

## Phase 2: Gameplay/System Completion

### 2.1 Defender

- **`src/domain/types.ts`**: Added `defenderShieldUntil`, `defenderShieldPercent` to `PlayerState`
- **`src/domain/constants.ts`**: Added `DEFENDER_SHIELD_DURATION_MS = 3000`, `DEFENDER_SHIELD_PERCENT = 0.2`
- **`src/domain/combat.ts`**: Added `getShieldReduction()` for defender and bank shields
- **`src/store/gameStore.ts`**:
  - Defender deploy: no unit in flight; sets `defenderShieldUntil` and `defenderShieldPercent` on owner
  - `resolveArrivingUnits` applies shield reduction to steal amount
  - Same logic in `applyRemoteAction` for defender deploy
- **`src/features/game/components/deploy/DeployBar.tsx`**: Added `UnitCard type="defender"`
- **`src/features/game/components/deploy/UnitCard.tsx`**: Defender deploys on self (no target selector); uses simulation time for cooldown

### 2.2 Saboteur

- **`src/domain/types.ts`**: Added `saboteurDebuffUntil` to `PlayerState`
- **`src/domain/constants.ts`**: Added `SABOTEUR_DEBUFF_MULTIPLIER = 0.8`
- **`src/store/gameStore.ts`**:
  - On saboteur resolve: set `saboteurDebuffUntil` on target
  - `clickForCoins` and tick economy apply 0.8x to `coinPerClick` when debuff active
  - AI click applies saboteur multiplier

### 2.3 Bank Shield

- **`src/domain/types.ts`**: Added `bankShieldUntil`, `bankShieldPercent` to `PlayerState`
- **`src/store/gameStore.ts`**:
  - `bankCoins` sets `bankShieldUntil` and `bankShieldPercent` from `bank_shield` upgrade level
  - Formula: `bankShieldUntil = now + 2000 * (1 + level * 0.1)`, `bankShieldPercent = 0.1 * level`
  - `resolveArrivingUnits` applies bank shield reduction via `getShieldReduction`
  - Same logic for remote bank in `applyRemoteAction` and AI bank

### 2.4 AI Changes

- **`src/store/gameStore.ts`**: Removed `aiActed`; all bots can act each tick
- **`src/domain/ai.ts`**:
  - Added `unitsInFlight` parameter to `getAIAction`
  - Defender deploy when `unitsTargetingBot > 2` and can afford
  - Added defender to deploy order; deploy defender targets self (`bot.id`)

---

## Phase 3: Multiplayer Robustness and Tooling

### 3.1 Disconnect Overlay

- **`src/store/gameStore.ts`**: Added `peerDisconnected`, `setPeerDisconnected`
- **`src/features/lobby/RoomLobbyScreen.tsx`**: `onPeerLeft` calls `setPeerDisconnected(true)` for host and joiner
- **`src/features/game/components/overlays/DisconnectOverlay.tsx`**: New overlay — "Opponent left" with "Return to Lobby" button
- **`src/features/game/MatchScreen.tsx`**: Renders `DisconnectOverlay`
- **`src/App.css`**: Styles for `.disconnect-overlay`, `.disconnect-panel`, `.disconnect-title`, `.disconnect-message`

### 3.2 Debug HUD

- **`src/features/game/components/overlays/DebugHUD.tsx`**: Dev-only overlay (Ctrl+D) showing tick, match time, unit count, players, FPS
- **`src/features/game/MatchScreen.tsx`**: Renders `DebugHUD`
- **`src/App.css`**: Styles for `.debug-hud`, `.debug-hud-row`

### 3.3 Network Logger

- **`src/shared/network/matchService.ts`**: In dev, logs `[net] send` and `[net] recv` with action type and timestamp to console

### 3.4 Config Validator

- **`src/domain/validateContent.ts`**: Zod schemas for units and upgrades; `validateContent()` returns `{ valid, errors }`
- **`src/domain/validateContent.test.ts`**: Test that `validateContent()` passes
- **`package.json`**: `validate-content` script runs validation test

---

## Phase 4: Data-Driven Content and Polish

### 4.1 Data-Driven Content

- **`content/units.json`**: Unit definitions (runner, bruiser, saboteur, defender)
- **`content/upgrades.json`**: Upgrade definitions (click_power, auto_miner, supply_gen, bank_shield)
- **`src/domain/loadContent.ts`**: Loads JSON, validates with Zod, falls back to embedded defaults on error
- **`src/domain/constants.ts`**: `UNIT_STATS` and `UPGRADE_DEFINITIONS` now come from `loadUnits()` and `loadUpgrades()`

### 4.2 Combat Feedback

- **`src/store/gameStore.ts`**: `ImpactEvent` extended with `amount`; `resolveArrivingUnits` accumulates `stealByTarget` and passes it to impacts
- **`src/features/game/components/battle/BattleLayer.tsx`**: Shows steal amount (`+N`) as floating text near impact burst using PixiJS `Text`

---

## Files Changed / Added

| File | Change |
|------|--------|
| `src/domain/combat.ts` | `resolveUnitArrival`, `getShieldReduction`; removed old formulas |
| `src/domain/constants.ts` | `TICK_MS`, defender/saboteur constants; `UNIT_STATS`/`UPGRADE_DEFINITIONS` from loadContent |
| `src/domain/types.ts` | Defender, saboteur, bank shield fields on `PlayerState` |
| `src/domain/ai.ts` | Defender logic, `unitsInFlight` param, deploy order |
| `src/domain/loadContent.ts` | **New** — JSON loader with Zod validation |
| `src/domain/validateContent.ts` | **New** — Zod validation for content |
| `src/store/gameStore.ts` | Deterministic time, combat consolidation, defender/saboteur/bank shield, remove aiActed, peerDisconnected |
| `src/features/game/MatchScreen.tsx` | Tick args, DisconnectOverlay, DebugHUD |
| `src/features/game/components/deploy/DeployBar.tsx` | Defender card |
| `src/features/game/components/deploy/UnitCard.tsx` | Defender self-deploy, simulation time cooldown |
| `src/features/game/components/overlays/DisconnectOverlay.tsx` | **New** |
| `src/features/game/components/overlays/DebugHUD.tsx` | **New** |
| `src/features/game/components/battle/BattleLayer.tsx` | Steal amount on impact |
| `src/features/lobby/RoomLobbyScreen.tsx` | `onPeerLeft` → `setPeerDisconnected` |
| `src/shared/network/matchService.ts` | Dev logging for send/recv |
| `content/units.json` | **New** |
| `content/upgrades.json` | **New** |
| `vitest.config.ts` | **New** |
| `package.json` | test, validate-content scripts |
| `src/App.css` | Disconnect overlay, debug HUD styles |

---

## Quality Gates Met

- Simulation correctness: deterministic tick, economy, combat
- Combat formula consistency: single source in `combat.ts`
- Deterministic timing: `tickIndex`-driven; determinism test passes
- AI behaviour: all bots act per tick; defender in deploy order
- Defender, saboteur, bank shield implemented
- Disconnect overlay and debug HUD
- Config validation via Zod
- Data-driven units and upgrades
- Combat feedback (steal amount on impact)
