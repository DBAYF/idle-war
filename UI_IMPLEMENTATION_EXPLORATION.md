# Click War — Full UI Implementation Exploration

A comprehensive UI exploration and front-end implementation planning document for the Click War economy-war PvP game. This document serves as a design-engineering handoff reference.

---

## 1. PRODUCT UI INTENT

### Visual Identity

Click War presents as a **premium economy-war game** with a dark, tactical aesthetic. The UI must communicate:

- **Tension and urgency** — real-time combat, countdown timers, incoming threats
- **Clarity under pressure** — critical information (resources, targets, cooldowns) must be instantly readable
- **Tactical depth** — economy vs combat trade-offs, upgrade paths, unit choices
- **Competitive energy** — win/lose states, leader indicators, steal feedback

### Design Language (Concrete)

| Aspect | Definition |
|--------|------------|
| **Mood** | Dark sci-fi / tactical command centre. Not playful or cartoonish. |
| **Density** | Information-dense HUD; no wasted space during match. Lobby screens can breathe more. |
| **Hierarchy** | Primary: resources, timer, deploy bar. Secondary: upgrades, scoreboard. Tertiary: settings, world view. |
| **Feedback** | Every meaningful action (click, bank, deploy, upgrade) must have immediate visual and often audio feedback. |
| **Trust** | Numbers must be accurate; animations must feel responsive; no perceived lag on critical actions. |

### Emotional and Functional Communication

- **Economy** → Loose coins feel vulnerable (gold, stealable); secured wealth feels safe (cyan, progress toward win).
- **Combat** → Incoming attacks feel threatening (red vignette, threat strip, screen shake).
- **Victory** → Cyan/gold celebration; defeat → red; time up → neutral grey.
- **Offline vs Online** → Offline badge (cyan pulse); Online mode (gold accent) signals P2P.

---

## 2. USER EXPERIENCE PRINCIPLES

1. **Economy-first, combat-second** — The core loop is click → upgrade → bank → deploy. UI must make each step obvious and low-friction.
2. **Glanceable state** — During a match, the player should understand their economy, timer, and threat level in under 1 second.
3. **No dead ends** — Every screen has a clear path back (Lobby, Leave, Back).
4. **Touch-friendly** — Mobile is supported; all interactive targets ≥ 44×44px.
5. **Reduced cognitive load** — Mode cards, preset buttons, and clear labels reduce configuration friction.
6. **Feedback on every action** — Clicks, purchases, deploys, banks all trigger visual/audio confirmation.
7. **Progressive disclosure** — Tutorial is optional; advanced rules (Custom, Room) are behind explicit choices.

---

## 3. FULL SCREEN-BY-SCREEN UI BREAKDOWN

### 3.1 Landing Screen (`/`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Entry point; establish brand; direct to Lobby. |
| **Primary actions** | Play Now, Guest Play, Account (placeholder), Mute/Unmute. |
| **Layout** | Full-screen centred content. Radial gradient background (cyan at 50% 30%). Floating particles (12, staggered animation). Settings gear top-right. Title, subtitle, offline badge, CTA buttons. |
| **Key components** | `motion.div` (landing), `landing-bg`, `landing-particles`, `landing-content`, `landing-title`, `landing-actions`, `btn-primary`, `btn-secondary`, `btn-ghost`, `landing-settings`. |
| **States** | Default; hover on buttons (scale 1.05/1.02); tap (scale 0.98); audio muted (🔇) / unmuted (🔊). |
| **Transitions** | Page enter: opacity 0→1 (0.6s); content: y 30→0, opacity 0→1 (delay 0.2, 0.5s); actions: opacity 0→1 (delay 0.5). Particles: y/opacity loop (3–4s, staggered). |
| **Edge cases** | Account button disabled/placeholder; no loading state (instant navigation). |
| **Responsive** | Safe-area insets on mobile; buttons wrap; title clamp(3rem, 8vw, 5rem). |
| **Accessibility** | Settings button has `aria-label`; Account has `title`. Focus order: Play Now → Guest → Account → Settings. |
| **Implementation** | `LandingScreen.tsx`; Framer Motion for all animations; `useUIStore` for audio state. |

---

