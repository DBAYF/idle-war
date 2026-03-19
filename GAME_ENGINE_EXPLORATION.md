# Click War — Full Game Engine Exploration

A comprehensive engine architecture, gameplay systems, and implementation planning document. This document serves as the technical foundation for engine build, gameplay systems design, multiplayer architecture, and scaling.

---

## 1. ENGINE INTENT

### What This Engine Must Be

Click War requires a **lightweight, browser-based real-time economy-war engine** optimised for:

- **Responsiveness** — Player actions (click, bank, deploy, upgrade) must feel instant. Target: <50ms perceived latency from input to visual/audio feedback.
- **Determinism where it matters** — Tick-driven simulation (economy, supply, unit progress, combat resolution) must be reproducible given identical inputs and timing. Multiplayer sync depends on this.
- **Low complexity** — No 3D, no physics engine, no pathfinding. The engine is 2D, entity-light, and formula-driven.
- **Web-first** — Runs in browser; PixiJS for rendering, Web Audio for sound, PeerJS for P2P networking. No native engine.
- **Content flexibility** — Units, upgrades, and balance values should be data-driven. New content should not require engine rewrites.

### What This Engine Must Not Compromise

- **Simulation correctness** — Economy, combat, and win conditions must never desync or produce incorrect results.
- **Input responsiveness** — The core loop (click → bank → deploy) must never feel sluggish.
- **Multiplayer fairness** — No client-authoritative exploits; host relay is acceptable for casual P2P but must not allow trivial cheating.

### Engine Philosophy (Concrete)

| Principle | Implementation |
|-----------|----------------|
| **Simulation is tick-based** | 60 ticks/sec; each tick advances economy, supply, unit progress, AI. Time is the single source of truth. |
| **Rendering is frame-based** | React + PixiJS render on state change; no fixed render loop. Simulation drives state; state drives visuals. |
| **Actions are discrete** | Click, bank, upgrade, deploy are atomic. No continuous input (e.g. hold-to-click) in core loop. |
| **State is centralised** | Zustand `gameStore` holds all match state. Domain logic (economy, combat) is pure; store applies results. |
| **Networking is action-based** | Clients broadcast actions; peers apply them. No full-state sync every tick. |

---

## 2. GAMEPLAY LOOP AND SESSION MODEL

### Core Gameplay Loop (Per Match)

1. **Earn** — Click for coins (loose), auto-income from upgrades.
2. **Protect** — Bank loose coins → secured wealth (immune to theft).
3. **Invest** — Buy upgrades (click power, auto miner, supply gen, bank shield).
4. **Attack** — Deploy units (runner, bruiser, saboteur) to steal coins or damage walls.
5. **Defend** — No active defence; banking is the defence. Wall absorbs damage but does not block steals.

**Win conditions:** First to `winThreshold` secured wealth, or highest at time expiry.

**Lose conditions:** Time expires without winning; opponent reaches threshold first.

### Short-Session Loop

- **Match duration:** 120–600s (default 300s).
- **Tick rate:** 60/sec.
- **Unit travel:** ~3s (runner faster, bruiser slower).
- **Player action frequency:** Clicks ~1–2/sec; deploys every few seconds; banks when loose > threshold.

### Session Lifecycle

| Phase | Trigger | State |
|-------|---------|-------|
| **Pre-match** | Lobby / Custom / Room | No `matchStartTime` |
| **Match start** | `startMatch` or `startMultiplayerMatch` | `matchStartTime = now`; players, economy, config initialised |
| **Running** | Tick loop | Economy, supply, units, AI update every tick |
| **End** | `elapsed >= durationSec` or `hasReachedWinThreshold` | `matchEndTime = now` |
| **Post-match** | Navigate to `/match-end` | `MatchEndScreen`; `reset()` on leave |

### Pacing Model

- **Economy:** Auto-income and supply regen at 1/60 of per-second rate each tick.
- **Units:** Progress += `(1000/60/3000) * speed` per tick; `progress >= 1` → resolve.
- **AI:** One action per tick per bot; `aiActed` prevents multiple bots acting same tick (simplification).
- **Cooldowns:** Per-unit-type `lastUnitDeployTime`; deploy blocked if `now - last < cooldownMs`.

---

## 3. HIGH-LEVEL ENGINE ARCHITECTURE

### Major Runtime Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION (React + PixiJS + Framer Motion)                   │
│  MatchScreen, BattleLayer, HUD, Overlays                         │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ subscribes to state
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STATE LAYER (Zustand)                                           │
│  gameStore, uiStore                                              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ applies actions, calls domain
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GAMEPLAY LOGIC (Domain)                                         │
│  economy.ts, combat.ts, ai.ts                                    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ pure functions, constants
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PLATFORM / SERVICES                                             │
│  matchService (PeerJS), audioService (Web Audio)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Responsibilities by Layer

