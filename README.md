# Click War

A real-time competitive web game where players build a personal economy through clicking and automation, then convert that economy into pressure by sending animated units against rivals.

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Zustand** for game state
- **Framer Motion** for UI animations
- **PixiJS** for the battlefield render layer
- **React Router** (hash routing) for navigation
- **PeerJS** for online 1v1 (default broker: `0.peerjs.com`)

## Requirements

- **Node.js 20.x LTS** (see `.nvmrc`; `package.json` has `engines`)

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

### Other commands

| Command | Description |
|--------|-------------|
| `npm run build` | Typecheck + production bundle (`dist/`) |
| `npm run preview` | Serve `dist/` locally |
| `npm run test` | Vitest |
| `npm run validate-content` | Validate `content/*.json` |

## Importing into Lovable (or any Git host)

1. Push this repo to **GitHub** (or GitLab, etc.).
2. In **Lovable**, choose **Import project** / connect the repository.
3. Use install command: `npm install` and dev command: `npm run dev` (default for Vite).
4. **No `.env` is required** for local dev; PeerJS uses the public broker in code.

For AI-assisted context, see **`LOVABLE.md`** (entry points, routing, multiplayer notes).

## Game Flow

1. **Landing** → **Lobby** → Custom game, queue, or **Online** (create/join room)
2. **Match**: Click for coins, buy upgrades, deploy units, bank secured wealth
3. **Win**: First to the configured secured-wealth threshold wins

## Core Features

- **Economy**: Loose coins (vulnerable) vs secured wealth (victory progress)
- **Supply**: Combat resource that regenerates over time
- **Units**: Runner, Bruiser, Saboteur, Defender (see `content/units.json`)
- **Upgrades**: Click power, auto miner, supply gen, bank shield (see `content/upgrades.json`)
- **World View**: Toggle to see all bases and troop movement
- **PvP**: Room codes, shared rules sync, rematch flow (see `docs/PVP_AND_POLISH_MASTER_PLAN.md`)

## Project Structure

```
src/
├── domain/          # Economy, combat, AI, content validation
├── store/           # Zustand game & UI state
├── features/
│   ├── landing/
│   ├── lobby/       # Custom setup, room, tutorial
│   ├── matchmaking/
│   └── game/        # Match, HUD, deploy, battle, overlays
├── shared/          # Audio, network (PeerJS), theme
└── App.tsx
content/             # units.json, upgrades.json (validated at load)
docs/                # Design & implementation notes
```

## Deploy

- **`vercel.json`** is included for static hosting; build output is **`dist/`**.
- App uses **hash URLs** (`/#/...`); configure SPA fallback to `index.html`.

## License

Private project (`"private": true` in `package.json`).
