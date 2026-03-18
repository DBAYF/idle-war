# Radial Layout, HUD Repositioning, and Supply Nerf – Implementation Summary

## Overview

All three parts of the plan have been implemented:

1. **Radial player layout** – Players arranged in a circle in both BattleLayer and WorldViewOverlay
2. **HUD repositioning** – HUD moved around the playable area; upgrade panel moved to bottom-right
3. **Supply nerf** – Supply made scarcer via lower rates, cap, and higher unit costs

---

## 1. Radial Player Layout

### BattleLayer.tsx
- Added `getRadialPos(i)` using polar coordinates:
  - Center: `(baseWidth/2, baseHeight/2)`
  - Radius: `0.35 * Math.min(baseWidth, baseHeight)`
  - Angle: `(2π * i) / playerCount - π/2` (starts from top)
- Walls drawn at radial positions instead of a horizontal line
- Unit paths interpolate between owner and target radial positions
- Impact bursts use the target’s radial position

### WorldViewOverlay.tsx
- Base positions use the same radial formula (radius 35% of container)
- Unit-in-flight interpolation uses radial start/end positions
- World units use `transform: translate(-50%, -50%)` for correct centering

---

## 2. HUD Repositioning

### App.css
- Added `--hud-inset: 14%` for the central playable region
- **Battle layer**: `inset: var(--hud-inset)` so the battle area is inset from all edges
- **hud-top**: More compact (top: 0.75rem, smaller resource-meters padding, smaller timer)
- **hud-right** (UpgradePanel): Moved from `top: 5rem; right: 1.5rem` to `bottom: 1rem; right: 1rem`
- **hud-left**: Left adjusted to `1rem` for consistency
- **Resource meters**: Padding reduced (0.5rem 1rem), min-width 240px, timer font 1.25rem

---

## 3. Supply Nerf

### constants.ts
- `BASE_SUPPLY_RATE`: 0.5 → **0.25**
- Added `SUPPLY_CAP = 80` (was 100)
- Supply Generator `effectPerLevel`: 0.15 → **0.08**
- Unit supply costs:
  - Runner: 2 → **3**
  - Bruiser: 4 → **5**
  - Saboteur: 3 → **4**

### economy.ts
- Initial supply: 10 → **5**

### gameStore.ts
- Supply cap uses `SUPPLY_CAP` instead of hardcoded 100
- Supply rate fallback uses `BASE_SUPPLY_RATE` instead of 0.5

### ResourceMeters.tsx
- Supply bar width uses `(supply / SUPPLY_CAP) * 100` for correct fill

### UpgradeCard.tsx
- Supply Generator tooltip updated to “+0.08 supply rate per level”

---

## Files Modified

| File | Changes |
|------|---------|
| `src/features/game/components/battle/BattleLayer.tsx` | Radial wall positions, unit paths, impact bursts |
| `src/features/game/components/overlays/WorldViewOverlay.tsx` | Radial base positions and unit interpolation |
| `src/App.css` | HUD positioning, `--hud-inset`, compact top bar |
| `src/domain/constants.ts` | Supply constants, unit costs, Supply Generator effect |
| `src/domain/economy.ts` | Initial supply 5 |
| `src/store/gameStore.ts` | Supply cap, supply rate fallback |
| `src/features/game/components/hud/ResourceMeters.tsx` | Supply bar uses SUPPLY_CAP |
| `src/features/game/components/upgrades/UpgradeCard.tsx` | Supply Generator tooltip |

---

## Result

- **Radial layout**: Players arranged in a circle; clearer for 3–4 players and less overlap with HUD
- **HUD**: Upgrade panel at bottom-right; HUD frames the playable area instead of covering it
- **Supply**: Lower base rate, lower initial supply, lower cap (80), weaker Supply Generator, and higher unit supply costs