| Layer | Responsibilities |
|-------|------------------|
| **Presentation** | Render state; handle user input; trigger store actions; no game logic |
| **State** | Hold match state; orchestrate tick loop; apply player/AI actions; broadcast to peers |
| **Domain** | Pure logic: economy formulas, combat resolution, AI decision; no side effects |
| **Platform** | P2P connections, audio playback, persistence (localStorage) |

### Data Flow

1. **Input** → User clicks/deploys/banks → `gameStore.clickForCoins` / `deployUnit` / `bankCoins`
2. **Store** → Validates, applies domain logic, updates state, optionally `broadcastAction`
3. **Peers** → Receive action → `applyRemoteAction` → same domain logic applied
4. **React** → `useGameStore(selector)` → re-render on state change
5. **BattleLayer** → `players`, `unitsInFlight`, `recentImpacts` → PixiJS redraw

### Architectural Model: Hybrid Composition

- **Not ECS** — Entity count is low (2–4 players, ~10–50 units in flight); ECS overhead not justified.
- **Not pure OOP** — No deep inheritance; composition via store + domain functions.
- **Recommended:** Keep current model: **centralised store + pure domain + React presentation**. Add clear module boundaries and avoid store logic creeping into components.

---

## 4. SYSTEM-BY-SYSTEM ENGINE BREAKDOWN

### 4.1 Input System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Translate user input into game actions |
| **Responsibilities** | Click handlers, deploy button, bank button, upgrade purchase, target selection |
| **Inputs** | DOM events (click, touch) |
| **Outputs** | Calls to `gameStore` actions |
| **Update cadence** | Event-driven |
| **Dependencies** | gameStore, uiStore |
| **Failure risks** | Double-submit if not debounced; touch vs click on mobile |
| **Implementation** | React `onClick` → `gameStore.clickForCoins(localPlayerId)`. No input abstraction layer; direct store calls. |

### 4.2 Core Game Loop Manager

| Aspect | Detail |
|--------|--------|
| **Purpose** | Advance simulation at fixed cadence |
| **Responsibilities** | Invoke `tick(now)` and `resolveArrivingUnits(now)` every 16.67ms |
| **Inputs** | `Date.now()` |
| **Outputs** | Updated game state via `set()` |
| **Update cadence** | 60 Hz (`setInterval`, `TICK_MS = 1000/60`) |
| **Dependencies** | gameStore.tick, gameStore.resolveArrivingUnits |
| **Failure risks** | Tab throttling (setInterval can slow); no catch-up for missed ticks |
| **Implementation** | `MatchScreen` useEffect with `setInterval`; cleanup on unmount. Consider `requestAnimationFrame` + delta for smoother timing if tab throttling becomes an issue. |

### 4.3 Entity / Component Model

| Aspect | Detail |
|--------|--------|
| **Purpose** | Represent players, units, upgrades |
| **Responsibilities** | Define state shape; no behaviour (behaviour in domain) |
| **Structure** | `PlayerState`, `UnitInFlight`, `UpgradeLevels`; no formal component system |
| **Implementation** | Types in `domain/types.ts`; state in `gameStore`. No ECS. |

### 4.4 Combat System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Resolve arriving units: steal coins, damage walls |
| **Responsibilities** | Calculate steal amount (leader bonus, repeat-attack penalty), wall damage, apply to players |
| **Inputs** | `unitsInFlight` (progress >= 1), `players`, `attackCountByTarget` |
| **Outputs** | Updated players (economy, wallHealth), updated matchStats, `recentImpacts`, `lastStealFeedback` |
| **Update cadence** | Every tick (after `tick`) |
| **Dependencies** | `UNIT_STATS`, `attackCountByTarget` |
| **Failure risks** | Order of resolution can affect multi-unit arrivals; currently sequential |
| **Implementation** | `resolveArrivingUnits` in gameStore; formulas inline. Leader target: steal × 1.1; repeat (>3): steal × max(0.5, 1 - (count-3)*0.1). |

### 4.5 Resource / Economy System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Manage loose coins, secured wealth, supply, income rates |
| **Responsibilities** | Banking, upgrade costs, upgrade effects, win threshold |
| **Inputs** | Player economy, upgrade levels, config |
| **Outputs** | New economy state |
| **Update cadence** | Per tick (auto-income, supply); on action (bank, upgrade) |
| **Dependencies** | `UPGRADE_DEFINITIONS`, `createInitialEconomy`, `applyUpgradeEffect`, `bankCoins` |
| **Implementation** | `domain/economy.ts` pure functions; `gameStore` applies. Diminishing returns: 5% per level (min 50%). |

### 4.6 Cooldown / Timer System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Throttle deploys per unit type; AI click/deploy timing |
| **Responsibilities** | Enforce `cooldownMs` between same-type deploys; AI cooldowns |
| **Inputs** | `lastUnitDeployTime`, `lastBotClickTime`, `lastBotDeployTime` |
| **Outputs** | Block or allow deploy/click |
| **Implementation** | `lastUnitDeployTime[type]`; deploy rejected if `now - last < stats.cooldownMs`. AI uses `AI_DIFFICULTY_PRESETS`. |