### 3.2 Lobby Screen (`/lobby`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Mode selection: Online, 1v1, 2v2, FFA, Custom. Optional tutorial. |
| **Primary actions** | Click mode card → navigate or show Queue; How to play → TutorialModal; Online → /room. |
| **Layout** | Centred. H1 "LOBBY", subtitle, Online card (gold), offline badge, tutorial link, 4 mode cards in flex wrap. Back link at bottom. |
| **Key components** | `lobby`, `lobby-bg`, `lobby-content`, `mode-card`, `mode-card-online`, `lobby-offline-badge`, `offline-dot`, `lobby-tutorial-btn`, `lobby-back-btn`, `TutorialModal`. |
| **States** | Default; hover (scale 1.03, y -4); tap (scale 0.98); `queueMode` set → `QueueScreen` replaces lobby (AnimatePresence). |
| **Transitions** | Enter: opacity 0→1; modes: opacity 0→1, y 20→0 (delay 0.2). Exit: opacity 0. Queue: crossfade. |
| **Edge cases** | QueueScreen shown inline (no route change); TutorialModal overlay. |
| **Responsive** | Mode cards wrap; safe-area on mobile. |
| **Accessibility** | Mode cards are buttons; tutorial is button. |
| **Implementation** | `LobbyScreen.tsx`; `useState` for `queueMode`, `showTutorial`; `AnimatePresence` for Queue/Tutorial. |

---

### 3.3 Custom Game Setup (`/custom`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Configure offline match: mode (1v1/2v2/FFA), win goal, supply scarcity, duration, AI difficulty. |
| **Primary actions** | Select mode; adjust sliders; select presets; Start Match; Back to Lobby. |
| **Layout** | Same lobby shell. H1 "CUSTOM GAME". Mode cards (1v1, 2v2, FFA) with selected state. `GameRulesForm` (win goal, supply, duration, AI). Start Match card. Back link. |
| **Key components** | `GameRulesForm`, `rules-section`, `rules-slider`, `rules-number`, `rules-presets`, `rules-preset-btn`, `mode-card`. |
| **States** | Mode selected (gold border); preset active (cyan border, cyan bg); slider/number synced. |
| **Transitions** | Enter/exit same as lobby. Preset buttons: scale on hover/tap. |
| **Edge cases** | Number input clamped to min/max; slider and number must stay in sync. |
| **Responsive** | Form max-width 400px; presets wrap. |
| **Accessibility** | Labels for all form sections; range inputs have min/max/step. |
| **Implementation** | `CustomGameSetup.tsx`; `GameRulesForm.tsx`; `useState` for config; `startMatch(playerCount, config)`. |

---

### 3.4 Room Lobby Screen (`/room`, `/room/:roomId`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Create or join online 1v1 room; share code/link; configure rules (host); start match. |
| **Primary actions** | Create Room; Join Room (with code); Copy link; Start Match (host); Leave Room. |
| **Layout** | Two phases: (1) Create/Join selection or Join form; (2) Waiting room with code, status, rules (host), Start button. |
| **Key components** | `mode-card`, `join-input`, `room-code-wrap`, `room-code`, `room-copy-btn`, `room-status`, `GameRulesForm`, `lobby-error`, `lobby-back-btn`. |
| **States** | `roomState`: create | join | waiting | joining | error. Create: Create + Join cards. Join: input + Join + Back. Waiting: code, status, rules (host), Start (disabled until peerCount ≥ 1). Joining: "Connecting...". Error: red message. |
| **Transitions** | Same lobby shell; content swaps based on state. |
| **Edge cases** | Join code min 4 chars; Start disabled until opponent connected; copy uses `/#/room/{id}` (hash router). |
| **Responsive** | Same as lobby. |
| **Accessibility** | Error announced; input placeholder. |
| **Implementation** | `RoomLobbyScreen.tsx`; `useParams` for roomId; `createRoom`/`joinRoom` from matchService; `broadcastAction` for start. |

---

### 3.5 Queue Screen (inline, no route)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | "Match found" feedback before offline match; 2s delay then navigate to /match. |
| **Primary actions** | None (auto-progress). |
| **Layout** | Full-screen centred. Spinner, "MATCH FOUND", mode text, player cards (2 or 4). |
| **Key components** | `queue-screen`, `queue-content`, `queue-spinner`, `queue-player-card`, `queue-avatar`. |
| **States** | Visible for ~2s; spinner rotates; player cards stagger in. |
| **Transitions** | Enter: opacity 0→1; exit: opacity 0. Spinner: rotate 360° linear 2s repeat. Cards: opacity 0→1, x -20→0 (delay 0.2 + i*0.1). |
| **Edge cases** | Unmount before 2s if user navigates away (clearTimeout). |
| **Implementation** | `QueueScreen.tsx`; `useEffect` with 2s timeout; `startMatch(playerCount)` then `navigate('/match')`. |

---

