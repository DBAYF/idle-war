# Click War — Full Game Setup Layer Planning and Implementation Document

A production-ready design for the game setup layer: configuration, validation, orchestration, and UX. This document serves as the design reference, implementation plan, and build sequencing guide for immediate execution.

---

## 1. SETUP LAYER INTENT

### What the Setup Layer Is For

The setup layer is the **product surface between player entry and match runtime** that:

- Lets players choose and configure the match they want to play
- Validates configuration before match start
- Produces a single, clean `MatchConfig` object that drives match creation
- Orchestrates offline, bot, and multiplayer match-start flows
- Communicates match implications (duration, difficulty, mode) so players understand what they are entering

### User and System Problems It Solves

| Problem | Solution |
|---------|----------|
| Players don't understand what mode/options mean | Clear labels, summaries, and helper text; mode implications explicit |
| Config can be invalid or inconsistent | Central validation layer; unsupported combinations blocked |
| Setup state scattered across screens | Single setup flow with clear draft vs committed state |
| Match start fails or produces wrong config | Validated config object; explicit mapping into `startMatch` / `startMultiplayerMatch` |
| Online vs offline setup feels disjointed | Shared setup concepts; path-specific orchestration |
| Future modes (2v2 online, FFA) would require rework | Extensible structure; mode-based constraints; hidden vs disabled options |

### How It Improves the Current Flow

- **Current:** Lobby → Quick match (QueueScreen, hardcoded defaults) or Custom (separate screen, local state) or Room (create/join, host config in room). No shared validation, no summary, config duplicated.
- **After:** Single setup layer with mode picker, rules section, validation, summary, and explicit start paths. One config model, one validation layer, clear orchestration.

### Success Criteria

1. Every supported match path produces a valid `MatchConfig` that correctly initialises the match.
2. Unsupported combinations cannot reach match start.
3. Players understand mode, duration, difficulty, and win goal before starting.
4. Setup state is clearly separated from runtime state; no config drift.
5. Offline and multiplayer flows share components and validation; path-specific logic is minimal.
6. Adding 2v2 online or FFA later requires config/validation changes, not a rewrite of the setup layer.

---

## 2. CURRENT STATE REVIEW

### What Exists

| Component | Location | Purpose |
|-----------|----------|---------|
| **LandingScreen** | `/` | Entry; "Play Now" / "Guest Play" → `/lobby` |
| **LobbyScreen** | `/lobby` | Mode cards: Online, 1v1, 2v2, FFA, Custom |
| **QueueScreen** | Inline in LobbyScreen | "Match found" for 1v1/2v2/FFA; 2s delay → `startMatch(playerCount)` → `/match` |
| **CustomGameSetup** | `/custom` | Mode picker (1v1/2v2/FFA), GameRulesForm, Start Match |
| **RoomLobbyScreen** | `/room`, `/room/:roomId` | Create/Join room; host config via GameRulesForm; Start Match |
| **GameRulesForm** | Shared | Win goal, supply scarcity, duration, AI difficulty (optional) |
| **MatchConfig** | `domain/types.ts` | `mode`, `durationSec`, `winThreshold`, `baseClickValue`, `baseSupplyRate`, `supplyCap`, `initialSupply`, `aiDifficulty` |
| **DEFAULT_MATCH_CONFIG** | `domain/constants.ts` | Default values for all config fields |
| **startMatch** | gameStore | `(playerCount, config?)` → creates players, sets matchStartTime, matchConfig |
| **startMultiplayerMatch** | gameStore | `(players, matchStartTime, localPlayerIndex, matchConfig?)` → same for P2P |

### Weak Points

1. **QueueScreen ignores config:** `startMatch(playerCount)` passes no config; match uses `DEFAULT_MATCH_CONFIG` only. Duration, win threshold, AI difficulty are all hardcoded for quick play.
2. **Config duplication:** CustomGameSetup and RoomLobbyScreen each hold their own `config` / `hostConfig` state. No shared validation or schema.
3. **No validation:** Nothing prevents invalid combinations (e.g. duration 0, winThreshold negative). GameRulesForm clamps numbers but there is no central validation.
4. **Mode implications unclear:** 1v1 vs 2v2 vs FFA change player count and team structure, but the UI does not explain this. Online is always 1v1; 2v2/FFA are offline-only.
5. **Room flow mixes setup and connection:** RoomLobbyScreen combines "create/join room" with "configure match". Host config is editable only after room is created; joiner has no visibility into rules until match starts.
6. **No summary:** Users do not see a consolidated "You are about to play: 1v1, 5 min, 1000 to win, Normal AI" before starting.
7. **Back/cancel behaviour:** Navigating back from Custom or Room does not clear or persist setup state predictably.
8. **Unsupported modes not explicit:** 2v2 and FFA online are not supported; the UI does not state this. Lobby shows 2v2/FFA as quick-play options (offline only).

### Technical and UX Gaps

- **No setup store:** Setup draft lives in component `useState`; no single source of truth for "current setup being edited".
- **No validation module:** Validation rules are implicit in GameRulesForm (min/max on inputs). No `validateSetup(config, mode, isMultiplayer)` function.
- **No config serialisation layer:** Direct object spread into `startMatch`; no explicit "draft → validated config" step.
- **Room joiner blind:** Joiner cannot see host's rules before match starts. Host's `matchConfig` is sent only in the `start` action payload.
- **createPlayer config usage:** `createPlayer(id, index, config)` uses `config` for `createInitialEconomy` (baseClickValue, supplyRate, initialSupply). MatchConfig flows correctly into economy init.

### Why Current Approach Is Insufficient

