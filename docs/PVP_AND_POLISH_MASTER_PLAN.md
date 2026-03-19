# PvP and Polish — Master Plan

One consolidated plan to **improve the PvP player experience significantly** and to **complete all remaining polish, setup, and quality work** from existing plans. CPU/AI work is out of scope.

---

## 1. Intent and scope

### Goals

1. **PvP first:** Make playing against another human feel clear, fair, and polished (room flow, rules visibility, rematch, disconnect handling, match-end experience).
2. **Polish:** Address all remaining setup-layer, UI, accessibility, and QA items from GAME_SETUP_LAYER_PLAN, UI_IMPLEMENTATION_EXPLORATION, IMPLEMENTATION_STATUS_ANALYSIS, GAME_ENGINE_EXPLORATION, and LOVABLE_MIGRATION.
3. **Single roadmap:** One place to see what to build, in what order, with clear completion criteria.

### Out of scope (explicit)

- Any CPU/AI behaviour, difficulty tuning, or bot UX.
- Full backend authority, server-authoritative simulation, or matchmaking service.
- 2v2/FFA **online** (deferred; structure should allow adding later).
- Full campaign, presets/saved setups, map selection, mutators, ranked/casual.
- ML, replay system, or full Storybook.

---

## 2. Current PvP state (brief)

- **Flow:** Lobby → Online → Create Room or Join (code/link) → Waiting → Host sets rules and starts → Both enter match. Joiner receives `matchConfig` in `start` action; both use same config in match.
- **Gaps:** Joiner does not see host’s rules before start. Rematch only returns to lobby (no “same room / same rules” path). Room code/link and “waiting” states could be clearer. No PvP-specific match-end copy or rematch-with-opponent. Disconnect overlay exists but could be more actionable.

---

## 3. Priority classification

| Tier | Content | Why |
|------|--------|-----|
| **P0 — PvP critical** | Joiner sees rules; room UX (code, link, waiting); rematch-with-opponent (or clear “back to room”); disconnect clarity | Core PvP trust and flow. |
| **P1 — PvP polish** | Match-end PvP messaging; optional “opponent acted” cue; copy-link prominence; host/joiner labels | Makes PvP feel finished. |
| **P2 — Setup & validation** | Helper text, accessibility (labels, aria, focus), edge cases (duration/win goal), regression pass | From GAME_SETUP_LAYER_PLAN Phase 5. |
| **P3 — UI polish** | Reduced-motion, focus-visible, split App.css, QA checklist (spacing, typography, states, a11y) | From UI_IMPLEMENTATION_EXPLORATION. |
| **P4 — Engine & stability** | Tab visibility (pause/slow tick when hidden), optional network logger, 5-min soak | From GAME_ENGINE_EXPLORATION. |
| **Later** | 2v2 online, presets, saved drafts, haptics, 10-min mode, profile, rematch vote for 2v2/FFA | Documented but not in this build. |

---

## 4. Part A — PvP player experience (significant improvement)

### A.1 Joiner sees rules before match start

**Problem:** Joiner only sees “Waiting for host to start…” and does not see duration, win goal, or supply rules until the match begins.

**Approach:**

- **Option A (recommended):** Host sends current `matchConfig` to the joiner when the joiner connects (or when host changes rules). New action type, e.g. `configSync: { matchConfig }`. Joiner stores it in local state and shows a **read-only** “Match rules” summary (same format as SetupSummary). No joiner edit; just visibility.
- **Option B:** Host sends config only inside the existing `start` payload; joiner still cannot see rules until start. Then improve only the “About to start” moment (e.g. host clicks Start → joiner gets start with config and sees a brief “Starting with: 5 min, 1000 to win” before match screen). Less satisfying than A.

**Deliverables (Option A):**

- matchService: support sending and receiving `configSync` (or equivalent) from host to peer(s).
- RoomLobbyScreen (host): on config change and when peer joins, send current `hostConfig` (as validated matchConfig) to connected peer(s).
- RoomLobbyScreen (joiner): on receive `configSync`, set local state e.g. `receivedConfig`; render a read-only **Match rules** block (reuse SetupSummary text/layout, or a compact “Duration: X min · Win: Y · Supply: Z”).
- Ensure joiner never edits; display only.