### 3.6 Match Screen (`/match`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Main game HUD + battle layer. Click, upgrade, bank, deploy, monitor threats. |
| **Primary actions** | Click resource node; buy upgrades; bank coins; select target; deploy units; toggle World View; open Settings. |
| **Layout** | **Desktop**: Battle layer inset by `--hud-inset: 14%` (top/bottom/sides). HUD overlaid: top (ResourceMeters), left (ClickField, Bank, WallHealth), bottom (DeployBar + StealFeedback), right (UpgradePanel), minimap area (ScoreboardStrip). ThreatStrip top-left when under attack. Settings top-right; World toggle top-right. **Mobile**: Flex column; battle flex:1; HUD strip below (max 45vh), scrollable. |
| **Key components** | `MatchScreen`, `BattleLayer`, `match-hud`, `ResourceClickField`, `ResourceMeters`, `BankButton`, `WallHealthMeter`, `ScoreboardStrip`, `ThreatStrip`, `StealFeedback`, `UpgradePanel`, `DeployBar`, `WorldViewOverlay`, `MatchPauseOverlay`, `ScreenShake`. |
| **States** | Normal; under attack (vignette + threat strip); screen shake on impact; world view open (overlay); pause open (overlay). |
| **Transitions** | Enter: opacity 0→1. Shake: CSS keyframes 0.35s. Threat/vignette: AnimatePresence. |
| **Edge cases** | No matchStartTime → redirect to /match-end or /lobby; matchEndTime → navigate /match-end. |
| **Responsive** | `--hud-inset: 0` on mobile; HUD becomes bottom strip; compact sizing. |
| **Accessibility** | `user-select: none` on match-screen; touch-action manipulation. Settings and World have labels. |
| **Implementation** | `MatchScreen.tsx`; 60fps tick loop; `useScreenShake`; conditional class `shake`. |

---

### 3.7 Match End Screen (`/match-end`)

| Aspect | Specification |
|--------|---------------|
| **Purpose** | Show result (VICTORY/DEFEAT/TIME UP), stats, wealth chart, key moments, Rematch/Lobby. |
| **Primary actions** | Rematch (reset, navigate /lobby); Lobby (reset, navigate /lobby). |
| **Layout** | Centred. Result title (large, colour-coded). Stats summary (attacks sent, coins stolen, coins lost). Key moment (biggest steal) if > 0. Wealth chart (bars per player). Stats grid (rank, name, wealth). Rematch + Lobby buttons. |
| **Key components** | `match-end-content`, `result-title`, `match-stats-summary`, `stat-pair`, `key-moments`, `wealth-chart`, `wealth-bar-row`, `stats-grid`, `stat-row`, `match-end-actions`. |
| **States** | Win (cyan); Lose (red); Time up (grey). Wealth bars animate from 0 to final %. |
| **Transitions** | Title: scale 0.5→1, spring, delay 0.2. Stats: opacity 0→1 delay 0.3. Key moment: y 10→0 delay 0.35. Wealth bars: width 0→pct%, delay 0.3 + i*0.1, 0.8s. Stats grid: y 30→0 delay 0.4. Actions: opacity 0→1 delay 0.6. |
| **Edge cases** | No winner (time up); key moment only if biggestSingleSteal > 0. |
| **Responsive** | Centred; max-width 400px. |
| **Accessibility** | Result is h1; stats are readable. |
| **Implementation** | `MatchEndScreen.tsx`; `hasReachedWinThreshold`; `audioService.playWin/playLose`; `reset()` on actions. |

---

### 3.8 Overlays (Match context)

| Overlay | Purpose | Trigger | Dismiss |
|---------|---------|---------|---------|
| **TutorialModal** | How to play steps | Lobby "How to play" | Click overlay or GOT IT |
| **MatchPauseOverlay** | Settings (sound), Resume, Leave | Settings button | Click overlay, Resume, or Leave |
| **WorldViewOverlay** | Full map, all bases, units | World toggle button | Toggle button again |

---

## 4. SHARED COMPONENT INVENTORY

### 4.1 Primitives

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **Button (CSS classes)** | Primary CTA | Landing, Tutorial, Match End | `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-leave` | default, hover, tap | App.css; motion.button with whileHover/whileTap |
| **Input (range)** | Slider | GameRulesForm | — | default, focus | `rules-slider`, accent-color cyan |
| **Input (number)** | Numeric input | GameRulesForm | — | default, focus | `rules-number`, clamped |
| **Input (text)** | Room code | RoomLobbyScreen | — | default, focus, error | `join-input` |