- Quick play uses defaults with no way to adjust; Custom is separate and feels like a different product.
- Room setup is embedded in connection flow; rules feel secondary.
- No single "setup layer" concept; setup is scattered across Lobby, Custom, Room, Queue.
- Adding presets, saved setups, or 2v2 online would require touching multiple screens and duplicating logic.
- Validation is ad hoc; invalid config could theoretically reach `startMatch` if UI is bypassed or extended.

---

## 3. RECOMMENDED SETUP FLOW

### Player Journey: Entry to Match Start

```
Landing (/) 
    → Lobby (/lobby)
        → [Quick 1v1]     → QueueScreen (inline) → startMatch(2, defaults) → /match
        → [Quick 2v2]     → QueueScreen (inline) → startMatch(4, defaults) → /match  
        → [Quick FFA]     → QueueScreen (inline) → startMatch(4, defaults) → /match
        → [Custom]        → Setup (/setup?source=custom) → validate → startMatch → /match
        → [Online]        → Room (/room) → create or join
                              → [Create] → Room waiting → Setup (inline) → validate → broadcast start → /match
                              → [Join]   → Room waiting → (no config) → receive start → /match
```

### Path-by-Path Behaviour

#### Solo Quick Play (1v1, 2v2, FFA)

- **Entry:** Lobby → click 1v1 / 2v2 / FFA
- **Flow:** QueueScreen shows for ~2s (match found), then `startMatch(playerCount, quickPlayDefaults)` → `/match`
- **Config:** Uses `DEFAULT_MATCH_CONFIG` with `mode` set from selection. No user editing.
- **When config is editable:** Never; quick play is intentionally zero-friction.
- **Cancellation:** User can navigate away during QueueScreen (clearTimeout on unmount); no match started.

#### Solo Custom (Offline, Configured)

- **Entry:** Lobby → Custom → `/setup?source=custom` (or `/custom` kept for backward compat)
- **Flow:** Setup screen with mode picker, rules, summary, Start Match. On Start: validate → `startMatch(playerCount, config)` → `/match`
- **Config:** User edits all rules. Validation before start.
- **When config is editable:** Until Start Match is clicked.
- **Back:** Navigate to `/lobby`; draft is discarded (or optionally persisted in sessionStorage for "resume" — see Future Expansion).

#### Host Multiplayer Room

- **Entry:** Lobby → Online → `/room` → Create Room
- **Flow:** createRoom() → waiting state → host sees rules form + Start Match. On Start: validate → create players → `startMultiplayerMatch` + `broadcastAction({ type: 'start', ... })` → `/match`
- **Config:** Host edits rules in waiting room. Joiner cannot edit.
- **When config is editable:** Until Start Match. After start, config is locked in `matchConfig` in gameStore.
- **Back:** Leave Room → disconnect → `/lobby`

#### Join Multiplayer Room

- **Entry:** Lobby → Online → Join → enter code → joinRoom()
- **Flow:** joinRoom() → waiting state → "Waiting for host to start". On host start: receive `start` action → `startMultiplayerMatch` with host's config → `/match`
- **Config:** Joiner does not edit; receives config from host in `start` payload.
- **When config is editable:** Never for joiner.
- **Back:** Leave Room → disconnect → `/lobby`

#### Future: 2v2 / FFA Online (Not Yet)

- When supported: Room would need mode selection (1v1 vs 2v2), and host would configure for 4 players. Joiner would see "2v2" in room status. Deferred; structure should allow adding without rewrite.

### Cancellation and Back Behaviour

| Screen | Back Action | Effect |
|--------|-------------|--------|
| Setup (custom) | Back to Lobby | Discard draft; navigate `/lobby` |
| Room (create/join) | Leave Room | disconnect(); navigate `/lobby` |
| QueueScreen | (none; auto-advances) | If user navigates away, clearTimeout prevents startMatch |

---

## 4. SETUP SCREEN / SURFACE BREAKDOWN

### 4.1 Setup Home / Mode Picker (Custom Path)

**Purpose:** Let user choose match mode (1v1, 2v2, FFA) for custom offline play.

**User actions:** Click mode card; optionally "Back to Lobby".

**Layout:** Same shell as current Custom: H1 "CUSTOM GAME", subtitle, mode cards (1v1, 2v2, FFA), then rules section.

**Key components:** `ModePicker`, `mode-card` (reusable).

**State variants:** `mode: '1v1' | '2v2' | 'ffa'`.

**Validation:** Mode selection alone is always valid. Player count derived: 1v1→2, 2v2→4, ffa→4.

**Implementation notes:** Can remain as top section of CustomGameSetup or become a dedicated SetupScreen that includes mode + rules + summary.

---

### 4.2 Match Rules / Config Section

**Purpose:** Edit duration, win threshold, supply scarcity, AI difficulty (when applicable).

**User actions:** Adjust sliders, select presets, select AI difficulty.

**Layout:** Grouped sections: Win Goal, Supply Scarcity, Duration, AI Difficulty (conditional).

**Key components:** `GameRulesForm` (existing, enhanced).

**State variants:** `config: MatchConfig` (draft).

**Validation:** Per-field ranges (see §6). Supply presets override baseSupplyRate, supplyCap, initialSupply.

**Implementation notes:** GameRulesForm already exists. Add explicit validation call; ensure `onChange` receives full config.

---

### 4.3 Player / Mode Section (Context)

**Purpose:** Show what mode implies (player count, team structure).

**User actions:** None (informational).

**Layout:** Small summary line: "1v1: You vs 1 CPU" or "2v2: You + CPU vs 2 CPU" or "FFA: You vs 3 CPU".

**Key components:** `ModeSummary` (new).

**State variants:** Depends on `mode`.

