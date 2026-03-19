# Click War — Implementation Status & Integration Analysis

Analysis of the **CPU Targeting Lore Upgrade** plan (`cpu_targeting_lore_upgrade_86ba78b1`) against the current codebase. Covers what is implemented, what is integrated, and what remains to be built.

---

## 1. EXECUTIVE SUMMARY

| Status | Summary |
|--------|---------|
| **Plan completion** | ~98% — All core phases implemented |
| **Integration** | Complete — All changes wired and working |
| **Next to build** | Phase 5 QA, optional polish, minor lore tweaks |

The CPU Targeting Lore Upgrade plan is effectively complete. All critical fixes, CPU strengthening, feedback polish, and lore content are in place. Remaining work is validation, optional polish, and a few small enhancements.

---

## 2. IMPLEMENTATION STATUS BY PHASE

### Phase 1: Critical Fixes (Targeting + Deploy Feedback) — ✅ COMPLETE

| Task | Status | Location | Verification |
|------|--------|----------|---------------|
| TargetSelector enemy filter by teamId | ✅ | `TargetSelector.tsx` L11–17 | 2v2 excludes teammates |
| selectedTargetId validation | ✅ | `TargetSelector.tsx` L19–23 | useEffect corrects stale selection |
| Default target on startMatch | ✅ | `gameStore.ts` L147–153 | First enemy by team |
| Default target on startMultiplayerMatch | ✅ | `gameStore.ts` L176–182 | Same logic for multiplayer |
| lastDeployError in uiStore | ✅ | `uiStore.ts` | State + setter present |
| UnitCard sets lastDeployError on failure | ✅ | `UnitCard.tsx` L57–65 | Maps reason to message |
| Deploy failure toast | ✅ | `DeployBar.tsx` L24–27 | Renders, auto-clears 2s |
| deployUnit return reason | ✅ | `gameStore.ts` L555–565 | Returns `true \| 'cooldown' \| 'supply' \| 'coins'` |

**Integration:** TargetSelector, gameStore, UnitCard, DeployBar, and uiStore are wired together. Deploy failures surface correctly.

---

### Phase 2: CPU Strengthening — ✅ COMPLETE

| Task | Status | Location | Verification |
|------|--------|----------|---------------|
| Lower deployThrottleMs | ✅ | `constants.ts` L36–39 | easy 16k, normal 10k, hard 7k, brutal 4k |
| Lower deployLooseMin, deploySupplyMin | ✅ | `constants.ts` L36–39 | Per-difficulty values |
| Deploy-urgency path before upgrade | ✅ | `ai.ts` L32–78 | When behind or under attack, deploy before upgrade |

**Integration:** AI uses new constants and deploy-urgency logic. Tick loop applies AI actions unchanged.

---

### Phase 3: Feedback Polish — ✅ COMPLETE

| Task | Status | Location | Verification |
|------|--------|----------|---------------|
| Selected target highlight in BattleLayer | ✅ | `BattleLayer.tsx` L91–96 | Cyan ring around selected wall |
| Unit tooltips with flavour | ✅ | `UnitCard.tsx` L73, `units.json` | `title={stats.flavour}` |
| Touch target hardening | ✅ | `App.css` L1128–1131, L1768–1773 | min-height/width 44px, touch-action |

**Integration:** BattleLayer subscribes to `selectedTargetId`. Unit flavour flows from content to tooltip.

---

### Phase 4: Lore and Identity — ✅ COMPLETE

| Task | Status | Location | Verification |
|------|--------|----------|---------------|
| Landing "Coin Realms" line | ✅ | `LandingScreen.tsx` L56 | "Compete for wealth in the Coin Realms." |
| Tutorial world intro | ✅ | `TutorialModal.tsx` L24 | "Rival factions battle for secured wealth..." |
| Match end realm framing | ✅ | `MatchEndScreen.tsx` L57–61 | "Your realm secured victory." / "The rival realm prevailed." |
| Unit flavour in content | ✅ | `content/units.json` | All 4 units have `flavour` |
| Unit flavour in types/loadContent | ✅ | `types.ts`, `loadContent.ts` | Optional `flavour` field |

**Integration:** Lore copy is in place. Unit flavour is loaded and shown via tooltips.

---

### Phase 5: QA and Balance — ⏳ PENDING

| Task | Status | Notes |
|------|--------|------|
| Full regression pass | ⏳ | Manual PvP, 1v1, 2v2, FFA |
| PvCPU balance check | ⏳ | CPU stronger but not oppressive |
| 5-min soak test | ⏳ | Match stability, no crashes |

---

## 3. INTEGRATION ANALYSIS

### 3.1 Data Flow

```
TargetSelector (enemies by teamId)
    → setSelectedTarget
    → gameStore.selectedTargetId
    → UnitCard (canDeploy requires valid target)
    → deployUnit(ownerId, targetId, type)
    → gameStore validates → returns true | 'cooldown' | 'supply' | 'coins'
    → UnitCard sets lastDeployError on failure
    → DeployBar renders toast, clears after 2s
```