### 4.2 Form Controls

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **GameRulesForm** | Match config | CustomGameSetup, RoomLobbyScreen | `showAiDifficulty` | — | Sliders, presets, AI difficulty |
| **rules-preset-btn** | Preset selection | GameRulesForm | — | default, active | `.active` = cyan border + bg |
| **target-tab** | Target selection | TargetSelector | — | default, selected | `--team-color` for selected border |

### 4.3 Navigation Components

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **mode-card** | Mode/card selection | Lobby, Room, Custom, Queue | `mode-card-online`, `mode-card-secondary` | default, hover, tap | motion.button |
| **lobby-back-btn** | Back to lobby | Lobby, Custom, Room | — | default, hover | Text button |
| **world-view-toggle** | Toggle World overlay | MatchScreen | — | WORLD / BATTLE label | motion.button |

### 4.4 Data Display Components

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **ResourceMeters** | Loose, Secured, Supply bars + timer | Match HUD top | — | endgame (timer red, pulse) | meter-row, meter-bar, meter-fill |
| **ScoreboardStrip** | Ranked wealth list | Match HUD minimap | — | you (highlight) | scoreboard-item, sb-wealth-bar |
| **WallHealthMeter** | Wall health bar | Match HUD left | — | — | wall-health-meter, wall-bar, wall-fill |
| **wealth-chart** | Final wealth bars | MatchEndScreen | — | — | wealth-bar-row, wealth-bar-fill |
| **stats-grid** | Rank/name/wealth rows | MatchEndScreen | — | — | stat-row with borderColor |

### 4.5 Feedback Components

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **ResourceClickField** | Click for coins | Match HUD left | — | default, tap, float nums | motion.div, AnimatePresence for +N |
| **BankButton** | Bank loose coins | Match HUD left | — | default, disabled, animating | bank-transfer-fx on bank |
| **StealFeedback** | "+N stolen" popup | Above DeployBar | — | visible 1.5s | AnimatePresence, lastStealFeedback |
| **ThreatStrip** | Incoming count | Match top-left | — | visible when incoming > 0 | threat-strip, under-attack-vignette |
| **ScreenShake** | Impact feedback | MatchScreen | — | shaking 350ms | CSS class `shake` |
| **queue-spinner** | Loading | QueueScreen | — | rotating | motion.div animate rotate |

### 4.6 Overlays

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **TutorialModal** | How to play | Lobby | — | — | tutorial-overlay, tutorial-modal |
| **MatchPauseOverlay** | Settings panel | MatchScreen | — | — | match-pause-overlay, match-pause-panel |
| **WorldViewOverlay** | Full map | MatchScreen | — | — | world-view-overlay, world-map, world-base, world-unit |

### 4.7 Media Components

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **BattleLayer** | PixiJS canvas | MatchScreen | — | appReady | Application, Graphics; radial layout; walls, units, impacts |

### 4.8 Cards and List Items

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **UpgradeCard** | Upgrade row | UpgradePanel | — | affordable, maxed, justPurchased | upgrade-card, purchase-pulse |
| **UnitCard** | Unit deploy button | DeployBar | type: runner, bruiser, saboteur | ready, disabled, onCooldown | unit-card, cooldown-radial SVG |
| **queue-player-card** | Player slot | QueueScreen | — | — | queue-player-card, queue-avatar |

### 4.9 Layout Wrappers

| Component | Purpose | Where used | Variants | States | Implementation |
|-----------|---------|------------|----------|--------|----------------|
| **landing** | Full-screen centred | LandingScreen | — | — | position fixed, flex center |
| **lobby** | Full-screen centred | Lobby, Room, Custom | — | — | Same pattern |
| **match-screen** | Game container | MatchScreen | shake | — | Flex column on mobile |
| **match-hud** | HUD overlay | MatchScreen | — | — | pointer-events: none; children auto |
| **hud-top, hud-left, hud-right, hud-bottom, hud-minimap** | HUD regions | MatchScreen | — | — | Absolute (desktop) / flex order (mobile) |

### 4.10 Page-Specific Composites

| Component | Purpose | Where used | Composition |
|-----------|---------|------------|-------------|
| **DeployBar** | Target + unit cards | MatchScreen | TargetSelector + UnitCard×3 |
| **UpgradePanel** | Upgrade list | MatchScreen | h3 + UpgradeCard×4 |
| **deploy-area** | Deploy + steal feedback | MatchScreen | StealFeedback + DeployBar |

---

## 5. DESIGN SYSTEM SPECIFICATION

### 5.1 Colour Roles