**Implementation notes:** Simple text component; can be part of ModePicker or Summary panel.

---

### 4.4 AI Difficulty Section

**Purpose:** Select AI difficulty when playing vs CPU.

**User actions:** Click difficulty preset (easy, normal, hard, brutal).

**Layout:** Preset buttons, same as current GameRulesForm.

**Key components:** `AIDifficultyPicker` (extracted from GameRulesForm or kept inline).

**State variants:** `config.aiDifficulty`.

**Validation:** Must be one of `AIDifficulty`. No cross-field rules.

**Implementation notes:** Already in GameRulesForm. Shown only when `showAiDifficulty === true` (custom and quick play summary; not in room for host, since room is 1v1 human vs human — but host form currently has `showAiDifficulty={false}`; correct).

---

### 4.5 Multiplayer Room Config Section (Host Only)

**Purpose:** Host configures match rules while waiting for opponent.

**User actions:** Same as Match Rules; edits apply to `hostConfig`.

**Layout:** Embedded in Room waiting view; GameRulesForm when `isHostUser && roomState === 'waiting'`.

**Key components:** `GameRulesForm`, `RoomRulesPanel` (wrapper).

**State variants:** `hostConfig: MatchConfig`; `roomState`, `isHostUser`.

**Validation:** Same as custom path; validate before Start Match.

**Implementation notes:** Already exists in RoomLobbyScreen. Ensure validation runs on Start.

---

### 4.6 Summary Panel

**Purpose:** Show consolidated "You are about to play: X" before Start.

**User actions:** None (read-only).

**Layout:** Card or compact block: "1v1 · 5 min · 1000 to win · Normal AI" (or equivalent).

**Key components:** `SetupSummary` (new).

**State variants:** Renders from `mode` + `config`.

**Implementation notes:** Must be implementation-ready. Example: "1v1 vs CPU · 5 min · First to 1000 wins · Normal AI · Normal supply".

---

### 4.7 Validation / Warning Banner

**Purpose:** Surface validation errors or warnings before Start.

**User actions:** Read; fix invalid fields.

**Layout:** Banner above Start button; red for errors, amber for warnings.

**Key components:** `ValidationBanner` (new).

**State variants:** `validation: { valid: boolean; errors: string[]; warnings?: string[] }`.

**Validation behaviour:** See §6. Display when `!valid` or `warnings.length > 0`.

**Implementation notes:** Only show when user has attempted Start or when invalid (e.g. duration 0). Optionally show warnings on blur.

---

### 4.8 Primary CTA (Start Match / Continue)

**Purpose:** Commit config and start match.

**User actions:** Click Start Match (custom) or Start Match (room host).

**Layout:** Prominent button at bottom of setup content.

**Key components:** `StartMatchButton` (new) or styled `mode-card`.

**State variants:** Enabled when validation passes; disabled when invalid or (room) peerCount < 1.

**Implementation notes:** On click: validate → if valid, call `startMatch` or room start flow; if invalid, set validation state and show banner.

---

### 4.9 Loading / Waiting / Room-Ready State

**Purpose:** Room: show "Waiting for opponent" or "Opponent connected! Set rules and start." Queue: show "Match found".

**User actions:** Wait; or Leave (room).

**Layout:** Status text; spinner for Queue; room code + copy for host.

**Key components:** `RoomStatus`, `QueueScreen` (existing).

**Implementation notes:** Already exist. Ensure room status clearly distinguishes "configuring" vs "waiting for host".

---

### 4.10 Unsupported Mode Notice (Future)

**Purpose:** When 2v2/FFA online is not yet supported, show notice instead of allowing selection.

**User actions:** None (option disabled or badge "Offline only").

**Layout:** Badge on mode card or tooltip.

**Key components:** `UnsupportedBadge` (new, optional for now).

**Implementation notes:** For next iteration. Current Online is 1v1 only; no need to show "2v2 online coming soon" unless we add 2v2 card to Online path.

---

## 5. MATCH CONFIG SPECIFICATION

### Full Structure

```ts
interface MatchConfig {
  mode: MatchMode;           // '1v1' | '2v2' | 'ffa'
  durationSec: number;       // 120–600
  winThreshold: number;      // 500–3000
  baseClickValue: number;    // from supply preset or explicit
  baseSupplyRate: number;    // from supply preset
  supplyCap: number;         // from supply preset
  initialSupply: number;     // from supply preset
  aiDifficulty: AIDifficulty; // 'easy' | 'normal' | 'hard' | 'brutal'
}
```

### Field-by-Field Definition

| Field | Type | Allowed Values | Default | UI Control | Validation | Dependencies |
|-------|------|----------------|---------|------------|------------|--------------|
| mode | MatchMode | '1v1', '2v2', 'ffa' | '1v1' | Mode cards | Enum | Determines playerCount |
| durationSec | number | 120–600 | 300 | Slider + display | Range | None |
| winThreshold | number | 500–3000 | 1000 | Slider + number input | Range | None |
| baseClickValue | number | 1–20 | 5 | (from preset) | Range | Supply preset sets economy params |
| baseSupplyRate | number | 0.1–0.5 | 0.25 | Preset | From preset | Supply preset |
| supplyCap | number | 40–120 | 80 | Preset | From preset | Supply preset |
| initialSupply | number | 1–15 | 5 | Preset | From preset | Supply preset |
| aiDifficulty | AIDifficulty | easy, normal, hard, brutal | normal | Preset buttons | Enum | Only for offline vs CPU |

### UI Control Mapping

