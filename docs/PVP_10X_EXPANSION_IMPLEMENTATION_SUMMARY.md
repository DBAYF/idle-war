# PvP Plan 10x Expansion — Implementation Summary

This document summarizes what was implemented for the **PvP and Polish Master Plan — 10x Expansion (Ten Deep-Dives)**. The plan file was not edited; implementation follows the attached plan specification.

---

## Expansion 1: configSync protocol and lifecycle

- **matchService.ts**
  - Extended `GameAction` with:
    - `| { type: 'configSync'; matchConfig: MatchConfig; senderId: string }`
- **RoomLobbyScreen (host)**
  - On peer join (`onPeerJoined`): sends `broadcastAction({ type: 'configSync', matchConfig: validatedConfig, senderId: 'host' })` using current host config (via ref).
  - On config change: debounced (400 ms) `configSync` when `peerCount >= 1`; uses `hostConfigRef` so the latest rules are sent.
- **RoomLobbyScreen (joiner)**
  - In `onAction`, if `action.type === 'configSync'` and `senderId === 'host'`, sets `receivedConfig` state.
  - When `receivedConfig == null`, joiner sees placeholder via **SetupSummaryReadOnly** (Expansion 4); when non-null, read-only summary is shown.
- **Rematch return**
  - When re-entering room after Rematch, host sends one `configSync` with current (default) config so joiner sees rules.

---

## Expansion 2: Rematch connection state and reconnection UX

- **No disconnect on navigate to match**
  - Removed `useEffect` cleanup that called `disconnect()` on RoomLobbyScreen unmount. `disconnect()` is only called on explicit **Leave room** / **Return to lobby** (e.g. `handleBack`).
- **gameStore**
  - Added `lastRoomId: string | null`, `wasHost: boolean`, plus `setLastRoomId`, `setWasHost`, `clearLastRoom`. Cleared in `reset()` and when leaving room/lobby (handleBack, Return to Lobby, Lobby button).
- **When entering match**
  - Host: in `handleStartMatch`, before `startMultiplayerMatch` and `navigate('/match')`, calls `setLastRoomId(roomId)` and `setWasHost(true)`.
  - Joiner: in join-room `onAction` when `action.type === 'start'`, calls `setLastRoomId(joinerRoomIdRef.current || code)` and `setWasHost(false)` before starting match and navigating.
- **Rematch**
  - Match end: **Rematch** navigates to `/room/{lastRoomId}` (or `/room` if `lastRoomId` is null). **Lobby** clears last room and resets, then navigates to `/lobby`.
- **Room re-entry (rematch return)**
  - When RoomLobbyScreen mounts with `paramRoomId` and `lastRoomId === paramRoomId` and `getConnections().length > 0`, treats as rematch return: `setCallbacks` re-registers handlers, sets `roomState = 'waiting'`, restores `roomId`, `isHostUser` from `wasHost`, `peerCount` from connections. No new create/join.
  - **matchService**: added `setCallbacks(cbs)` so callbacks can be re-registered without creating/joining again.
- **Connection ended**
  - If `lastRoomId === paramRoomId` but `getConnections().length === 0`, shows “Connection ended. Leave room and create or join a new room.” with **Leave room** button.

---

## Expansion 3: Room lifecycle and host/joiner exit

- **Joiner when host leaves (waiting room)**
  - Added `hostLeft` state. When joiner is in waiting and `onPeerLeft` fires, sets `hostLeft = true`.
  - Renders: “Host left the room.” and **Return to lobby** button; handler calls `clearLastRoom()`, `disconnect()`, `navigate('/lobby', { replace: true })`.
- **Host leaves / host closes tab**
  - Same as above from joiner’s perspective: connection closes, `onPeerLeft` runs, joiner sees “Host left the room.” and Return to lobby.
- **Leave room**
  - `handleBack`: `clearLastRoom()`, `disconnect()`, `navigate('/lobby')`.

---

## Expansion 4: Joiner read-only rules

- **New component**
  - `src/features/setup/SetupSummaryReadOnly.tsx`
  - Props: `config: MatchConfig | null`, optional `className`.
  - `config === null`: renders “Waiting for host to set rules…” with `aria-live="polite"`.
  - `config` non-null: same summary format as SetupSummary for 1v1 (duration, win goal, supply preset; no AI). Uses `SUPPLY_SCARCITY_PRESETS` and same styling as `setup-summary`.
- **RoomLobbyScreen (joiner)**
  - Renders `<SetupSummaryReadOnly config={receivedConfig} />` in the waiting view.

---

## Expansion 5: Copy feedback and clipboard

- **Room (host)**
  - Two buttons: **Copy link** (full URL) and **Copy code** (room code only). Same 2 s feedback: button label switches to “Copied!” then reverts.
  - `copyToClipboard(text, kind)` with `try/catch`; on failure sets error: “Copy failed; please copy the code manually.”
  - Screen reader: visually hidden live region (`sr-only` + `aria-live="polite"`) with “Link copied to clipboard.” / “Code copied to clipboard.” when `copyFeedback` is set.
  - Buttons have `aria-label="Copy link"` and `aria-label="Copy code"`.

---

## Expansion 6: Disconnect and full state cleanup

- **DisconnectOverlay — Return to Lobby**
  - Handler uses existing `reset()`: clears match state, sets `peerDisconnected: false` and `lastRoomId`/`wasHost` via `initialState` in reset, and calls `disconnect()` when `isMultiplayer`. Then `navigate('/lobby', { replace: true })`.
  - Added copy: “You can return to the lobby and create or join a new room.”
  - Focus: when overlay is shown, focus moves to **Return to Lobby** button (`useEffect` + ref). Added `aria-label="Return to lobby"`, `role="alert"`, `aria-live="assertive"` on overlay.