### 4.7 Targeting System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Select deploy target |
| **Responsibilities** | Store `selectedTargetId`; UI shows target selector |
| **Inputs** | User selection from TargetSelector |
| **Outputs** | `selectedTargetId` in store |
| **Implementation** | `setSelectedTarget(targetId)`; DeployBar uses it for deploy. No pathfinding; units travel owner→target in straight line. |

### 4.8 Collision / Resolution System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Resolve unit arrival (no spatial collision) |
| **Responsibilities** | Units with `progress >= 1` are "arrived"; apply steal + wall damage |
| **Implementation** | No collision detection. Progress-based: `progress >= 1` triggers resolution. |

### 4.9 State Machine / Behaviour Logic

| Aspect | Detail |
|--------|--------|
| **Purpose** | AI decision-making |
| **Responsibilities** | Return next action: bank, click, upgrade, deploy, or null |
| **Inputs** | Bot state, enemies, upgrade levels, timestamps, difficulty |
| **Outputs** | `'click' | 'bank' | { upgrade } | { deploy } | null` |
| **Implementation** | `getAIAction` in `domain/ai.ts`. Priority: bank > click > upgrade > deploy. One action per tick per bot (first bot to act blocks others this tick). |

### 4.10 Spawning / Despawning System

| Aspect | Detail |
|--------|--------|
| **Purpose** | Create and remove units |
| **Responsibilities** | `createUnitInFlight`; remove on `progress >= 1` after resolution |
| **Implementation** | `createUnitInFlight(type, ownerId, targetId, spawnTime)`; id = `${ownerId}-${type}-${spawnTime}`. Removed in `resolveArrivingUnits` via filter. |

### 4.11 Event Bus / Messaging Layer

| Aspect | Detail |
|--------|--------|
| **Purpose** | Multiplayer action relay |
| **Responsibilities** | Broadcast actions to peers; receive and apply |
| **Implementation** | `matchService.broadcastAction`; `onAction` → `applyRemoteAction`. No internal event bus; direct store updates. |

### 4.12 Scene / World Manager

| Aspect | Detail |
|--------|--------|
| **Purpose** | Organise renderable entities |
| **Responsibilities** | Radial layout; walls, units, impacts |
| **Implementation** | `BattleLayer` computes positions from `players`, `unitsInFlight`, `recentImpacts`. No formal scene graph; PixiJS stage rebuilt on state change. |

### 4.13 Save / Load / Persistence Layer

| Aspect | Detail |
|--------|--------|
| **Purpose** | Persist UI preferences |
| **Responsibilities** | `audioMuted` in localStorage (`clickwar-ui`) |
| **Implementation** | `uiStore` with `persist` middleware. No match save/load. |

### 4.14 UI Bridge Layer

| Aspect | Detail |
|--------|--------|
| **Purpose** | Connect game state to React UI |
| **Responsibilities** | Selectors, action dispatch |
| **Implementation** | `useGameStore(selector)`, `useUIStore(selector)`. Direct store access; no adapter. |

### 4.15 Audio Trigger Integration

| Aspect | Detail |
|--------|--------|
| **Purpose** | Play sounds on game events |
| **Responsibilities** | Click, bank, deploy, upgrade, impact, stolen, win, lose |
| **Implementation** | `audioService.play*` called from gameStore (e.g. `resolveArrivingUnits`, `clickForCoins`). Procedural Web Audio; no asset loading. |

### 4.16 Effects / VFX Trigger Integration

| Aspect | Detail |
|--------|--------|
| **Purpose** | Visual feedback for combat |
| **Responsibilities** | Impact bursts, screen shake, steal feedback |
| **Implementation** | `recentImpacts` drives PixiJS burst circles (500ms); `useScreenShake` on local impact; `StealFeedback` component. |

### 4.17 Multiplayer / Session State Layer

| Aspect | Detail |
|--------|--------|
| **Purpose** | Sync match state across peers |
| **Responsibilities** | Create/join room, broadcast actions, apply remote actions |
| **Implementation** | PeerJS; host relays; action-based sync. See §7. |

### 4.18 Analytics / Debug Instrumentation Layer

| Aspect | Detail |
|--------|--------|
| **Purpose** | None currently |
| **Implementation** | Add `matchStats` (attacksSent, coinsStolen, coinsLost) for potential analytics. No telemetry. |

---

## 5. ENTITY MODEL

### 5.1 PlayerState

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `player-0`, `player-1`, etc. |
| `name` | string | Display name |
| `teamId` | number? | 0 or 1 for 2v2 |
| `color` | string | Hex color |
| `economy` | PlayerEconomy | Loose, secured, supply, rates |
| `wallHealth` | number | Current wall HP |
| `maxWallHealth` | number | 100 |
| `isLeader` | boolean | Highest secured wealth |

**Ownership:** Match-scoped; created at match start.  
**Lifecycle:** Created in `startMatch`; immutable id; economy/wall updated each tick/action.  
**Networking:** Replicated via `start` action (full) and per-action updates.

### 5.2 PlayerEconomy