- **mode:** Segmented cards (1v1, 2v2, FFA).
- **durationSec:** Range input 120–600, step 60; display as "X min".
- **winThreshold:** Range input 500–3000, step 100; sync with number input.
- **Supply:** Preset buttons (easy, normal, hard) that set baseSupplyRate, supplyCap, initialSupply.
- **aiDifficulty:** Preset buttons (easy, normal, hard, brutal).

### User-Editable Now vs Later

| Field | Now | Later |
|-------|-----|-------|
| mode | Yes (custom, room host) | Yes |
| durationSec | Yes | Yes |
| winThreshold | Yes | Yes |
| supply (preset) | Yes | Yes; optional explicit overrides |
| aiDifficulty | Yes (offline) | Yes |
| baseClickValue | No (from constants) | Optional advanced |
| baseSupplyRate, supplyCap, initialSupply | Via preset only | Optional explicit |

### Multiplayer Constraints

- **Room (1v1):** mode forced to '1v1'. aiDifficulty irrelevant (human vs human). Host edits duration, win threshold, supply. Joiner receives config from host.
- **Future 2v2 online:** mode '2v2'; playerCount 4; team structure TBD.

---

## 6. VALIDATION AND GUARDRAILS

### Required Fields

All fields in MatchConfig are required. Defaults ensure no field is missing.

### Legal Ranges

| Field | Min | Max | Step | Invalid Example |
|-------|-----|-----|------|-----------------|
| durationSec | 120 | 600 | 60 | 0, 10000 |
| winThreshold | 500 | 3000 | 100 | -1, 5000 |
| baseSupplyRate | 0.1 | 0.5 | — | (from preset) |
| supplyCap | 40 | 120 | — | (from preset) |
| initialSupply | 1 | 15 | — | (from preset) |

### Unsupported Combinations

| Combination | Handling |
|-------------|----------|
| mode '2v2' or 'ffa' in Online path | Not offered; Online is 1v1 only. If user somehow reaches (e.g. future), block start with "2v2 online coming soon". |
| aiDifficulty in multiplayer | Ignored; not sent. Host form hides AI section. |
| durationSec < 120 | Clamp to 120 or show error "Minimum 2 minutes". |
| winThreshold < 500 | Clamp to 500 or show error "Minimum 500". |

### Fallback / Default Behaviour

- If validation fails, do not call `startMatch`. Show errors in ValidationBanner.
- If a field is out of range, clamp to range before validation (or reject and show error). Recommendation: clamp on blur/change to avoid blocking.
- If config is partial (e.g. from stale storage), merge with `DEFAULT_MATCH_CONFIG`.

### Mode-Specific Restrictions

- **1v1:** playerCount = 2. No team structure.
- **2v2:** playerCount = 4. teamId: 0,1 vs 2,3. Offline only for now.
- **ffa:** playerCount = 4. No teams. Offline only for now.
- **Online:** mode = '1v1' always. playerCount = 2.

### Multiplayer Restrictions

- Host must have peerCount >= 1 before Start.
- Joiner cannot edit config.
- Host config must validate before Start; invalid config blocks Start.

### Hidden vs Disabled Option Logic

- **Hidden:** 2v2/FFA in Online path (not in UI).
- **Disabled:** Start Match when validation fails; Start Match when peerCount < 1 (room host).
- **Shown but inactive:** AI difficulty in room (host) — currently hidden via `showAiDifficulty={false}`. Correct.

### Copy / Messaging for Invalid States

| State | Message |
|-------|---------|
| durationSec out of range | "Duration must be between 2 and 10 minutes." |
| winThreshold out of range | "Win goal must be between 500 and 3000." |
| Start clicked, invalid | "Please fix the issues above before starting." |
| Room host, peerCount < 1 | "Waiting for opponent to connect." (button disabled) |
| Room joiner | "Waiting for host to start..." |

---

## 7. UX / UI DESIGN SPEC

### Page Structure

**Setup Screen (Custom):**

```
┌─────────────────────────────────────────┐
│  CUSTOM GAME                             │
│  Configure your match                    │
├─────────────────────────────────────────┤
│  Mode                                    │
│  [1v1] [2v2] [FFA]                       │
├─────────────────────────────────────────┤
│  Win Goal          [====●====] 1000      │
│  Supply Scarcity    [Easy][Normal][Hard] │
│  Duration           [====●====] 5 min    │
│  AI Difficulty      [Easy][Normal][Hard][Brutal] │
├─────────────────────────────────────────┤
│  Summary: 1v1 vs CPU · 5 min · 1000 wins · Normal AI │
├─────────────────────────────────────────┤
│  [Validation banner if invalid]          │
│  [Start Match]                           │
│  ← Back to Lobby                         │
└─────────────────────────────────────────┘
```

**Room Waiting (Host):**

```
┌─────────────────────────────────────────┐
│  ROOM ABC123                            │
│  Opponent connected! Set rules and start.│
├─────────────────────────────────────────┤
│  [Room code] [Copy link]                 │
├─────────────────────────────────────────┤
│  Win Goal, Supply, Duration (no AI)     │
├─────────────────────────────────────────┤
│  Summary: 1v1 · 5 min · 1000 wins       │
├─────────────────────────────────────────┤
│  [Start Match]  (enabled if peerCount≥1)│
│  ← Leave Room                            │
└─────────────────────────────────────────┘
```

### Visual Hierarchy

1. **Primary:** Mode selection, Start Match button.
2. **Secondary:** Rules sections (win goal, supply, duration, AI).
3. **Tertiary:** Summary, validation banner, back link.

### Grouping of Options

- **Mode** — own section; cards in a row.
- **Economy / Pacing** — Win goal, Supply, Duration grouped as "Match rules".
- **AI** — Own section when applicable.
- **Summary** — Single line or compact card above CTA.

### Card / Panel Layout