**Completion criteria:** Joiner in waiting room sees the same rules the host has set (duration, win goal, supply). When host starts, joiner’s match config matches what they saw.

**Files:** `matchService.ts`, `RoomLobbyScreen.tsx`, possibly a small `SetupSummaryReadOnly` or props on `SetupSummary`.

---

### A.2 Room UX polish

**Objectives:** Room code and link are obvious; waiting state is clear; host vs joiner is explicit.

**Deliverables:**

- **Room code:** Make code more prominent (e.g. larger, monospace, “Share this code: ABC123”). Keep “Copy link” next to it; consider “Copy code” as well (code only, no URL).
- **Copy feedback:** After “Copy link” or “Copy code”, show brief feedback: “Copied!” or toast so the host knows it worked.
- **Waiting copy:** Host: “Share the code or link. When your friend joins, set rules and start.” Joiner: “Waiting for host to start. Rules will appear here when the host sets them.” (If A.1 is done: “Match rules” appears when host has sent config.)
- **Roles:** Subtle label for host: “You’re the host” and for joiner: “Joined as opponent” (or “You’re the joiner”) so both sides know their role.

**Completion criteria:** Host can copy link/code and see confirmation. Joiner understands they are waiting for host and (if A.1 done) see rules when available.

**Files:** `RoomLobbyScreen.tsx`, `App.css` (room-code, copy feedback).

---

### A.3 Rematch and post-match for PvP

**Problem:** “Rematch” on match end only goes to lobby; there is no way to play again with the same opponent without re-sharing a room.

**Approach:**

- **Rematch = return to room:** After a PvP match, “Rematch” could mean: both players return to the **same room** (same roomId) with roles preserved (host still host). Host sees rules form again; joiner sees waiting + rules (if A.1). Either reuse existing room connection or require “create new room” / “rejoin with same link” depending on whether PeerJS connection is still open after match.
- **Simplest v1:** Match end screen for PvP shows two actions: “Rematch” and “Lobby”. “Rematch” navigates to `/room/{roomId}` (store `lastRoomId` in gameStore or sessionStorage when leaving match so we can go back). If the connection is still alive, both end up in the same room; if not, show “Connection ended — create or join a new room.” Alternative: “Rematch” = navigate to `/room` with a query like `?rematch=1` and show “Create room to play again” or pre-fill rejoin if we have lastRoomId.
- **Clean approach:** On match end (PvP), store `lastRoomId` and `wasHost` (or leave connection open). “Rematch” → `navigate('/room/' + lastRoomId)` (or `/room` with state). Host and joiner both land in RoomLobbyScreen; connection may still be there so they can start again. If connection dropped, DisconnectOverlay or room screen shows “Opponent left” / “Reconnect” and they can leave.

**Deliverables:**

- gameStore (or sessionStorage): store `lastRoomId` (and optionally `wasHost`) when entering a PvP match, or when match ends in PvP.
- MatchEndScreen: when `isMultiplayer`, show “Rematch” button that navigates to `/room/{lastRoomId}` (or to `/room` with message “Create or join a room to play again” if no lastRoomId). “Lobby” still does reset + navigate to lobby.
- RoomLobbyScreen: when entered via rematch (e.g. same roomId), if connection is still active, show normal waiting UI. If connection was lost, show “Connection ended” and “Leave room” so they don’t get stuck.

**Completion criteria:** After a PvP match, both players can choose “Rematch” and end up in the same room to play again without re-exchanging codes (when connection is still alive). If connection is lost, they get a clear path back to lobby or new room.

**Files:** `gameStore.ts`, `MatchEndScreen.tsx`, `RoomLobbyScreen.tsx`, routing if needed.

---

### A.4 Disconnect handling clarity