| Token | Value | Role |
|-------|-------|------|
| `--bg-dark` | #0a0b0f | Page/canvas background |
| `--bg-panel` | rgba(18,20,28,0.92) | Cards, panels, HUD |
| `--bg-elevated` | rgba(28,32,44,0.95) | Nested panels, inputs |
| `--border-subtle` | rgba(255,255,255,0.08) | Default borders |
| `--border-accent` | rgba(0,212,170,0.4) | Accent borders |
| `--text-primary` | #f0f2f5 | Primary text |
| `--text-secondary` | #9ca3af | Secondary text |
| `--text-muted` | #6b7280 | Muted text |
| `--accent-cyan` | #00d4aa | Primary accent, secured, ready |
| `--accent-red` | #ff6b6b | Danger, lose, threat |
| `--accent-gold` | #ffd93d | Wealth, leader, loose coins |
| `--accent-purple` | #a78bfa | Supply |
| `--glow-cyan` | 0 0 20px rgba(0,212,170,0.3) | Cyan glow |
| `--glow-gold` | 0 0 20px rgba(255,217,61,0.3) | Gold glow |

**Team colours** (from constants): `#00d4aa`, `#ff6b6b`, `#4ecdc4`, `#ffe66d`.

### 5.2 Typography Hierarchy

| Use | Font | Size | Weight | Notes |
|-----|------|------|--------|-------|
| Display / Titles | Orbitron | clamp(3rem,8vw,5rem) / 2.5rem / 3rem | 700 | Landing, Lobby, Match End |
| Body | Inter | 1rem / 0.9rem / 0.85rem | 400–600 | General UI |
| Labels | Inter | 0.75–0.85rem | 600 | rules-label, meter-label |
| Values | Inter | 0.9–1.25rem | 600–700 | Numbers, stats |
| Small | Inter | 0.7–0.8rem | 400–600 | sb-rank, wall-label |

### 5.3 Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| — | 0.25rem (4px) | Tight gaps |
| — | 0.5rem (8px) | Small gaps |
| — | 0.75rem (12px) | Medium gaps |
| — | 1rem (16px) | Standard gaps |
| — | 1.5rem (24px) | Section gaps |
| — | 2rem (32px) | Large gaps |
| — | 3rem (48px) | Major sections |

### 5.4 Layout Grid

- No formal grid; flexbox + absolute positioning.
- Central content max-width ~400px for forms.
- HUD uses `--hud-inset: 14%` (desktop) or 0 (mobile).

### 5.5 Sizing Conventions

| Element | Desktop | Mobile |
|---------|---------|--------|
| Click field | 140×140px | 100×100px (min 44×44) |
| Mode card | 180px width | — |
| Unit card | min 100px | min 80px, min-height 44px |
| Touch targets | — | min 44×44px |
| Settings/World buttons | 40×40px | 44×44px min |

### 5.6 Border Radius System

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 6px | Small elements, wall bars |
| `--radius-md` | 10px | Buttons, panels, inputs |
| `--radius-lg` | 16px | Modals, large cards |

### 5.7 Elevation / Shadow

- Panels: `border: 1px solid var(--border-subtle)`.
- Glows: `--glow-cyan`, `--glow-gold` for emphasis.
- No explicit shadow scale; depth via borders and background opacity.

### 5.8 Icon Sizing

- Emoji used for settings (⚙️), audio (🔊/🔇).
- No icon library; inline SVG for cooldown radial.
- Recommend: 24px base if adding icons.

### 5.9 Button Hierarchy

| Level | Class | Use |
|-------|-------|-----|
| Primary | `btn-primary` | Main CTA (Play, Rematch, GOT IT) |
| Secondary | `btn-secondary` | Secondary actions (Guest, Lobby, Resume) |
| Ghost | `btn-ghost` | Tertiary (Account) |
| Danger | `btn-leave` | Leave Match |

### 5.10 Input Styling

- Background: `--bg-panel` or `--bg-dark`.
- Border: `--border-subtle`; focus: `--accent-cyan`.
- Slider: `accent-color: var(--accent-cyan)`.

### 5.11 Status / Semantic Styles

| Status | Colour | Use |
|--------|--------|-----|
| Success / Ready | cyan | Secured, affordable, ready |
| Danger | red | Lose, threat, leave |
| Warning | gold | Leader, loose coins, wealth |
| Neutral | grey | Time up, muted |

### 5.12 Dark / Light

- Currently dark-only. No light theme tokens.

### 5.13 Token Naming

- Use CSS custom properties in `theme.css`.
- Pattern: `--{category}-{variant}` (e.g. `--accent-cyan`, `--text-muted`).

---

## 6. MOTION AND INTERACTION SPEC

### 6.1 Animation Principles