| Field | Type | Description |
|-------|------|-------------|
| `looseCoins` | number | Stealable |
| `securedWealth` | number | Win condition |
| `supply` | number | Unit deploy resource |
| `supplyRate` | number | Per-second regen |
| `coinPerClick` | number | Manual click gain |
| `autoIncomePerSec` | number | From upgrades |

### 5.3 UnitInFlight

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `${ownerId}-${type}-${spawnTime}` |
| `type` | UnitType | runner, bruiser, saboteur, defender |
| `ownerId` | string | Deploying player |
| `targetId` | string | Target player |
| `progress` | number | 0..1 along path |
| `spawnTime` | number | `Date.now()` at spawn |

**Ownership:** Match-scoped; created on deploy.  
**Lifecycle:** Created by `createUnitInFlight`; progress updated each tick; removed when `progress >= 1` after resolution.  
**Behaviour:** Linear interpolation owner→target; speed from `UNIT_STATS`.

### 5.4 Unit Types (Data)

| Type | Speed | Coin Steal | Wall Damage | Supply | Coin Cost | Cooldown |
|------|-------|------------|--------------|--------|-----------|----------|
| runner | 1.5 | 15 | 0 | 3 | 20 | 2000ms |
| bruiser | 0.6 | 5 | 25 | 5 | 50 | 4000ms |
| saboteur | 1 | 8 | 0 | 4 | 35 | 3500ms |
| defender | 0 | 0 | 0 | 3 | 40 | 6000ms |

*Defender and saboteur effects (durability, saboteurDuration) are defined but not implemented.*

### 5.5 Upgrades (Data)

| Id | Category | Effect | Base Cost | Mult | Max Level |
|----|----------|--------|-----------|------|-----------|
| click_power | manual | +coinPerClick | 25 | 1.4 | 10 |
| auto_miner | auto | +autoIncomePerSec | 50 | 1.5 | 8 |
| supply_gen | supply | +supplyRate | 40 | 1.45 | 6 |
| bank_shield | banking | (no effect) | 80 | 1.6 | 4 |

### 5.6 MatchConfig

| Field | Type | Description |
|-------|------|-------------|
| mode | MatchMode | 1v1, 2v2, ffa |
| durationSec | number | 120–600 |
| winThreshold | number | 500–3000 |
| baseClickValue | number | 5 |
| baseSupplyRate | number | 0.25 |
| supplyCap | number | 80 |
| initialSupply | number | 5 |
| aiDifficulty | AIDifficulty | easy, normal, hard, brutal |

### 5.7 Transient Entities

| Entity | Purpose | Lifecycle |
|--------|---------|-----------|
| `ImpactEvent` | VFX trigger | `{ targetId, timestamp }`; filtered by `now - timestamp < 500` |
| `StealFeedback` | UI feedback | `{ amount, timestamp }`; cleared on next steal or timeout |
| `MatchStats` | Per-player stats | `attacksSent`, `coinsStolen`, `coinsLost`, `biggestSingleSteal` |

---

## 6. SIMULATION, TIMING, AND STATE MANAGEMENT

### Tick Model

- **Rate:** 60 ticks/sec (`TICK_MS = 1000/60`).
- **Driver:** `setInterval` in `MatchScreen` useEffect.
- **Per tick:** `tick(now)` then `resolveArrivingUnits(now)`.

### Frame Model

- **No fixed render loop.** React re-renders on Zustand state change.
- **BattleLayer** redraws when `players`, `unitsInFlight`, or `recentImpacts` change.
- **Implication:** Visual updates are tied to store updates; no interpolation between ticks. Unit positions are computed from `progress` at last tick.

### Event Ordering (Per Tick)

1. Check match end (time or win threshold).
2. Economy: auto-income, supply regen, leader flag.
3. Unit progress: `progress += (1000/60/3000) * speed`.
4. AI: one action per bot (first wins).
5. Resolve arriving units (`progress >= 1`).

### Deterministic Requirements

- **Economy formulas:** Pure; same inputs → same outputs.
- **Unit progress:** `progress = min(1, (elapsed / TRAVEL_DURATION_MS) * speed)`; `elapsed = now - spawnTime`. Depends on `now`; if peers have different `now`, progress can diverge.
- **Combat resolution:** Steal/wall damage formulas are deterministic given same state.
- **AI:** `getAIAction` is deterministic given same inputs; but AI uses `now`, so tick timing affects decisions.

**Risk:** `Date.now()` differs across clients. For true determinism, use `matchStartTime + tickIndex * TICK_MS` as simulation time. Current implementation uses wall-clock; acceptable for casual P2P with low tick drift.

### Cooldown Resolution

- **Deploy:** `lastUnitDeployTime[type]`; reject if `now - last < cooldownMs`.
- **AI click:** `lastBotClickTime`; `clickCooldownMs` from difficulty preset.
- **AI deploy:** `lastBotDeployTime[botId]`; `deployThrottleMs` from preset.

### Resource Gain Cadence