**Current:** DisconnectOverlay shows “Opponent left” and “Return to Lobby”. It works but can feel abrupt.

**Deliverables:**

- Keep overlay; add one line of copy: “You can return to the lobby and create or join a new room.”
- Ensure “Return to Lobby” resets state (including `peerDisconnected`) and navigates to `/lobby` so the player can immediately create/join again.
- Optional: on “Return to Lobby”, clear or persist `lastRoomId` so rematch behaviour is consistent (e.g. clear so next “Rematch” from a future match doesn’t point to an old room).

**Completion criteria:** Message is clear; one click returns to lobby; no stuck state.

**Files:** `DisconnectOverlay.tsx`, optionally `gameStore.ts`.

---

### A.5 Match-end screen for PvP

**Deliverables:**

- When `isMultiplayer`, match-end title/subtitle can stay as is (VICTORY/DEFEAT, realm lore). Optionally add one line: “You won the duel!” / “Your opponent won.” for PvP.
- Stats block already shows attacks sent, coins stolen, coins lost; keep. Ensure “Rematch” and “Lobby” are both visible and labeled clearly for PvP (see A.3).

**Files:** `MatchEndScreen.tsx`.

---

### A.6 (Optional) PvP action feedback

**Idea:** Lightweight cue when the opponent acts (e.g. “Opponent deployed!” or a small icon that flashes). Low priority; only if time allows.

**Deliverables:** If implemented: store or derive “last remote action” (e.g. from applyRemoteAction); show a short-lived toast or badge in HUD when opponent deploys or banks. Do not over-clutter.

**Files:** `gameStore.ts`, `MatchScreen.tsx` or a small `OpponentActionCue.tsx`, `App.css`.

---

## 5. Part B — Setup layer and validation (from GAME_SETUP_LAYER_PLAN)

### B.1 Helper text and accessibility

- **Helper text:** Ensure every rules section (Win Goal, Supply, Duration, AI difficulty when shown) has a short `form-helper` line. Already partially there; add or tighten where missing.
- **Labels:** All inputs have associated `<label>` or `aria-label`; no bare sliders.
- **Validation in UI:** ValidationBanner is shown when invalid; add `aria-live="polite"` so screen readers announce validation changes.
- **Focus-visible:** Buttons and inputs have a visible focus ring (e.g. `:focus-visible` outline) for keyboard users.

**Files:** `GameRulesForm.tsx`, `ValidationBanner.tsx`, `App.css` (focus-visible).

---

### B.2 Edge cases and validation

- **Duration / win goal:** validateSetup already clamps or rejects; ensure Custom and Room disable Start when invalid. Handle edge cases: e.g. duration 0 or very high win threshold never reach startMatch.
- **Room:** Host cannot start when `peerCount < 1` (already disabled). Joiner cannot start (no button). No change needed if already enforced.

**Files:** `validateSetup.ts`, `CustomGameSetup.tsx`, `RoomLobbyScreen.tsx`.

---

### B.3 Custom setup subtitle and mode context

- Add a short subtitle on Custom screen, e.g. “Configure your realm’s skirmish.”
- Optional: one-line mode context under mode cards (“1v1: You vs 1 opponent · 2v2: Teams of 2 · FFA: Free-for-all”).

**Files:** `CustomGameSetup.tsx`, `App.css` if needed.

---

## 6. Part C — UI polish (from UI_IMPLEMENTATION_EXPLORATION)

### C.1 Reduced motion

- Respect `prefers-reduced-motion: reduce`: reduce or disable non-essential animations (float numbers, screen shake, modal motion). Keep layout and feedback readable.
- **Implementation:** CSS `@media (prefers-reduced-motion: reduce)` to shorten transitions or set `animation: none` on decorative elements; optionally a React hook to read `prefers-reduced-motion` and pass a prop to Framer Motion components.

**Files:** `App.css`, optionally `MatchScreen.tsx`, `StealFeedback.tsx`, `ScreenShake`, modal components.

---

### C.2 Focus-visible and keyboard