- **Purposeful** — Motion confirms actions or guides attention.
- **Fast** — Most transitions 0.2–0.5s; no long waits.
- **Consistent** — Same easing (easeOut, spring) for similar cases.

### 6.2 Microinteractions

| Element | Trigger | Motion | Duration | Implementation |
|---------|---------|--------|----------|----------------|
| Primary button | Hover | scale 1.05 | — | whileHover |
| Primary button | Tap | scale 0.98 | — | whileTap |
| Mode card | Hover | scale 1.03, y -4 | — | whileHover |
| Mode card | Tap | scale 0.98 | — | whileTap |
| Click field | Tap | scale 0.92 | — | whileTap |
| Click field | Click | Burst + float +N | 0.3s burst, 0.8s float | CSS keyframes + AnimatePresence |
| Upgrade card | Purchase | scale 1→1.08→1, pulse | 0.4s | animate + purchase-pulse class |
| Bank button | Bank | "+N → secured" float up | 0.5s | AnimatePresence |
| Unit card | Deploy (ready) | scale 1.05 hover | — | whileHover |

### 6.3 Screen Transitions

| Route | Enter | Exit |
|-------|-------|------|
| Landing | opacity 0→1, 0.6s | — |
| Lobby/Custom/Room | opacity 0→1 | opacity 0 |
| Queue | opacity 0→1 | opacity 0 (AnimatePresence) |
| Match | opacity 0→1 | opacity 0 |
| Match End | opacity 0→1, 0.5s | — |

`AnimatePresence mode="wait"` wraps Routes for exit animations.

### 6.4 Button Press Behaviour

- All interactive elements: `whileTap={{ scale: 0.98 }}` (or 0.92 for click field).
- Prevents accidental double-tap via scale feedback.

### 6.5 Hover / Focus / Active

- Hover: scale, border-color, or opacity.
- Focus: outline removed; border-color used instead.
- Active: same as tap (scale down).

### 6.6 Loading Animations

- Queue: spinner (rotate 360° linear 2s repeat).
- No other loading states (match starts immediately).

### 6.7 Modal and Drawer Behaviour

| Overlay | Enter | Exit | Backdrop |
|---------|-------|------|----------|
| TutorialModal | scale 0.9→1, opacity 0→1 | scale 0.9, opacity 0 | Click to close |
| MatchPauseOverlay | scale 0.9→1, opacity, spring | scale 0.9, opacity 0 | Click to close |
| WorldViewOverlay | opacity 0→1, scale 0.95→1, 0.25s | opacity 0, scale 0.98 | Toggle button |

### 6.8 Gesture Handling

- Touch: same as mouse (click, hover via touch).
- No swipe gestures.
- `touch-action: manipulation` on body to reduce delay.

### 6.9 Reduced-Motion Fallback

- Not implemented. Recommend: `@media (prefers-reduced-motion: reduce)` to disable or shorten animations.

---

## 7. FRONT-END CODE ARCHITECTURE

### 7.1 Folder Structure

```
src/
├── main.tsx
├── App.tsx
├── App.css
├── domain/
│   ├── types.ts
│   ├── constants.ts
│   ├── economy.ts
│   ├── combat.ts
│   └── ai.ts
├── store/
│   ├── gameStore.ts
│   └── uiStore.ts
├── shared/
│   ├── theme/
│   │   └── theme.css
│   ├── audio/
│   │   └── audioService.ts
│   └── network/
│       └── matchService.ts
├── features/
│   ├── landing/
│   │   └── LandingScreen.tsx
│   ├── lobby/
│   │   ├── LobbyScreen.tsx
│   │   ├── RoomLobbyScreen.tsx
│   │   ├── CustomGameSetup.tsx
│   │   ├── GameRulesForm.tsx
│   │   └── TutorialModal.tsx
│   ├── matchmaking/
│   │   └── QueueScreen.tsx
│   └── game/
│       ├── MatchScreen.tsx
│       ├── MatchEndScreen.tsx
│       └── components/
│           ├── hud/
│           │   ├── ResourceClickField.tsx
│           │   ├── ResourceMeters.tsx
│           │   ├── BankButton.tsx
│           │   ├── WallHealthMeter.tsx
│           │   ├── ScoreboardStrip.tsx
│           │   ├── ThreatStrip.tsx
│           │   └── StealFeedback.tsx
│           ├── upgrades/
│           │   ├── UpgradePanel.tsx
│           │   └── UpgradeCard.tsx
│           ├── deploy/
│           │   ├── DeployBar.tsx
│           │   ├── UnitCard.tsx
│           │   └── TargetSelector.tsx
│           ├── battle/
│           │   └── BattleLayer.tsx
│           └── overlays/
│               ├── WorldViewOverlay.tsx
│               ├── MatchPauseOverlay.tsx
│               └── ScreenShake.tsx
```

