# Custom Game Setup – Implementation Summary

## Overview

A custom game setup layer has been added so users can configure win goal, supply scarcity, and AI difficulty. In multiplayer, the host sets the rules; offline uses a Custom Game screen. Both flows share the same `MatchConfig` for consistent behavior.

---

## 1. Types and Constants

### [src/domain/types.ts](src/domain/types.ts)
- Added `AIDifficulty`: `'easy' | 'normal' | 'hard' | 'brutal'`
- Added `SupplyScarcity`: `'easy' | 'normal' | 'hard'`
- Extended `MatchConfig` with `supplyCap`, `initialSupply`, `aiDifficulty`

### [src/domain/constants.ts](src/domain/constants.ts)
- Added `INITIAL_SUPPLY = 5`
- Extended `DEFAULT_MATCH_CONFIG` with `supplyCap`, `initialSupply`, `aiDifficulty: 'normal'`
- Added `SUPPLY_SCARCITY_PRESETS` (easy/normal/hard)
- Added `AI_DIFFICULTY_PRESETS` (click, bank, deploy, upgrade thresholds per difficulty)

---

## 2. Economy and AI

### [src/domain/economy.ts](src/domain/economy.ts)
- `createInitialEconomy(config?)`: uses `config.initialSupply`, `config.baseSupplyRate`, `config.baseClickValue` when provided
- `hasReachedWinThreshold(wealth, config?)`: uses `config.winThreshold` when provided

### [src/domain/ai.ts](src/domain/ai.ts)
- `getAIAction(..., aiDifficulty?)`: uses `AI_DIFFICULTY_PRESETS` for difficulty-based behavior
- Easy: slower clicks, higher bank threshold, less frequent deploys
- Hard/Brutal: faster clicks, lower bank threshold, more frequent deploys

---

## 3. Network and Game Store

### [src/shared/network/matchService.ts](src/shared/network/matchService.ts)
- Extended `start` action with optional `matchConfig`
- Host sends `matchConfig`; joiner receives and applies it

### [src/store/gameStore.ts](src/store/gameStore.ts)
- Added `matchConfig: MatchConfig | null` to state
- `startMatch(playerCount, config?)`: stores config, passes to `createPlayer`
- `startMultiplayerMatch(..., matchConfig?)`: stores config for tick/economy
- `createPlayer(id, index, config?)`: passes config to `createInitialEconomy`
- `tick`: uses `matchConfig` for duration, supply cap, supply rate, win threshold, AI difficulty

---

## 4. UI Components

### [src/features/lobby/GameRulesForm.tsx](src/features/lobby/GameRulesForm.tsx) (new)
- Shared form for win goal, supply scarcity, duration, and optional AI difficulty
- Props: `config`, `onChange`, `showAiDifficulty`
- Win goal: slider 500–3000
- Supply scarcity: Easy / Normal / Hard presets
- Duration: slider 2–10 min
- AI difficulty: Easy / Normal / Hard / Brutal (when `showAiDifficulty` is true)

### [src/features/lobby/CustomGameSetup.tsx](src/features/lobby/CustomGameSetup.tsx) (new)
- Offline custom game screen
- Mode: 1v1, 2v2, FFA
- Uses `GameRulesForm` with `showAiDifficulty: true`
- Start → `startMatch(playerCount, config)` → navigate to match

### [src/features/lobby/RoomLobbyScreen.tsx](src/features/lobby/RoomLobbyScreen.tsx)
- Host sees `GameRulesForm` (no AI difficulty) before starting
- `handleStartMatch` builds `MatchConfig`, creates players with config, broadcasts `start` with `matchConfig`
- Joiner receives `matchConfig` in `start` action and passes it to `startMultiplayerMatch`

---

## 5. Lobby, Routing, HUD

### [src/features/lobby/LobbyScreen.tsx](src/features/lobby/LobbyScreen.tsx)
- Added Custom mode card → `navigate('/custom')`

### [src/App.tsx](src/App.tsx)
- Added route `/custom` → `CustomGameSetup`

### HUD components
- **ResourceMeters**: uses `matchConfig?.winThreshold`, `matchConfig?.supplyCap`, `matchConfig?.durationSec`
- **ScoreboardStrip**: uses `matchConfig?.winThreshold`
- **MatchEndScreen**: uses `matchConfig?.winThreshold` for progress bars and `hasReachedWinThreshold(wealth, matchConfig)`

---

## 6. Presets

| Supply Scarcity | baseSupplyRate | supplyCap | initialSupply |
|-----------------|----------------|-----------|---------------|
| Easy            | 0.35           | 100       | 10            |
| Normal          | 0.25           | 80        | 5             |
| Hard            | 0.15           | 60        | 3             |

| AI Difficulty | clickCooldownMs | bankThreshold | deployThrottleMs | deployLooseMin | deploySupplyMin |
|---------------|-----------------|---------------|------------------|----------------|-----------------|
| Easy          | 1800            | 120           | 20000            | 100            | 50              |
| Normal        | 1100            | 90            | 14000            | 70             | 35              |
| Hard          | 700             | 60            | 9000             | 50             | 25              |
| Brutal        | 450             | 40            | 5000             | 35             | 15              |

---

## Files Created
- `src/features/lobby/GameRulesForm.tsx`
- `src/features/lobby/CustomGameSetup.tsx`

## Files Modified
- `src/domain/types.ts`
- `src/domain/constants.ts`
- `src/domain/economy.ts`
- `src/domain/ai.ts`
- `src/shared/network/matchService.ts`
- `src/store/gameStore.ts`
- `src/features/lobby/RoomLobbyScreen.tsx`
- `src/features/lobby/LobbyScreen.tsx`
- `src/App.tsx`
- `src/App.css` (game rules form styles)
- `src/features/game/components/hud/ResourceMeters.tsx`
- `src/features/game/components/hud/ScoreboardStrip.tsx`
- `src/features/game/MatchEndScreen.tsx`