- Global `:focus-visible` style for buttons and focusable controls (outline or box-shadow). Ensure no focus-only outline on mouse click (use `:focus-visible`, not `:focus`).
- Tab order: Lobby → Custom → Room → Match flow is keyboard-navigable; “Start Match” and “Rematch” / “Lobby” reachable by keyboard.

**Files:** `App.css`, spot-check key screens.

---

### C.3 Split App.css (optional but recommended)

- App.css is large; split by feature: e.g. `landing.css`, `lobby.css`, `match.css`, `match-end.css`, `room.css`, `setup.css`, `shared.css`. Import in `App.tsx` or per route.
- Keep one global/theme file for variables and resets. Reduces merge conflicts and improves navigation.

**Files:** New CSS files under `src/` or `src/styles/`, `App.tsx` or main entry.

---

### C.4 QA checklist (implementation drift and consistency)

Use the UI_IMPLEMENTATION_EXPLORATION QA checklist as a verification list; fix only what’s broken or missing:

- Spacing (gaps, padding) consistent across HUD and forms.
- Alignment (meters, scoreboard, cards).
- Component states: buttons (default, hover, disabled); UnitCard (ready, cooldown); TargetSelector (selected); BankButton states.
- Responsive: 768px and 400px breakpoints; safe areas; no horizontal scroll on match.
- Typography: consistent use of display vs body; no font size below 0.65rem.
- Colour: cyan/red/gold/purple usage consistent with design.
- Touch targets ≥ 44px on mobile.
- No orphaned CSS classes; theme tokens used where they exist.

**Files:** Across `App.css` and feature components; fix ad hoc.

---

## 7. Part D — Engine and stability (from GAME_ENGINE_EXPLORATION)

### D.1 Tab visibility (optional)

- When `document.hidden`, consider pausing or slowing the tick (e.g. don’t advance `tickIndex` while tab is hidden, or use a longer interval). Reduces desync and battery use when the tab is in the background.
- **Implementation:** `document.addEventListener('visibilitychange', ...)`; in gameStore or MatchScreen, when hidden, clear the tick interval and set a flag; when visible again, restart tick. Ensure `matchStartTime` and `tickIndex` stay consistent so multiplayer doesn’t desync (if both clients pause when hidden, behaviour is consistent).

**Files:** `MatchScreen.tsx` or `gameStore.ts`, tick loop.

---

### D.2 Soak and regression

- **Soak:** Run a full 5-minute match (PvP or offline); no crash, no obvious memory growth.
- **Regression:** Smoke-test all paths: Lobby → Quick 1v1/2v2/FFA → Match; Lobby → Custom → Start → Match; Lobby → Online → Create Room → Start (with two clients or one host + mock); Lobby → Online → Join → Start. Match end → Rematch and Lobby.

**No new code;** manual or automated checklist.

---

## 8. Implementation order (phased)

### Phase 1 — PvP critical (P0)

1. **A.1** Joiner sees rules (configSync + read-only summary in room).
2. **A.2** Room UX (code/link prominence, copy feedback, waiting copy, host/joiner labels).
3. **A.3** Rematch: store lastRoomId, “Rematch” → room; handle connection-lost case.
4. **A.4** Disconnect copy and return-to-lobby behaviour.

**Gate:** Two people can create/join room, see same rules before start, play, then rematch into the same room (or see clear “connection ended” and go to lobby).

---

### Phase 2 — PvP polish and match end (P1)

5. **A.5** Match-end PvP copy and clear Rematch/Lobby.
6. **A.6** (Optional) Opponent action cue.

**Gate:** Match end and rematch feel intentional; optional cue doesn’t clutter.

---

### Phase 3 — Setup and validation polish (P2)

7. **B.1** Helper text, labels, aria-live for validation, focus-visible.
8. **B.2** Edge-case validation and Start disabled when invalid (verify only if needed).
9. **B.3** Custom subtitle and mode context.

**Gate:** Setup screens are accessible and clearly validated.

---

### Phase 4 — UI and QA (P3)