### 7.2 Naming Conventions

- Components: PascalCase.
- Files: match component name.
- CSS classes: kebab-case, prefixed by feature (e.g. `landing-`, `match-`, `hud-`).
- Store slices: camelCase.

### 7.3 Component Layering

1. **Screens** — Route-level; compose features.
2. **Feature components** — Game HUD, lobby forms, etc.
3. **Primitives** — Buttons, inputs (via CSS classes).

### 7.4 Where Styles Live

- `theme.css`: tokens, base styles, body.
- `App.css`: all component styles (single file).
- **Recommendation**: Consider splitting App.css by feature (e.g. `landing.css`, `match.css`) for maintainability.

### 7.5 Token Storage

- CSS custom properties in `theme.css` `:root`.
- No JS theme object; use `var(--token)` in CSS.

### 7.6 Theme Application

- No theme switcher; dark theme is default.
- Body background and color set in theme.css.

### 7.7 Shared State

- **gameStore**: match state, players, units, upgrades, config, actions.
- **uiStore**: worldViewOpen, upgradePanelOpen, audioMuted, matchPauseOpen, hoveredUpgradeId.
- uiStore persisted (localStorage) for audioMuted.

### 7.8 Local State

- Screens: `useState` for queueMode, showTutorial, roomState, config, etc.
- Components: floatNums, clickId, justPurchased, bankAnimating, visible, etc.

### 7.9 Navigation

- React Router v7 `BrowserRouter`, `Routes`, `Route`.
- Programmatic: `useNavigate()`.
- No nested routes; flat structure.

### 7.10 Separation of Concerns

- **Domain**: types, constants, economy/combat/AI logic (no React).
- **Store**: Zustand; game logic in store actions.
- **Components**: UI only; call store actions.
- **Audio**: audioService; called from components/store.

### 7.11 Testability

- Components receive minimal props; most data from stores.
- Domain and store are unit-testable.
- Components can be tested with mock stores.

---

## 8. IMPLEMENTATION STRATEGY

### Phase 1: Foundation (Week 1)

1. **Design tokens** — Finalise theme.css; document in Storybook or similar if used.
2. **Core screens** — Landing, Lobby, Custom, Room (no game logic).
3. **Shared components** — mode-card, buttons, GameRulesForm.
4. **Routing** — All routes wired; AnimatePresence for transitions.

### Phase 2: Match Core (Week 2)

1. **BattleLayer** — PixiJS init, walls, units, impacts.
2. **Resource loop** — ResourceClickField, ResourceMeters, BankButton.
3. **Tick loop** — gameStore tick, resolveArrivingUnits.
4. **Upgrades** — UpgradePanel, UpgradeCard, buyUpgrade.

### Phase 3: Combat & Feedback (Week 3)

1. **Deploy** — DeployBar, TargetSelector, UnitCard.
2. **Feedback** — StealFeedback, ThreatStrip, ScreenShake, Bank transfer FX.
3. **Match End** — MatchEndScreen, stats, wealth chart.

### Phase 4: Polish & Mobile (Week 4)

1. **Overlays** — TutorialModal, MatchPauseOverlay, WorldViewOverlay.
2. **Mobile layout** — Breakpoints, safe areas, touch targets.
3. **Audio** — Integrate audioService; persist mute.

### Parallel Workstreams

- **Design tokens + base components** can run parallel to **domain + store**.
- **BattleLayer** can be developed alongside **HUD components** (mock data initially).
- **Room/Online** can follow **Offline match** once core loop is stable.

### Dependencies

- MatchScreen requires gameStore with startMatch/startMultiplayerMatch.
- MatchEndScreen requires matchEndTime set.
- Room requires matchService (PeerJS).

### Mock Initially

- gameStore: mock players, no tick.
- matchService: mock createRoom/joinRoom for UI testing.

### Stabilise Before Polish

- Tick loop and combat resolution.
- Multiplayer sync (broadcastAction/applyRemoteAction).
- Mobile layout and scroll behaviour.

### Visual Regression

- Screenshot or Percy-style tests for: Landing, Lobby, Match (initial state), Match End.
- Focus on HUD layout and responsive breakpoints.

### Design Debt Risk

- App.css growing too large → split by feature.
- Inline styles (e.g. `--player-color`) → consider data attributes or variants.
- Magic numbers in layout → move to tokens.

---

## 9. QA CHECKLIST FOR UI POLISH

### Spacing Consistency

