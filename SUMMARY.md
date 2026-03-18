# Click War MVP – Build Summary

## What Was Done This Session

### 1. Account Button (Landing Screen)
- Added an **Account** button to the landing screen actions (placeholder for future auth)
- Styled as a ghost button (`btn-ghost`) for subtle emphasis
- Tooltip: "Account (coming soon)"

### 2. Pause/Settings Overlay During Match
- Replaced the inline audio toggle with a **gear icon** that opens a settings overlay
- **MatchPauseOverlay** component:
  - Modal overlay with backdrop click-to-close
  - Sound toggle (mute/unmute)
  - **Resume** button to close
  - **Leave Match** button to return to lobby (resets game state)
- Spring animation for panel open/close
- New UI state: `matchPauseOpen` in `uiStore`

### 3. Upgrade Purchase Pulse
- **UpgradeCard** now shows a purchase confirmation pulse when an upgrade is bought
- Scale animation: `1 → 1.08 → 1` over 400ms
- Temporary glow (`box-shadow`) on the card during the pulse
- Uses `justPurchased` state with 400ms timeout

### 4. Cooldown Radial on Unit Cards
- Replaced the horizontal `scaleX` cooldown overlay with an **SVG radial cooldown**
- Circular progress indicator showing remaining cooldown time
- Cyan stroke that shrinks as cooldown depletes
- `useEffect` + `setInterval` to re-render every 100ms during cooldown for smooth updates

### 5. Key Moments on Match End Screen
- Added **biggest single steal** to `MatchStats` in the game store
- Tracked when units arrive and steal coins
- **Key moment** section on the match end screen when the player had at least one steal
- Shows: "Biggest single steal: X coins" in a highlighted card

### 6. Persistent Audio Preference
- **Zustand persist** middleware for `uiStore`
- `audioMuted` is persisted to `localStorage` under `clickwar-ui`
- `onRehydrateStorage` callback syncs `setAudioEnabled()` when the store rehydrates
- Mute preference survives page reloads

### 7. CSS Additions
- `.btn-ghost` – ghost-style button for the Account action
- `.match-pause-overlay`, `.match-pause-panel`, `.match-pause-row`, `.match-pause-toggle`, `.match-pause-actions`
- `.btn-leave` – red outlined button for leaving the match
- `.cooldown-radial`, `.cooldown-svg` – radial cooldown overlay
- `.upgrade-card.purchase-pulse` – glow during purchase
- `.key-moments`, `.key-moments-title`, `.key-moment`, `.km-label`, `.km-val`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/store/uiStore.ts` | Persist middleware, `matchPauseOpen`, `setMatchPauseOpen`, `onRehydrateStorage` |
| `src/store/gameStore.ts` | `biggestSingleSteal` in `MatchStats`, tracking in `resolveArrivingUnits` |
| `src/features/landing/LandingScreen.tsx` | Account button |
| `src/features/game/MatchScreen.tsx` | Gear button, `MatchPauseOverlay` |
| `src/features/game/components/overlays/MatchPauseOverlay.tsx` | **New** – pause/settings modal |
| `src/features/game/components/upgrades/UpgradeCard.tsx` | Purchase pulse animation |
| `src/features/game/components/deploy/UnitCard.tsx` | Radial cooldown SVG, cooldown tick effect |
| `src/features/game/MatchEndScreen.tsx` | Key moments section |
| `src/App.css` | New styles for all above |

---

## How to Run

```bash
npm run dev
```

Then open http://localhost:5173.