10. **C.1** Reduced-motion support.
11. **C.2** Focus-visible and keyboard flow.
12. **C.3** (Optional) Split App.css.
13. **C.4** QA checklist pass (spacing, alignment, states, responsive, typography, colour, touch targets).

**Gate:** No regressions; a11y baseline; consistent look and behaviour.

---

### Phase 5 — Stability and sign-off (P4)

14. **D.1** (Optional) Tab visibility pause/slow tick.
15. **D.2** Soak test and full regression pass.

**Gate:** 5-min match stable; all paths exercised and documented.

---

## 9. Task list for Cursor (concise)

| # | Task | Key files | Outcome |
|---|------|-----------|---------|
| 1 | configSync: host sends config to joiner in room | matchService, RoomLobbyScreen | Joiner receives and stores config |
| 2 | Joiner shows read-only match rules in waiting room | RoomLobbyScreen, SetupSummary or variant | Joiner sees duration, win goal, supply |
| 3 | Room code/link prominence + “Copied!” feedback | RoomLobbyScreen, App.css | Clear share flow |
| 4 | Waiting copy and “You’re host” / “Joined as opponent” | RoomLobbyScreen | Roles clear |
| 5 | lastRoomId (and wasHost?) on PvP match start/end | gameStore or sessionStorage | Rematch has target |
| 6 | Match end “Rematch” → /room/{lastRoomId}; handle disconnect | MatchEndScreen, RoomLobbyScreen | Rematch returns to room |
| 7 | DisconnectOverlay copy + ensure reset/lobby clean | DisconnectOverlay, gameStore | Clear exit path |
| 8 | Match-end PvP line (e.g. “You won the duel!”) | MatchEndScreen | PvP-specific copy |
| 9 | (Optional) Opponent action toast/badge | gameStore, MatchScreen or component | Lightweight PvP feedback |
| 10 | Helper text + aria-live + focus-visible | GameRulesForm, ValidationBanner, App.css | A11y and clarity |
| 11 | Custom subtitle + mode context | CustomGameSetup | Setup identity |
| 12 | prefers-reduced-motion | App.css, optional components | Reduced motion |
| 13 | Split App.css (optional) | New CSS files, App.tsx | Maintainability |
| 14 | QA checklist pass | App.css, HUD/forms | Consistency |
| 15 | Tab visibility tick pause (optional) | MatchScreen or gameStore | Background behaviour |
| 16 | Soak + regression pass | — | Stability sign-off |

---

## 10. Quality gates (master)

- **PvP:** Joiner sees rules before start. Rematch returns both players to the same room when connection is alive. Disconnect has one-click return to lobby. Room code/link and roles are clear.
- **Setup:** Invalid config cannot start match (Custom and Room). Validation and helper text visible. Accessibility: labels, focus-visible, aria-live where needed.
- **UI:** Reduced-motion respected. No critical layout or state bugs. QA checklist (spacing, alignment, responsive, touch targets) satisfied.
- **Stability:** 5-minute match runs without crash; all entry paths (Quick, Custom, Room create/join, Rematch, Lobby) exercised.

---

## 11. Out of scope / later

- CPU/AI behaviour or tuning.
- 2v2/FFA online (structure only; no UI for it in this plan).
- Full preset system, saved setups, map selection, mutators, ranked/casual.
- Backend authority, matchmaking service, replay.
- Storybook, haptics, 10-min mode, profile, rematch vote for 2v2/FFA (explicitly later).

---

## 12. Summary

- **Part A (PvP):** Joiner sees rules, room UX, rematch to same room, disconnect clarity, match-end PvP copy, optional opponent cue.
- **Part B (Setup):** Helper text, a11y, validation edge cases, Custom subtitle.
- **Part C (UI):** Reduced-motion, focus-visible, optional CSS split, QA checklist.
- **Part D (Stability):** Optional tab visibility, soak and regression.

Phases 1–2 deliver the “significant PvP improvement”; Phases 3–5 complete polish and stability from all prior plans in one place.