- **Auto-income:** `looseCoins += autoIncomePerSec / 60` per tick.
- **Supply:** `supply = min(supplyCap, supply + supplyRate/60)` per tick.

### Unit Movement Timing

- **Progress:** `progress += (1000/60/3000) * speed` per tick.
- **Travel duration:** `TRAVEL_DURATION_MS / speed` (e.g. runner ~2s, bruiser ~5s).

### Server/Client Sync Timing

- **No dedicated server.** Host relays actions.
- **Action order:** Best-effort; no sequence numbers. Late actions applied when received.
- **Catch-up:** Remote click gets ×1.1 if behind (local player also gets ×1.1 if behind).

### Pause / Background Handling

- **Pause:** `MatchPauseOverlay` opens; tick loop continues. No pause flag in simulation.
- **Tab background:** `setInterval` may throttle; no explicit handling.
- **Recommendation:** Consider `document.visibilityState` to pause or slow tick when tab hidden.

### Reconnect Handling

- **None.** PeerJS disconnect → `onPeerLeft`; no reconnect flow.
- **Recommendation:** For production, add rejoin token and state sync on reconnect.

### Low-FPS Handling

- **None.** Tick is time-based, not frame-based. Low FPS does not slow simulation; only render can stutter.
- **Risk:** If React/PixiJS blocks main thread, `setInterval` can be delayed. Consider Web Worker for tick in future if needed.

### Authority

| System | Authority | Notes |
|--------|-----------|------|
| Economy | Each client | Action-based; peers apply same logic |
| Combat | Each client | Resolution in `resolveArrivingUnits`; deterministic |
| Deploy | Each client | Validation on apply; host does not re-validate |
| Match start | Host | Host sends `start`; others apply |
| Win/end | Each client | Each checks `elapsed >= durationSec` or `hasReachedWinThreshold` |

**Anti-cheat:** Client-authoritative; trivial to cheat (e.g. fake deploy, fake bank). Acceptable for casual P2P; not for competitive.

---

## 7. NETWORKING MODEL

### Multiplayer Architecture

- **Topology:** P2P via PeerJS (WebRTC); signaling via `0.peerjs.com`.
- **Room model:** Host creates room (6-char ID); joiner connects to host. Host relays all non-start actions to peers.

### Room / Match Topology

- **1v1:** Host + 1 peer.
- **2v2 / FFA:** Not fully implemented in RoomLobbyScreen (create/join is 1v1). QueueScreen supports 2v2/FFA for offline only.

### Authoritative Server Responsibilities

- **None.** No dedicated server. Host is relay only.

### Client Responsibilities

- **Host:** Create Peer with roomId; accept connections; relay received actions to all peers.
- **Joiner:** Connect to host; send actions to host; receive relayed actions.
- **All:** Apply `start` to initialise match; apply click, bank, upgrade, deploy.

### Sync Strategy

- **Action-based:** Only actions are sent. Full state only on `start`.
- **No delta compression:** Each action is JSON.
- **No rollback:** No prediction or reconciliation.

### Message / Event Categories

| Type | Payload | Sender | Recipients |
|------|---------|--------|------------|
| start | matchStartTime, players, localPlayerIndex, matchConfig | Host | All (on match start) |
| click | playerId | Any | All (via host relay) |
| bank | playerId, amount | Any | All |
| upgrade | playerId, upgradeId | Any | All |
| deploy | ownerId, targetId, unitType | Any | All |

All include `senderId`; receiver ignores if `senderId === localPlayerId`.

### State Replication Rules

- **Start:** Host calls `startMultiplayerMatch`; broadcasts `start`; joiner receives and applies.
- **Ongoing:** Each action broadcast after local apply; peers apply via `applyRemoteAction`.

### Anti-Cheat Assumptions

- **None.** Clients can send arbitrary actions. Validation in `applyRemoteAction` is minimal (e.g. cost check) but can be bypassed by modified client.
- **Recommendation:** For trusted play, document that game is for fun; for competitive, add server authority.

### Reconnect Flow

- **Not implemented.** Disconnect ends session.

### Late Join Flow

- **Not supported.** Match starts when host clicks Start and peer is connected.

### Drop Handling

- **PeerJS `close`:** `onPeerLeft` callback; connections filtered out. No in-match recovery.

### Rate Limiting and Abuse Controls

- **None.** No rate limit on actions.

### Bandwidth and Latency

- **Low bandwidth:** Actions are small (~50–100 bytes each). Few per second.
- **Latency:** WebRTC typically 50–200ms. No compensation; actions apply when received.

---

## 8. RENDERING AND PRESENTATION PIPELINE

### Scene Graph / Render Organisation

- **PixiJS Application** with single stage.
- **No layers:** Walls, units, impacts all on same stage.
- **Order:** Walls first, then units, then impacts (drawn in that order in forEach loops).

### Camera Rules

- **No camera.** Fixed view; `resizeTo: container` for responsiveness.
- **Coordinate system:** Center (0.5, 0.5) of container; radial layout from center.

### Visual Layer Ordering

