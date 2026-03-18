# Click War → Lovable Migration Guide

## Overview

This document covers:
1. **How to migrate** the Click War project to Lovable.dev
2. **MVP gap analysis** – what’s done vs. what’s left from the design
3. **Lovable compatibility** – stack and structure notes

---

## Part 1: Migrating to Lovable

Lovable does **not** support importing an existing repo directly. Use the GitHub repo swap flow:

### Prerequisites

- [Lovable.dev](https://lovable.dev) account  
- [GitHub](https://github.com) account  
- Git installed locally  

### Step 1: Prepare the project

```bash
cd "/Users/ayf/click war"

# Ensure clean state (no node_modules, dist in git)
# .gitignore already excludes these

# Initialize git if not already
git init
git add .
git commit -m "Initial Click War MVP"
```

### Step 2: Create a Lovable starter project

1. Go to [lovable.dev](https://lovable.dev) and sign in.
2. Create a new project with a prompt like:  
   `Create a blank React + Vite + TypeScript landing page`
3. Let Lovable generate the starter.
4. Rename the project to **Click War** (or similar).

### Step 3: Connect Lovable to GitHub

1. In the project: **Settings → Connectors → GitHub**
2. Click **Connect GitHub** and authorize.
3. Install the Lovable GitHub App on your account/org.
4. Click **Connect project** – Lovable creates a new repo (e.g. `username/click-war`).

### Step 4: Clone the Lovable repo and swap in your code

```bash
# Clone the repo Lovable created
git clone https://github.com/YOUR_USERNAME/click-war.git click-war-lovable
cd click-war-lovable

# Remove Lovable's generated files (keep .git)
# On macOS/Linux:
find . -maxdepth 1 ! -name '.git' ! -name '.' ! -name '..' -exec rm -rf {} +

# Copy your Click War project (excluding node_modules, dist)
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.git' \
  "/Users/ayf/click war/" .

# Or manually copy all source files into this folder
```

### Step 5: Commit and push

```bash
git add .
git commit -m "Import Click War MVP codebase"
git push origin main
```

### Step 6: Sync in Lovable

1. Refresh the Lovable project.
2. Lovable syncs from GitHub; your code should appear.
3. Run `npm install` in Lovable’s environment (or via deploy) to resolve dependencies.

### Compatibility notes

| Item | Status |
|------|--------|
| **React + Vite** | ✅ Lovable supports this |
| **TypeScript** | ✅ Supported |
| **Custom CSS** | ✅ Works (Lovable often uses Tailwind; your custom CSS is fine) |
| **PixiJS** | ⚠️ Canvas/WebGL – may need testing in Lovable’s preview |
| **Zustand** | ✅ Standard React state |
| **Framer Motion** | ✅ Common in Lovable projects |
| **react-router-dom** | ✅ Supported |

---

## Part 2: MVP Gap Analysis

### ✅ Implemented

| Design item | Status |
|-------------|--------|
| Landing screen (logo, play, guest, account, settings) | ✅ |
| Main lobby (quick match, tutorial) | ✅ |
| Queue / Match Found screen | ✅ |
| Main match screen (economy, deploy, upgrades, timer) | ✅ |
| Match end screen (winner, stats, wealth chart, key moments) | ✅ |
| Click economy | ✅ |
| Loose vs secured wealth + banking | ✅ |
| Supply resource | ✅ |
| Upgrades (click power, auto miner, supply gen, bank shield) | ✅ |
| Units: Runner, Bruiser, Saboteur | ✅ |
| Target selector | ✅ |
| PixiJS battlefield (walls, units, collision bursts) | ✅ |
| World view toggle | ✅ |
| Wall health meter | ✅ |
| Threat strip / incoming warning | ✅ |
| Scoreboard strip | ✅ |
| Pause/settings overlay | ✅ |
| Audio feedback (click, upgrade, deploy, impact, etc.) | ✅ |
| Anti-snowball (diminishing returns, leader pressure, repeated target penalty, catch-up) | ✅ |
| 1v1, 2v2, 4-player FFA modes | ✅ |
| 5-minute matches | ✅ |
| Win by secured wealth | ✅ |

### ❌ Not yet implemented

| Design item | Priority | Notes |
|-------------|----------|------|
| **Login / Guest entry screen** | Medium | Landing has “Guest Play” → lobby; no separate login flow |
| **Private room** | Low | Lobby has quick match only |
| **Defender unit** | Medium | In constants, not in deploy bar; needs “stays home” logic |
| **Saboteur debuff** | Medium | `saboteurDuration` exists but no temporary reduction of enemy generation/banking |
| **10-minute match mode** | Low | Optional future mode |
| **Haptics (mobile)** | Low | Optional vibration where supported |
| **Real PvP networking** | High (post-MVP) | Currently AI opponents only |
| **Profile summary** | Low | Lobby |
| **Rematch vote** | Low | Match end has Rematch button; no vote flow |

### 🔶 Partially implemented

| Design item | Gap |
|-------------|-----|
| **Account button** | Placeholder only; no auth |
| **Animated background battlefield** | Landing has particles, not full battlefield |
| **Unit spawn at base gate** | Units appear; no explicit gate/launcher animation |
| **Banking transfer animation** | Banking works; no “loose → vault” visual |

---

## Part 3: Remaining Components to Wire Up

### High priority (core MVP)

1. **Saboteur debuff**  
   - When Saboteur reaches target, apply a temporary debuff to the target:
     - Reduce `autoIncome` and/or `clickValue` for `saboteurDuration` ms
   - Add `saboteurDebuffUntil: number` (or similar) to player economy state

2. **Defender unit** (optional for MVP)  
   - Add to deploy bar  
   - `speed: 0` → does not travel; stays at base  
   - Intercepts incoming units or reduces damage/steal when present  
   - Requires combat logic changes

### Medium priority (polish)

3. **Login / Guest entry screen**  
   - Separate route (e.g. `/login`)  
   - Guest play → create anonymous session → lobby  
   - Account sign-in → future auth integration  

4. **Private room**  
   - Lobby: “Create room” → room code  
   - “Join room” → enter code  
   - Needs matchmaking/room state

5. **Banking transfer animation**  
   - Visual: coins moving from loose area to vault  
   - Framer Motion or CSS animation

### Low priority (post-MVP)

6. **10-minute mode** – config option  
7. **Haptics** – `navigator.vibrate()` where supported  
8. **Profile summary** – placeholder in lobby  
9. **Rematch vote** – 2v2/FFA: all players must agree  

---

## Part 4: Suggested Next Steps

1. **Migrate to Lovable** using the GitHub swap flow above.  
2. **Verify build and preview** in Lovable (especially PixiJS).  
3. **Implement Saboteur debuff** – highest-impact missing mechanic.  
4. **Add Defender** if scope allows – improves unit variety.  
5. **Add Login/Guest screen** – improves onboarding.  
6. **Plan real PvP** – Firebase or socket backend for live matches.

---

## File structure reference

```
src/
├── domain/           # types, constants, economy, combat, ai
├── store/            # gameStore, uiStore
├── features/
│   ├── landing/      # LandingScreen
│   ├── lobby/       # LobbyScreen, TutorialModal
│   ├── matchmaking/ # QueueScreen
│   └── game/
│       ├── MatchScreen, MatchEndScreen
│       └── components/
│           ├── hud/       # ResourceClickField, ResourceMeters, BankButton, etc.
│           ├── upgrades/  # UpgradePanel, UpgradeCard
│           ├── deploy/    # DeployBar, UnitCard, TargetSelector
│           ├── battle/    # BattleLayer (PixiJS)
│           └── overlays/  # WorldViewOverlay, MatchPauseOverlay, ScreenShake
├── shared/
│   ├── theme/       # theme.css
│   └── audio/       # audioService
├── App.tsx, App.css
└── main.tsx
```

---

## Quick commands

```bash
# Local dev
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```
