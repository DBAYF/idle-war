# Lovable / AI import — quick context

Use this file when the project is opened in **Lovable** or another AI-assisted IDE.

## What this is

**Click War** — a real-time competitive browser game (economy → units → pressure).  
Stack: **React 19**, **TypeScript**, **Vite 8**, **Zustand**, **PixiJS** (battle layer), **Framer Motion**, **React Router** (hash routing), **PeerJS** for online 1v1.

## Commands (always work from repo root)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # must pass before shipping (CI runs this)
npm run test     # Vitest (CI runs this)
npm run lint     # ESLint — optional locally; some legacy rules may warn
```

**Node:** use **20.x LTS** (see `.nvmrc`). `package.json` has an `engines` field.

## Entry points

| Area | Path |
|------|------|
| App shell & routes | `src/App.tsx` |
| Game state & ticks | `src/store/gameStore.ts` |
| Domain rules (economy, combat, AI) | `src/domain/` |
| Screens | `src/features/landing/`, `lobby/`, `matchmaking/`, `game/` |
| P2P | `src/shared/network/matchService.ts` |
| Content (units/upgrades JSON + validation) | `content/`, `src/domain/loadContent.ts`, `validateContent.ts` |
| Design docs | `docs/` (e.g. `PVP_AND_POLISH_MASTER_PLAN.md`) |

## Routing

Uses **HashRouter** (`/#/lobby`, `/#/match`, `/#/room/:roomId`). Room share links must include the hash.

## Multiplayer (PeerJS)

- Default broker: `0.peerjs.com` (see `matchService.ts`).
- No API keys in repo; no `.env` required for local dev.
- If you change broker/host, document it in README.

## Tests

- `npm run test` — full Vitest suite.
- `npm run validate-content` — JSON content schema tests.

## Things to avoid

- Don’t commit `node_modules/`, `dist/`, or `.env*` (see `.gitignore`).
- Large refactors: keep `domain/` pure where possible; UI in `features/`.

## Deploy

- `vercel.json` present for static hosting; build output is `dist/`.