1. Background (PixiJS `background: 0x0a0b0f`).
2. Walls (rectangles).
3. Units (circles).
4. Impact bursts (circles, alpha decay).

### Sprite / Mesh / UI Composition

- **PixiJS:** `Graphics` API only; no sprites or textures. Rectangles and circles.
- **React:** HUD is DOM (CSS); BattleLayer is canvas.

### Animation State Integration

- **Unit position:** Interpolated from `progress`; no animation state machine.
- **Impact:** Age-based alpha/radius; `(now - timestamp) / IMPACT_DISPLAY_MS`.
- **UI:** Framer Motion for enter/exit, hover, tap.

### VFX Trigger Flow

1. Unit resolves → `recentImpacts.push({ targetId, timestamp })`.
2. BattleLayer filters `recentImpacts` by `now - timestamp < 500`.
3. Draws burst circle per impact; alpha = 1 - age.

### Render Update Separation from Simulation

- **Decoupled.** Simulation runs in store; React subscribes; BattleLayer useEffect depends on `players`, `unitsInFlight`, `recentImpacts`.
- **Redraw:** Full stage clear + redraw each state change. No incremental updates.

### Batching and Asset Reuse

- **No batching.** New `Graphics` per wall, unit, impact each frame.
- **Recommendation:** For performance, reuse Graphics objects or use Sprite/Texture if assets added. Current entity count is low; acceptable for now.

### Visibility Management

- **WorldViewOverlay:** Toggle shows overlay; BattleLayer remains. WorldView has its own radial map (DOM/CSS).

### Mobile / Web / Platform Constraints

- **Touch:** Click handlers work; no separate touch layer.
- **Resize:** `resizeTo: container` handles resize.
- **WebGL:** PixiJS uses WebGL or WebGPU; fallback to canvas2d if needed.

---

## 9. DATA, CONTENT, AND BALANCING PIPELINE

### How Gameplay Data Is Stored

- **Units:** `UNIT_STATS` in `constants.ts` (hardcoded).
- **Upgrades:** `UPGRADE_DEFINITIONS` array in `constants.ts`.
- **Match config:** `MatchConfig` type; defaults in `DEFAULT_MATCH_CONFIG`; overrides from CustomGameSetup.
- **AI:** `AI_DIFFICULTY_PRESETS`, `SUPPLY_SCARCITY_PRESETS` in constants.

### Balance Values

- **Centralised** in `domain/constants.ts`.
- **No external files.** No JSON/YAML loaders.

### Content Authoring

- **Code changes.** Edit constants to add units, upgrades, or adjust balance.
- **No editor.** No visual authoring.

### Data-Driven vs Hardcoded

| Content | Current | Recommendation |
|---------|---------|----------------|
| Unit stats | Hardcoded | Move to JSON; validate on load |
| Upgrades | Hardcoded | Move to JSON |
| Match config | Partial (CustomGameSetup) | Keep; extend with presets |
| AI presets | Hardcoded | Keep; tune in constants |
| Colors | `TEAM_COLORS` | Keep |

### Schema Recommendations

- **UnitStats:** type, name, speed, durability, coinSteal, wallDamage, saboteurDuration, supplyCost, coinCost, cooldownMs.
- **UpgradeDefinition:** id, name, category, baseCost, costMultiplier, maxLevel, effectPerLevel.
- **Validation:** Zod or similar for runtime validation if loading from JSON.

### Versioning

- **None.** No content versioning or migration.

### Live-Tuning

- **None.** Changes require deploy.

---

## 10. TOOLING AND INTERNAL DEVELOPMENT SUPPORT

### Minimum Internal Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Gameplay debug HUD** | Show tick count, match time, unit count | Dev-only component; `import.meta.env.DEV` |
| **Spawn/entity inspector** | Log players, units on state change | `useEffect` with `console.log` or React DevTools |
| **Combat event viewer** | Log steal/wall damage on resolve | Add to `resolveArrivingUnits` |
| **Economy simulator** | Test upgrade costs, bank logic | Unit tests in `economy.test.ts` |
| **Config validator** | Validate MatchConfig, unit stats | Zod schema + test |
| **Match state inspector** | Snapshot state for debugging | Zustand devtools or custom panel |
| **Performance overlay** | FPS, tick latency | `stats.js` or similar |
| **Network event logger** | Log sent/received actions | Wrap `broadcastAction`, `onAction` |

### Replay / Test Harness

- **Replay:** Not implemented. Could record actions and replay for debugging.
- **Deterministic harness:** Run `tick` N times with fixed `now`; assert state. Useful for regression.

### Balancing Tools

- **Spreadsheet or script** to compute upgrade costs, supply curves. No in-engine tool.

---

## 11. CODEBASE STRUCTURE

### Recommended Structure