- Use existing `lobby`, `lobby-content`, `mode-card`, `rules-section` classes.
- Summary: new `setup-summary` class; subtle background, padding, rounded corners.
- Validation banner: `validation-banner validation-banner-error` or `validation-banner-warning`.

### Selection Patterns

- Mode: `mode-card` with `mode-card-online` (or similar) when selected. Selected = border + background tint.
- Presets: `rules-preset-btn` with `active` when selected.
- Sliders: `rules-slider` with `rules-number` or `rules-value` for display.

### Button Hierarchy

- **Primary:** Start Match — `btn-primary` or `mode-card` with emphasis.
- **Secondary:** Back, Leave Room — `lobby-back-btn` or `btn-secondary`.
- **Tertiary:** Preset buttons, mode cards (when not selected).

### Summaries

- One-line: "1v1 vs CPU · 5 min · First to 1000 wins · Normal AI · Normal supply"
- Room: "1v1 · 5 min · First to 1000 wins" (no AI)

### Helper Text

- Win goal: "First player to reach this secured wealth wins."
- Supply: "Higher supply = more unit deploys."
- Duration: "Match length in minutes."
- AI: "Affects bot click speed, banking, and deploy frequency."

### Warnings

- Validation errors: Red banner.
- Warnings (e.g. "Very short match" for 2 min): Amber banner. Optional for v1.

### Confirmation Behaviour

- No explicit "Are you sure?" for Start Match. Validation is the gate.
- Optional: "Start match?" confirm for room host if desired. Not required for MVP.

### Responsiveness

- Same as lobby: flex wrap for mode cards; form max-width 400px; safe-area on mobile.
- Touch targets ≥ 44px.

### Accessibility

- Labels for all form sections.
- Range inputs: min, max, step, aria-valuenow.
- Buttons: aria-label where needed.
- Validation errors: aria-live="polite" or role="alert".

---

## 8. COMPONENT INVENTORY

### ModeSelectionCardGroup

**Purpose:** Select match mode (1v1, 2v2, FFA).

**Props:** `value: MatchMode`, `onChange: (m: MatchMode) => void`, `disabled?: boolean`, `allowedModes?: MatchMode[]`.

**Variants:** Full (all modes), restricted (e.g. 1v1 only for room).

**States:** Default, selected, disabled.

**Dependencies:** None.

**Reuse:** Custom setup, future room mode picker.

---

### ConfigSectionWrapper

**Purpose:** Group a set of related controls with label.

**Props:** `title: string`, `children: ReactNode`, `hint?: string`.

**Variants:** None.

**Implementation:** `rules-section` + `rules-label`; optional `rules-hint`.

---

### SliderWithDisplay

**Purpose:** Range input with numeric or formatted display.

**Props:** `value: number`, `min`, `max`, `step`, `onChange`, `format?: (n: number) => string`.

**Variants:** Number display (win goal), duration display (X min).

**States:** Default, focus.

**Reuse:** Win goal, duration.

---

### PresetButtonGroup

**Purpose:** Select one of N presets.

**Props:** `options: T[]`, `value: T`, `onChange: (t: T) => void`, `format: (t: T) => string`, `className?: string`.

**Variants:** Supply presets, AI difficulty.

**States:** Default, active.

**Reuse:** Supply, AI.

---

### AIDifficultyPicker

**Purpose:** Select AI difficulty.

**Props:** `value: AIDifficulty`, `onChange: (a: AIDifficulty) => void`.

**Variants:** None.

**Implementation:** PresetButtonGroup with AIDifficulty options, or inline buttons.

---

### GameRulesForm (Enhanced)

**Purpose:** Full rules editing: win goal, supply, duration, AI (conditional).

**Props:** `config: MatchConfig`, `onChange: (c: MatchConfig) => void`, `showAiDifficulty: boolean`, `compact?: boolean`.

**Variants:** Full, compact (room).

**Implementation:** Compose SliderWithDisplay, PresetButtonGroup, AIDifficultyPicker. Add validation integration.

---

### SetupSummary

**Purpose:** One-line or short summary of config.

**Props:** `config: MatchConfig`, `mode: MatchMode`, `isMultiplayer?: boolean`.

**Variants:** Full (with AI), short (no AI for room).

**Implementation:** Format string from config. No logic.

---

### ValidationBanner

**Purpose:** Show validation errors or warnings.

**Props:** `validation: { valid: boolean; errors: string[]; warnings?: string[] }`, `visible?: boolean`.

**Variants:** Error (red), warning (amber).

**States:** Hidden when valid and no warnings; visible when invalid or has warnings.

**Implementation:** Renders list of messages. `role="alert"` when errors.

---

### StartMatchButton

**Purpose:** Primary CTA to start match.

**Props:** `onClick`, `disabled: boolean`, `label?: string`, `loading?: boolean`.

**Variants:** "Start Match", "Start Game" (room).

**States:** Enabled, disabled, loading (optional).

**Implementation:** `mode-card` or `btn-primary`; disabled when validation fails or (room) peerCount < 1.

---

### RoomRulesPanel

**Purpose:** Wrapper for host's rules in room waiting state.

**Props:** `config: MatchConfig`, `onChange`, `peerCount: number`.

**Implementation:** GameRulesForm + SetupSummary + StartMatchButton. Disables Start when peerCount < 1.

---

### UnsupportedBadge (Future)

**Purpose:** "Offline only" or "Coming soon" on mode cards.

**Props:** `label: string`.

**Implementation:** Small badge overlay on card. Deferred.

---

## 9. STORE / STATE / DATA FLOW PLAN

### Recommended State Ownership Model

**Option A (Recommended): Dedicated setup store slice**