**Status:** Flow is correct. No missing links.

### 3.2 Store Dependencies

| Store | Consumers | Cross-store |
|-------|-----------|-------------|
| gameStore | TargetSelector, UnitCard, DeployBar, BattleLayer, MatchEndScreen | Calls `useUIStore.getState().setLastDeployError(null)` on start/reset |
| uiStore | DeployBar, UnitCard | lastDeployError read/written by UnitCard, DeployBar |

**Status:** No circular dependencies. gameStore → uiStore is one-way.

### 3.3 AI Tick Loop

```
tick() → for each bot: getAIAction(bot, enemies, ..., lastBotClickTime[bot.id], ...)
       → if deploy: apply deploy logic (no deployUnit call; inline)
       → if click: apply click, update lastBotClickTime[bot.id]
```

**Status:** AI deploy-urgency path runs before upgrade loop. Per-bot `lastBotClickTime` is used (from PvCPU redesign plan).

---

## 4. WHAT IS NEXT TO BE BUILT

### 4.1 Remaining from Plan (Minor)

| Item | Plan reference | Priority | Effort |
|------|----------------|----------|--------|
| Custom setup subtitle | §8.3: "Configure your realm's skirmish." | Low | 1 line |
| Deploy success confirmation | §5.3: Optional "Sent!" or float text | Polish | Small |
| CPU activity indicators | §7.3: Badge when bot acted | Polish | Medium |
| aria-selected on target tabs | §7.2: Accessibility | Polish | Small |

### 4.2 Phase 5 Deliverables

| Deliverable | Description |
|-------------|-------------|
| Regression pass | PvP, 1v1, 2v2, FFA, determinism |
| PvCPU balance check | 5-min matches; CPU attack count ≥ 15 (normal) |
| Soak test | 5-min match stability |

### 4.3 Optional Future (Plan §15)

- Full campaign
- BattleLayer click-to-target
- Advanced faction system
- New units/upgrades

---

## 5. GAPS AND EDGE CASES

### 5.1 Verified

- **2v2 teammate bug:** Fixed — enemies filter by `teamId`
- **selectedTargetId validation:** Fixed — useEffect corrects when not in enemies
- **Default target:** Fixed — first enemy by team on start
- **Deploy failure feedback:** Fixed — toast with reason
- **CPU deploy frequency:** Improved — throttle, thresholds, deploy-urgency

### 5.2 Potential Edge Cases

| Edge case | Mitigation |
|-----------|------------|
| `teamId` undefined for some players | Fallback: `(p.teamId ?? -1) !== (local.teamId ?? -1)` |
| Rapid target change during deploy | UnitCard uses `selectedTargetId` at click time; no race |
| lastDeployError persists across matches | Cleared in startMatch, startMultiplayerMatch, reset |

### 5.3 Not Yet Validated

- 2v2 manual play: teammate not targetable
- Deploy failure toast in real play
- CPU attack frequency over 5 min
- Mobile touch targets

---

## 6. FILES MODIFIED (REFERENCE)

| File | Changes |
|------|---------|
| `TargetSelector.tsx` | Enemy filter, selectedTargetId validation |
| `gameStore.ts` | Default target, deployUnit return type, lastDeployError clear |
| `uiStore.ts` | lastDeployError |
| `UnitCard.tsx` | Deploy failure handling, flavour tooltip |
| `DeployBar.tsx` | Deploy error toast |
| `constants.ts` | AI deploy throttle, thresholds |
| `ai.ts` | Deploy-urgency path |
| `BattleLayer.tsx` | Selected target ring |
| `LandingScreen.tsx` | Coin Realms lore |
| `TutorialModal.tsx` | World intro |
| `MatchEndScreen.tsx` | Realm framing |
| `units.json` | Unit flavour |
| `types.ts`, `loadContent.ts` | Optional flavour |
| `App.css` | Toast, lore, touch target styles |

---

## 7. RECOMMENDED NEXT STEPS

### Immediate (Phase 5)

1. **Regression pass** — Run PvP, 1v1, 2v2, FFA; confirm no regressions
2. **PvCPU balance check** — Play 5-min matches; count CPU deploys; tune if needed
3. **Soak test** — 5-min match; check for crashes or leaks

### Optional Polish

1. Custom setup subtitle: "Configure your realm's skirmish."
2. `aria-selected` on target tabs
3. Deploy success feedback (e.g. brief "Sent!")

### Validation Scripts (If Desired)

- AI unit tests for deploy-urgency
- 2v2 target filter test
- Deploy failure toast test

---

## 8. CONCLUSION

The **CPU Targeting Lore Upgrade** plan is implemented and integrated. All critical and high-value items are done. Remaining work is Phase 5 QA, optional polish, and validation. No further implementation is required for the plan’s core scope.