```
src/
├── main.tsx
├── App.tsx
├── App.css
├── index.html
├── domain/                    # Pure gameplay logic
│   ├── types.ts
│   ├── constants.ts
│   ├── combat.ts
│   ├── economy.ts
│   └── ai.ts
├── store/                     # State management
│   ├── gameStore.ts
│   └── uiStore.ts
├── shared/                    # Cross-cutting services
│   ├── network/
│   │   └── matchService.ts
│   ├── audio/
│   │   └── audioService.ts
│   └── theme/
│       └── theme.css
└── features/                  # UI by screen/feature
    ├── landing/
    ├── lobby/
    ├── matchmaking/
    └── game/
        ├── MatchScreen.tsx
        ├── MatchEndScreen.tsx
        └── components/
            ├── hud/
            ├── deploy/
            ├── upgrades/
            ├── battle/
            └── overlays/
```

### Naming Conventions

- **Files:** PascalCase for components (`MatchScreen.tsx`); camelCase for utilities (`matchService.ts`).
- **Types:** PascalCase (`PlayerState`, `UnitInFlight`).
- **Stores:** `useXStore` for hooks.
- **Domain:** Pure functions; no `use` prefix.

### Module Boundaries

- **domain:** No imports from store, features, or shared (except types).
- **store:** Imports domain, shared; no features.
- **features:** Imports store, shared; no cross-feature imports for screens.
- **shared:** No imports from domain or features.

### Ownership of Shared Types

- **domain/types.ts:** Canonical types for PlayerState, UnitInFlight, MatchConfig, etc.
- **matchService:** Defines `GameAction`; gameStore uses it.

### Avoiding Circular Dependencies

- Domain has no dependencies on store/features.
- Store depends on domain and matchService.
- Features depend on store. No feature → feature.

### Isolating Pure Simulation