- Create `setupStore` (Zustand) or `setupSlice` in a combined store.
- Holds: `draftConfig: MatchConfig`, `mode: MatchMode`, `source: 'custom' | 'room'`.
- Actions: `setDraftConfig`, `setMode`, `resetSetup`, `getValidatedConfig` (returns validated or null).
- Transient: cleared on navigate away or on successful match start.
- **Why:** Single source of truth for setup; validation in one place; easy to persist draft to sessionStorage later.

**Option B: Component state + validation module**

- Keep `useState` in CustomGameSetup and RoomLobbyScreen.
- Add `validateSetup(config, mode, isMultiplayer): ValidationResult`.
- Pass validated config into `startMatch` / room start.
- **Why:** Minimal change; no new store. Downside: duplicated draft state if we add more entry points.

**Recommendation:** **Option A** for scalability. Setup is a distinct phase; a dedicated store keeps boundaries clear. If we want to avoid a new store for now, Option B is acceptable for v1 with a clear path to Option A.

### Draft vs Committed State

- **Draft:** What the user is editing. Lives in setup store or component state.
- **Committed:** What gets passed to `startMatch` / `startMultiplayerMatch`. Must be validated.
- **Transition:** On Start click → validate draft → if valid, commit (call start) and clear draft. If invalid, show errors, do not commit.

### When Config Is Committed

- **Custom:** On Start Match click, after validation.
- **Room host:** On Start Match click, after validation.
- **Room joiner:** On receiving `start` action; config comes from host payload.
- **Quick play:** No draft; commit uses `DEFAULT_MATCH_CONFIG` with `mode` set.

### How Config Is Passed Into Match Creation

- **Offline:** `startMatch(playerCount, validatedConfig)`.
- **Multiplayer:** Host: `startMultiplayerMatch(players, matchStartTime, 0, validatedConfig)` then `broadcastAction({ type: 'start', matchConfig: validatedConfig, ... })`. Joiner: `startMultiplayerMatch` receives config from action payload.

### Host vs Join Flow

- **Host:** Edits `hostConfig` (or setup store draft). Validates. Creates players. Calls `startMultiplayerMatch` + `broadcastAction`.
- **Join:** No config editing. Waits. Receives `start` action. Calls `startMultiplayerMatch` with `action.matchConfig`.

### Room State and Setup State

- Room state: `roomState`, `roomId`, `peerCount`, `isHostUser`, `hostConfig`.
- Setup state: Can be same as `hostConfig` for host. Or setup store holds draft, and on Start we copy to `hostConfig` and broadcast. Simpler: keep `hostConfig` in RoomLobbyScreen state; validate before Start.

### Reset / Cancel / Back

- **Back from Custom:** Navigate `/lobby`; clear setup store draft (or component state unmounts).
- **Leave Room:** disconnect(); navigate `/lobby`; clear room state.
- **After match start:** gameStore holds `matchConfig`; setup draft is irrelevant.

---

## 10. CODE ARCHITECTURE PLAN

### Folder Structure

```
src/
  domain/
    types.ts           # MatchConfig, MatchMode, etc.
    constants.ts        # DEFAULT_MATCH_CONFIG, presets
    validateSetup.ts    # NEW: validateSetup(config, mode, isMultiplayer)
  store/
    gameStore.ts       # startMatch, startMultiplayerMatch
    setupStore.ts      # NEW (optional): draftConfig, mode, actions
  features/
    setup/             # NEW folder
      SetupScreen.tsx        # Full setup for custom path
      SetupSummary.tsx
      ValidationBanner.tsx
      ModePicker.tsx
      StartMatchButton.tsx
    lobby/
      LobbyScreen.tsx
      CustomGameSetup.tsx    # Refactor to use SetupScreen or inline
      RoomLobbyScreen.tsx
      GameRulesForm.tsx      # Enhanced
    matchmaking/
      QueueScreen.tsx        # Pass quickPlayConfig to startMatch
```

### Route Placement

- `/setup` — Full setup screen for custom. Optional; can keep `/custom` and have CustomGameSetup render setup content.
- `/custom` — Custom game setup (current). Either redirect to `/setup?source=custom` or keep as-is with setup content inline.
- `/room`, `/room/:roomId` — Room flow. Setup content inline for host.

### Validation Schema Location

- `src/domain/validateSetup.ts` — Pure function `validateSetup(config, mode, isMultiplayer): ValidationResult`.

### Config Helpers

- `src/domain/configHelpers.ts` (optional) — `getQuickPlayConfig(mode)`, `mergeWithDefaults(partial)`, `getPlayerCount(mode)`.

### Orchestration Logic

- `startMatch` and room `handleStartMatch` remain in gameStore and RoomLobbyScreen.
- Validation called immediately before `startMatch` / `handleStartMatch`.
- No orchestration store; flow is linear.

### Multiplayer Setup Adapter

- Room host: validate `hostConfig` → create players → `startMultiplayerMatch` + broadcast.
- Joiner: no adapter; receives config in `start` action.

### Test File Locations

- `src/domain/validateSetup.test.ts`
- `src/features/setup/SetupSummary.test.tsx` (optional)
- `src/store/setupStore.test.ts` (if Option A)

### Naming Conventions

- Setup components: `Setup*` prefix.
- Validation: `validateSetup`, `ValidationResult`, `ValidationBanner`.
- Config: `MatchConfig`, `draftConfig`, `validatedConfig`.

### Module Boundaries

- **Domain:** Pure validation, config types, helpers. No React, no store.
- **Store:** setupStore (if used); gameStore for match runtime.
- **Components:** SetupScreen, GameRulesForm, etc. Use store or props; no domain logic beyond calling validateSetup.

