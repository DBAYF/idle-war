# Click War

A real-time competitive web game where players build a personal economy through clicking and automation, then convert that economy into pressure by sending animated units against rivals.

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Zustand** for game state
- **Framer Motion** for UI animations
- **PixiJS** for the battlefield render layer
- **React Router** for navigation

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Game Flow

1. **Landing** → **Lobby** → Choose 1v1 or 2v2
2. **Match** (5 min): Click for coins, buy upgrades, deploy units, bank secured wealth
3. **Win**: First to 1000 secured wealth wins

## Core Features

- **Economy**: Loose coins (vulnerable) vs secured wealth (victory progress)
- **Supply**: Combat resource that regenerates over time
- **Units**: Runner (fast, steals), Bruiser (slow, damages wall), Saboteur (debuffs)
- **Upgrades**: Click power, auto miner, supply gen, bank shield
- **World View**: Toggle to see all bases and troop movement

## Project Structure

```
src/
├── domain/          # Economy, combat, AI logic
├── store/           # Zustand game & UI state
├── features/
│   ├── landing/
│   ├── lobby/
│   └── game/        # Match, HUD, upgrades, deploy, battle
├── shared/           # Theme, audio
└── App.tsx
```