- **domain/** is pure: no `Date.now()`, no I/O. Pass `now` as argument.
- **gameStore** is the only place that calls `Date.now()` and passes it to domain.
- **Recommendation:** Move tick logic (economy, unit progress) into a pure `simulateTick(state, now)` in domain; store calls it and applies result. Improves testability.

---

## 12. TESTING AND VALIDATION STRATEGY

### Unit Test Priorities

1. **economy.ts:** `getUpgradeCost`, `applyUpgradeEffect`, `bankCoins`, `hasReachedWinThreshold`.
2. **combat.ts:** `createUnitInFlight`, `updateUnitProgress`, `calculateStealAmount`, `calculateWallDamage`.
3. **ai.ts:** `getAIAction` with fixed inputs; assert action type.

### Integration Test Priorities

1. **gameStore.tick:** Given initial state, run N ticks; assert economy, supply, unit progress.
2. **gameStore.resolveArrivingUnits:** Given units with progress 1; assert steal, wall damage, stats.
3. **applyRemoteAction:** Given action, assert state change matches local action.

### Simulation Correctness Tests

- Run same initial state + same action sequence on two "clients"; assert identical final state. (Determinism test.)

### Deterministic Tests

- Use fixed `now = matchStartTime + tickIndex * TICK_MS`; run 100 ticks; checksum state.

### Multiplayer Sync Tests

- Mock matchService; host sends actions; joiner applies; assert both have same state after N actions.

### Soak Tests

- Run match for full duration (300s) at 60 tick/sec; assert no crash, no memory leak.

### Stress Tests

- 4 players, max units in flight; assert performance acceptable.

### Balance Regression Checks

- Snapshot upgrade costs, unit stats; assert no unintended changes.

### Save/Load Integrity

- N/A (no save/load).

### Exploit Tests

- Send invalid deploy (negative cost, wrong target); assert rejection or safe handling.

---

## 13. PERFORMANCE STRATEGY

### Likely Bottlenecks

1. **BattleLayer redraw:** Full stage clear + redraw every state change. With many units, could be costly.
2. **React re-renders:** Many components subscribe to gameStore; fine-grained selectors help.
3. **Zustand set():** Large state updates; immutable copies can allocate.

### Required Profiling Areas

- Tick duration (time from `tick` start to `set` complete).
- BattleLayer render time.
- Memory over 5-minute match.

### Update Budgeting

- **Target:** Tick < 2ms. At 60 Hz, 16.67ms per frame; 2ms leaves 14ms for render.
- **Current:** No budgeting; assume sufficient.

### Render Budgeting

- **Target:** < 16ms per frame for 60 FPS.
- **PixiJS:** Monitor draw calls; consider batching if needed.

### Network Budgeting

- **Low.** Actions are small; few per second.

### Memory Budgeting

- **Units in flight:** Bounded by deploy rate × travel time. ~10–30 typical.
- **Impact events:** Filtered by age; bounded.
- **No unbounded growth expected.**

### Battery / Mobile Constraints

- **Tick loop runs always.** Consider reducing tick rate when tab backgrounded.
- **PixiJS:** WebGL can be power-hungry; acceptable for short sessions.

### Optimisation Priorities

1. **Profile first.** Establish baseline.
2. **BattleLayer:** Reuse Graphics; avoid per-frame allocation if possible.
3. **Store selectors:** Ensure components only subscribe to needed slices.
4. **AI:** If multiple bots, consider spreading actions across ticks.

### Build In From Day One

- **Structured logging** for actions (dev mode).
- **Error boundaries** around MatchScreen.
- **Cleanup** on unmount (interval, PixiJS destroy).

---

## 14. IMPLEMENTATION STRATEGY

### Phase 1: Foundation (Current State)

- Domain logic (economy, combat, AI) is in place.
- Store + React + PixiJS rendering works.
- PeerJS multiplayer works for 1v1.

### Phase 2: Robustness

1. **Determinism:** Switch to `simulationTime = matchStartTime + tickIndex * TICK_MS` for tick and resolution.
2. **Tab handling:** Pause or slow tick when `document.hidden`.
3. **Error handling:** Graceful disconnect; show "Opponent left" instead of silent fail.
4. **Unit tests:** Cover domain and store.

### Phase 3: Content and Balance

1. **Data-driven units/upgrades:** Move to JSON; add validation.
2. **Implement defender/saboteur effects** if desired.
3. **Implement bank_shield** or remove.
4. **Balance pass:** Tune based on playtesting.

### Phase 4: Polish and Scale

1. **2v2/FFA online:** Extend RoomLobbyScreen for 4 players.
2. **Reconnect flow:** If PeerJS supports reconnection.
3. **Performance:** Profile and optimise BattleLayer if needed.
4. **Tooling:** Debug HUD, network logger.

### What to Prototype First

- **Deterministic tick:** Validate sync with two clients using fixed time.
- **Reconnect:** If required for product.

### What Requires Sequential Implementation

- **Server authority:** Would require backend; cannot be retrofitted incrementally without major refactor.
- **Replay:** Depends on action logging; can be added after.

### What to Mock Initially

- **Matchmaking:** QueueScreen already mocks (2s delay). Real matchmaking needs backend.
- **Analytics:** Mock or no-op until product needs it.

### Most Fragile Areas

1. **Multiplayer action ordering:** No sequence numbers; out-of-order or duplicate actions can cause desync.
2. **AI acting same tick:** `aiActed` limits to one bot per tick; can cause AI to underperform.
3. **Combat formula mismatch:** `combat.ts` has `calculateStealAmount` (leader 0.9x) but gameStore uses 1.1x for leader target. Consolidate.

### Quality Gates

- All domain functions have unit tests.
- Determinism test passes before multiplayer polish.
- No memory leak over 5-minute match.

---

## 15. ENGINE QA CHECKLIST

| Category | Check |
|----------|-------|
| **Runtime correctness** | Match ends at correct time; win condition correct |
| **Stable update ordering** | Tick → resolve order consistent; no race |
| **Entity lifecycle** | Units removed after resolve; no orphan references |
| **Desync prevention** | Same actions → same state (when using fixed time) |
| **Authority correctness** | All clients apply same logic; no client-only shortcuts |
| **Render/simulation separation** | No game logic in BattleLayer; state drives render |
| **Timer/cooldown correctness** | Deploy cooldown enforced; AI cooldowns respected |
| **Resource integrity** | No negative coins/supply; bank caps at loose |
| **Exploit resistance** | Invalid actions rejected (best effort without server) |
| **Content validation** | Unit/upgrade data within bounds |
| **Performance stability** | No frame drops over match; no memory growth |
| **Debugging coverage** | Key state inspectable; actions loggable |
| **Regression risk** | Domain tests prevent accidental formula changes |

---

## 16. FINAL RECOMMENDATION

### Best-Fit Engine Approach

**Keep the current architecture:** Centralised Zustand store + pure domain + React/PixiJS presentation. It matches the game's scope and avoids over-engineering.

### Key Architecture Decisions

1. **Tick-based simulation at 60 Hz** — Simple, predictable, sufficient for this game.
2. **Action-based multiplayer** — Fits P2P; no server. Accept client authority for casual play.
3. **Pure domain layer** — Enables testing and keeps simulation logic out of React.
4. **No ECS** — Entity count is low; composition via store is enough.

### Biggest Implementation Risks

1. **Desync in multiplayer** — Different `Date.now()` across clients. Fix: use `matchStartTime + tickIndex * TICK_MS`.
2. **Combat formula inconsistency** — `combat.ts` vs gameStore. Fix: single source of truth in one place.
3. **Tab throttling** — `setInterval` can slow. Fix: visibility API to pause or use `requestAnimationFrame` with delta.

### Biggest Scalability Risks

1. **4-player FFA** — More units, more AI; profile before assuming performance is fine.
2. **Content expansion** — Hardcoded constants will become unwieldy. Move to data early.

### Highest-Value Next Steps

1. **Deterministic simulation time** — Use `matchStartTime + tickIndex * TICK_MS` instead of `Date.now()` in tick and resolution.
2. **Consolidate combat logic** — Remove or align `combat.ts` with gameStore resolution.
3. **Unit tests for domain** — economy, combat, AI. Prevents regressions.
4. **Data-driven units/upgrades** — JSON + validation. Enables design iteration without code changes.

---

*Document version: 1.0 — Based on codebase analysis as of March 2025.*