---

## 11. IMPLEMENTATION PLAN

### Phase 1: Config Model and Validation

**Deliverables:**

- `validateSetup(config, mode, isMultiplayer): ValidationResult` in `domain/validateSetup.ts`
- `ValidationResult` type: `{ valid: boolean; errors: string[]; warnings?: string[] }`
- Range constants (DURATION_MIN, WIN_THRESHOLD_MIN, etc.) in validateSetup or constants
- Unit tests for validateSetup

**Dependencies:** None.

**Parallel-safe:** Yes.

**Validation criteria:** All invalid configs produce `valid: false` and non-empty errors. All valid configs produce `valid: true`.

**Completion criteria:** Tests pass; validateSetup exported and callable.

---

### Phase 2: Core Setup UI

**Deliverables:**

- `SetupSummary` component
- `ValidationBanner` component
- `ModePicker` (or extract from CustomGameSetup)
- Enhanced `GameRulesForm` with validation integration (optional; can defer to Phase 3)
- `StartMatchButton` with disabled logic

**Dependencies:** Phase 1 (for validation integration).

**Parallel-safe:** SetupSummary and ValidationBanner can be built in parallel with Phase 1.

**Completion criteria:** Components render; StartMatchButton disables when validation fails (once wired).

---

### Phase 3: Offline Flow Integration

**Deliverables:**

- CustomGameSetup: integrate validateSetup; show ValidationBanner; show SetupSummary; disable Start when invalid
- QueueScreen: pass `getQuickPlayConfig(mode)` to startMatch instead of no config
- `getQuickPlayConfig(mode): MatchConfig` — DEFAULT_MATCH_CONFIG with mode set
- Ensure startMatch receives and uses config for createPlayer

**Dependencies:** Phase 1, Phase 2.

**Parallel-safe:** CustomGameSetup and QueueScreen changes can be parallel after Phase 1.

**Completion criteria:** Custom path produces correct config; Quick play uses mode-aware defaults; no regressions.

---

### Phase 4: Multiplayer Flow Integration

**Deliverables:**

- RoomLobbyScreen: validate hostConfig before handleStartMatch; show ValidationBanner if invalid; disable Start when invalid
- Ensure matchConfig in broadcast `start` action is the validated config
- Joiner path unchanged (already receives config)

**Dependencies:** Phase 1, Phase 2.

**Parallel-safe:** Can run in parallel with Phase 3.

**Completion criteria:** Host cannot start with invalid config; joiner receives correct config; no regressions.

---

### Phase 5: Polish, Errors, and QA

**Deliverables:**

- Helper text for rules sections
- Accessibility: labels, aria-live for validation
- Edge case handling: very short duration, very high win threshold
- Full regression: all paths from lobby to match
- Mobile layout check

**Dependencies:** Phases 1–4.

**Completion criteria:** No critical bugs; accessibility baseline met; all paths work on desktop and mobile.

---

## 12. TASK BREAKDOWN FOR CURSOR EXECUTION

### Parallel-Safe Tasks

| Task | Objective | Target Files | Changes | Completion Criteria |
|------|-----------|--------------|---------|---------------------|
| T1 | Implement validateSetup | domain/validateSetup.ts | Create validateSetup, ValidationResult, range checks | Exported; tests pass |
| T2 | Implement validateSetup tests | domain/validateSetup.test.ts | Test valid, invalid, edge cases | All pass |
| T3 | Implement SetupSummary | features/setup/SetupSummary.tsx | Create component; format config to string | Renders correctly |
| T4 | Implement ValidationBanner | features/setup/ValidationBanner.tsx | Create component; show errors/warnings | Renders when invalid |
| T5 | Implement getQuickPlayConfig | domain/configHelpers.ts or constants | Return MatchConfig for mode | Used by QueueScreen |

### Sequential Tasks

| Task | Depends On | Objective | Target Files |
|------|------------|-----------|--------------|
| T6 | T1 | Integrate validation into CustomGameSetup | CustomGameSetup.tsx |
| T7 | T3, T4, T6 | Add SetupSummary, ValidationBanner, disable Start when invalid | CustomGameSetup.tsx |
| T8 | T5 | QueueScreen passes getQuickPlayConfig(mode) to startMatch | QueueScreen.tsx |
| T9 | T1 | RoomLobbyScreen validates hostConfig before Start | RoomLobbyScreen.tsx |
| T10 | T4, T9 | Add ValidationBanner to Room host view | RoomLobbyScreen.tsx |

### Integration Tasks

| Task | Objective |
|------|------------|
| T11 | Verify startMatch uses config for createPlayer (already does) |
| T12 | Verify matchConfig flows to startMultiplayerMatch and broadcast |
| T13 | End-to-end: Lobby → Custom → Start → Match runs with correct config |
| T14 | End-to-end: Lobby → Room → Create → Start → Match runs with correct config |
| T15 | End-to-end: Lobby → 1v1 quick → Queue → Match uses 1v1 defaults |

### Validation Tasks

| Task | Objective |
|------|------------|
| V1 | Invalid config cannot start match (custom and room) |
| V2 | Quick play uses mode-specific defaults |
| V3 | Room joiner receives host config correctly |

---

## 13. TESTING PLAN

### Validation Tests

- `validateSetup` with valid config → `valid: true`
- `validateSetup` with durationSec < 120 → `valid: false`, error message
- `validateSetup` with winThreshold < 500 → `valid: false`
- `validateSetup` with winThreshold > 3000 → `valid: false` (or clamp; document choice)
- Mode-specific: 1v1, 2v2, ffa all produce valid for default config

### Config Serialisation Tests

