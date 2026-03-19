# Mobile Compatibility – Implementation Summary

## Overview

The game is now fully mobile compatible. The main fix: **the battle stage is no longer blocked by the HUD**. On mobile, the HUD is moved below the battle area instead of overlaying it.

---

## Changes Made

### 1. Layout Restructure (Mobile)

**Before:** HUD elements (meters, click, bank, deploy, upgrades, scoreboard) overlay the battle area on all screen sizes, blocking the game on mobile.

**After (≤768px or ≤600px height):**
- **Battle area**: Takes the top portion of the screen (flex: 1)
- **HUD bar**: Fixed at the bottom, below the battle area
- HUD is scrollable (max-height: 45vh) when content overflows
- No overlay; battle area stays fully visible

### 2. Viewport & Meta Tags (`index.html`)

- `viewport-fit=cover` for notched devices
- `theme-color` for browser chrome
- `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` for iOS

### 3. Touch Optimizations (`theme.css`)

- `-webkit-tap-highlight-color: transparent` to remove tap flash
- `touch-action: manipulation` to remove 300ms tap delay
- `min-height: 100dvh` for correct mobile viewport height
- `user-select: none` on match screen to avoid accidental text selection

### 4. Safe Area Insets

- Match screen: `env(safe-area-inset-*)` padding for notches and home indicators
- Settings button, world toggle, threat strip: positioned with safe-area
- HUD bar: `padding-bottom: max(0.5rem, env(safe-area-inset-bottom))`
- Landing/lobby: safe-area padding on mobile

### 5. Mobile HUD Styling

| Element | Mobile Adjustments |
|--------|--------------------|
| Resource meters | Full width, smaller padding, compact labels |
| Click field | 100×100px (80×80 on very small screens), min 44px touch target |
| Bank button | Min-height 44px |
| Deploy bar | Compact padding, wrap target tabs, smaller unit cards |
| Upgrade panel | 2-column grid (1-col on ≤400px) |
| Scoreboard | Compact padding |
| Unit cards | Min-height 44px, wrap layout |

### 6. Breakpoints

- **Primary:** `max-width: 768px` or `max-height: 600px`
- **Extra small:** `max-width: 400px` (tighter layout)

---

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Viewport meta, theme-color, PWA meta |
| `src/shared/theme/theme.css` | Touch, dvh, user-select |
| `src/App.css` | Mobile layout block (~200 lines), safe-area, compact HUD |

---

## Result

- Battle area is always visible on mobile
- HUD is below the battle area and scrollable
- Touch targets are at least 44px
- Safe areas work on notched devices
- No 300ms tap delay
- Layout works on landscape and portrait