- [ ] Gaps between mode cards uniform (1.5rem).
- [ ] HUD regions have consistent padding (1rem desktop, 0.5rem mobile).
- [ ] Form sections have consistent gap (1rem).

### Alignment Consistency

- [ ] Centred content aligned across Landing, Lobby, Custom, Room.
- [ ] Meter rows aligned (label width, bar flex, value width).
- [ ] Scoreboard items left-aligned with consistent padding.

### Component State Coverage

- [ ] All buttons: default, hover, tap, disabled.
- [ ] UpgradeCard: affordable, maxed, justPurchased.
- [ ] UnitCard: ready, disabled, onCooldown.
- [ ] BankButton: default, disabled, animating.
- [ ] Target tabs: default, selected.
- [ ] Room: create, join, waiting, joining, error.

### Responsive Behaviour

- [ ] 768px breakpoint: HUD reflow, --hud-inset 0.
- [ ] 400px: smaller click field, single-column upgrades.
- [ ] Safe areas applied on mobile.
- [ ] No horizontal scroll on match screen.

### Typography Consistency

- [ ] Display font (Orbitron) for titles only.
- [ ] Body font (Inter) for all other text.
- [ ] No font-size below 0.65rem.

### Colour Consistency

- [ ] Cyan for primary/ready/secured.
- [ ] Red for danger/threat/lose.
- [ ] Gold for wealth/leader/loose.
- [ ] Purple for supply.

### Visual Hierarchy

- [ ] Primary actions (Play, Bank, Deploy) most prominent.
- [ ] Timer always visible and readable.
- [ ] Threat strip draws attention when active.

### Accessibility

- [ ] All buttons have accessible names (aria-label or visible text).
- [ ] Focus visible (border or outline).
- [ ] Colour not sole indicator (leader has ★).
- [ ] Touch targets ≥ 44×44px on mobile.

### Interaction Smoothness

- [ ] No jank on click/bank/deploy.
- [ ] Animations complete without cutoff.
- [ ] Route transitions feel intentional.

### Animation Quality

- [ ] Float numbers don't overlap excessively.
- [ ] Screen shake not nauseating.
- [ ] Modal enter/exit smooth.

### Performance Risk

- [ ] BattleLayer resize handled.
- [ ] Tick loop not blocked by React renders.
- [ ] AnimatePresence cleanup on unmount.

### Implementation Drift

- [ ] CSS class names match component usage.
- [ ] No orphaned styles.
- [ ] Theme tokens used consistently (no hardcoded colours where token exists).

---

## 10. FINAL RECOMMENDATION

### Best UI Implementation Approach

- **Keep** the current structure: feature-based folders, Zustand stores, Framer Motion, single App.css.
- **Improve** by: (1) splitting App.css into feature files, (2) extracting a small set of reusable UI primitives (Button, Card, Input) with explicit variants, (3) adding reduced-motion support.
- **Avoid** over-abstracting: the game has specific needs; generic component libraries may not fit.

### Key Technical Decisions

1. **Framer Motion** — Appropriate for this product; provides enter/exit, gestures, and layout animations without extra libraries.
2. **PixiJS for battle** — Correct choice for canvas-based units and impacts; keep React and PixiJS concerns separate (store drives state; BattleLayer renders).
3. **Zustand** — Lightweight; gameStore and uiStore separation is clear.
4. **CSS custom properties** — Sufficient for theming; no need for CSS-in-JS unless theming complexity grows.
5. **Single App.css** — Works at current scale; split when it exceeds ~800 lines or becomes hard to navigate.

### Biggest UI Risks

1. **Mobile HUD** — Dense information in a scrollable strip; risk of feeling cramped or hard to read. Test on real devices.
2. **BattleLayer + HUD overlap** — Ensure pointer-events and z-index prevent misclicks.
3. **Multiplayer sync** — UI must reflect remote state; ensure no flicker or inconsistent state on applyRemoteAction.
4. **Performance** — 60fps tick + React + PixiJS; profile on low-end devices.

### Highest-Value Next Steps

1. **Implement reduced-motion** — `prefers-reduced-motion` media query to shorten or disable animations.
2. **Split App.css** — Create `landing.css`, `lobby.css`, `match.css`, `match-end.css` and import in App or per-screen.
3. **Add focus-visible styles** — Explicit focus ring for keyboard users.
4. **Document component variants** — Add a simple Storybook or docs page for Button, Card, UpgradeCard, UnitCard.
5. **Visual regression tests** — At least for critical screens (Landing, Lobby, Match, Match End).

---

*Document version: 1.0 — Generated for Click War UI implementation planning.*