- `getQuickPlayConfig('1v1')` returns config with mode '1v1'
- `getQuickPlayConfig('2v2')` returns config with mode '2v2', playerCount 4
- Merge with defaults: partial config + DEFAULT_MATCH_CONFIG produces full valid config

### Mode Restriction Tests

- Online path: mode forced to 1v1 (if we add mode to room)
- Offline: 2v2, ffa allowed

### UI Interaction Tests (Optional)

- CustomGameSetup: change mode, change rules, click Start with invalid → banner shows
- CustomGameSetup: fix invalid, click Start → match starts

### Host/Join Path Tests

- Room host: invalid config → Start disabled
- Room host: valid config, peerCount >= 1 → Start enabled, match starts
- Room joiner: receives start action with matchConfig → startMultiplayerMatch called with correct config

### Unsupported Option Tests

- If 2v2 online is added as disabled: clicking does not start; or badge shows

### Regression Tests

- Existing match start behaviour unchanged for valid paths
- createPlayer receives config; economy initialised correctly
- Determinism test still passes

### Store Orchestration Tests (If setupStore)

- setDraftConfig updates state
- getValidatedConfig returns null when invalid
- resetSetup clears draft

---

## 14. QUALITY GATES

Before considering the setup layer complete:

1. **Config always validates correctly** — No invalid config can reach `startMatch` or `startMultiplayerMatch`.
2. **Unsupported combinations cannot start** — Duration/winThreshold out of range blocked; room Start disabled when peerCount < 1.
3. **Current supported paths work cleanly** — Quick 1v1/2v2/FFA, Custom, Room create, Room join.
4. **UI clearly communicates selected setup** — Summary visible before Start; mode implications clear.
5. **No config/store drift** — Draft and committed config are consistent; no stale state.
6. **Offline and multiplayer entry flows coherent** — Shared components; path-specific logic minimal.
7. **Setup resets predictably** — Back/cancel clears draft; no leftover state.
8. **Basic responsiveness/accessibility** — Labels, touch targets, validation announced.
9. **No major regression** — Existing match start, createPlayer, economy init unchanged for valid inputs.

---

## 15. FUTURE EXPANSION DESIGN

### Hooks to Build Now

- **Validation function** — Extensible: add new rules (e.g. max duration 900) without changing callers.
- **Config type** — MatchConfig is the single schema; new fields added here.
- **Mode-based constraints** — `getPlayerCount(mode)`, `getAllowedModes(isMultiplayer)` — small helpers.
- **SetupSummary** — Format function that can grow: add "Map: X" when maps exist.
- **ValidationBanner** — Supports errors and warnings; extensible messages.

### Deferred Hooks

- **Presets** — "Quick", "Standard", "Long game" — add `presetId?: string` to config; preset applies a bundle of values. Not needed for v1.
- **Saved setups** — sessionStorage key `clickwar-setup-draft`; load on Custom entry. Deferred.
- **2v2/FFA online** — Room mode picker; host selects 1v1 or 2v2; validation allows 2v2 when `isMultiplayer`. Deferred.
- **Map/arena selection** — Add `mapId` to config when maps exist. Deferred.
- **Mutators** — Add `mutators: string[]` when mutator system exists. Deferred.
- **Public/private room** — Add `roomVisibility` to room state when matchmaking exists. Deferred.

### What Not to Build Now

- Full preset system
- Saved favourites
- Map selection
- Tournament presets
- Ranked/casual toggle

---

## 16. FINAL RECOMMENDATION

### Recommended Setup-Layer Scope for Next Build

1. **Validation module** — `validateSetup` with explicit rules; unit tested.
2. **Quick play config** — `getQuickPlayConfig(mode)` so QueueScreen passes correct config.
3. **Custom path** — Validation before Start; ValidationBanner; SetupSummary; disabled Start when invalid.
4. **Room path** — Validation before Start for host; ValidationBanner; disabled Start when invalid or peerCount < 1.
5. **Shared components** — SetupSummary, ValidationBanner. GameRulesForm enhanced only if needed.

### Best State Ownership Model

**Hybrid for v1:** Keep component state in CustomGameSetup and RoomLobbyScreen. Add `validateSetup` as a pure module. Call validation on Start; do not commit if invalid. Add SetupSummary and ValidationBanner as presentational components. This minimises change while achieving validation and clarity. Migrate to setupStore in a later iteration if we add presets or saved drafts.

### Best UI Flow

- **Custom:** Mode → Rules → Summary → [Validation] → Start. Single screen.
- **Room:** Create/Join → Waiting → (Host) Rules → Summary → [Validation] → Start. Same structure as now; add validation and summary.
- **Quick play:** No setup UI; QueueScreen → Start with mode-aware defaults.

### Most Important Validation Rules

1. `durationSec` in [120, 600]
2. `winThreshold` in [500, 3000]
3. `mode` in ['1v1','2v2','ffa']
4. Supply preset produces valid baseSupplyRate, supplyCap, initialSupply
5. Room: peerCount >= 1 for host Start

### Best Implementation Order

1. validateSetup + tests
2. getQuickPlayConfig + QueueScreen integration
3. SetupSummary + ValidationBanner
4. CustomGameSetup integration
5. RoomLobbyScreen integration
6. Polish and QA

### Key Risks to Avoid

- **Mixing setup draft into gameStore** — Keep draft in setup/component state until commit.
- **Overbuilding presets/saved state** — Defer until needed.
- **Adding 2v2 online UI before backend** — Do not show 2v2 in Online path until supported.
- **Vague validation** — Every rule must be explicit and testable.
- **Skipping QueueScreen config** — Quick play must use mode-aware defaults, not raw DEFAULT_MATCH_CONFIG.

---

*End of document.*