---

## Expansion 7: Match-end Rematch persistence and buttons

- **MatchEndScreen**
  - **PvP:** Primary = **Rematch**, secondary = **Lobby**.
    - Rematch: `navigate(lastRoomId ? \`/room/${lastRoomId}\` : '/room')` (empty room state if no `lastRoomId`).
    - Lobby: `clearLastRoom()`, `reset()`, `navigate('/lobby', { replace: true })`.
  - **Offline:** Single **Lobby** button (same clear + reset + navigate).
  - Primary button gets ref and is focused on mount. Buttons have `aria-label` (“Rematch with same opponent”, “Back to lobby”).

---

## Expansion 8: Room and start flow error handling

- **Join failure**
  - `joinRoom` reject or timeout: catch sets error message (“Couldn’t connect. Check the code or try again.” or “Connection timed out. Check the code and try again.”), `roomState` back to `'join'`; user can change code and click Join again.
- **Join timeout**
  - `Promise.race(joinRoom(...), timeout(15s))`; on timeout, same error and retry path.
- **Room code**
  - Join button disabled when code length &lt; 4; placeholder “Room code (e.g. ABC123)”. Input has `aria-label="Room code"`.

---

## Expansion 9: Accessibility (room and match end)

- **App.css**
  - Global focus-visible: `button:focus-visible, input:focus-visible, [tabindex="0"]:focus-visible { outline: 2px solid var(--accent-cyan); outline-offset: 2px; }`.
  - `.sr-only` for visually hidden text (clip, size 1px, etc.).
- **Room**
  - Tab order follows DOM; no positive `tabIndex`. Leave room, Copy link/code, Start Match, room code input are reachable and labeled.
  - Live/status: `room-status` has `aria-live="polite"`; SetupSummaryReadOnly and copy feedback use `aria-live` / sr-only as above.
  - Labels: room code input, Copy link, Copy code, Start Match, Leave room have `aria-label` or equivalent.
- **Disconnect overlay**
  - Focus moved to **Return to Lobby** when overlay opens; `aria-label`, `role="alert"`, `aria-live="assertive"`.
- **Match end**
  - Primary button (Rematch or Lobby) focused on mount; Rematch/Lobby buttons have `aria-label`.

---

## Expansion 10: Loading and waiting states

- **Joiner (joining)**
  - When `roomState === 'joining'`: “Connecting…” in subtitle; spinner (`queue-spinner` + `room-joining-spinner`); `aria-live="polite"`, `aria-busy="true"`.
  - Join and code input are not shown during joining (we switch to room view with roomId).
- **Host Start**
  - `startInProgress` state set on click; Start button disabled when `startInProgress` or invalid or `peerCount < 1` to prevent double-click. No separate “Starting…” label; navigate happens right after.
- **Rematch / match screen**
  - No extra loading state for Rematch (navigation only). No “Waiting for opponent to be ready” on match screen.

---

## Files touched

| File | Changes |
|------|--------|
| `src/shared/network/matchService.ts` | `configSync` in `GameAction`; `setCallbacks()` for rematch return. |
| `src/store/gameStore.ts` | `lastRoomId`, `wasHost`, `setLastRoomId`, `setWasHost`, `clearLastRoom`; reset clears them. |
| `src/features/setup/SetupSummaryReadOnly.tsx` | **New**: read-only rules for joiner (null = placeholder). |
| `src/features/lobby/RoomLobbyScreen.tsx` | configSync send/receive, debounce, rematch return, no disconnect on unmount, copy feedback, hostLeft, connectionEnded, join timeout, Start double-click prevention, a11y. |
| `src/features/game/components/overlays/DisconnectOverlay.tsx` | Extra copy, focus on button, aria and role. |
| `src/features/game/MatchEndScreen.tsx` | Rematch (primary) / Lobby (secondary) for PvP; single Lobby for offline; lastRoomId navigation; clearLastRoom on Lobby; focus and aria-labels. |
| `src/App.css` | `:focus-visible` and `.sr-only`. |

---

## Completion criteria (by expansion)

- **1** — configSync type; host sends on peer join and debounced config change; joiner empty state and read-only summary; last-one-wins for ordering.
- **2** — No disconnect on navigate to match; lastRoomId/wasHost stored when entering match and cleared on Lobby / Return to lobby / Leave room; Rematch → `/room/{lastRoomId}`; rematch return and “Connection ended” with Leave room.
- **3** — Joiner sees “Host left the room.” and Return to lobby when host disconnects in waiting room.
- **4** — SetupSummaryReadOnly with `config | null`; null = placeholder; non-null = 1v1 summary.
- **5** — 2 s “Copied!” feedback; try/catch and fallback message; Copy link + Copy code; a11y live region and aria-labels.
- **6** — Return to Lobby runs full cleanup (reset + disconnect + navigate); lastRoomId cleared; extra copy and focus.
- **7** — lastRoomId/wasHost set when entering PvP match; Rematch primary, Lobby secondary; Rematch → `/room/{lastRoomId}` or `/room`; offline single Lobby.
- **8** — Join failure and timeout copy and retry; room code validation.
- **9** — focus-visible, sr-only, tab order, live regions, focus on overlay and match-end primary, labels.
- **10** — Joining spinner and 15 s timeout; Start disabled on click; documented behaviour.

---

*Summary generated after implementing the PvP Plan 10x Expansion. Plan file was not modified.*
