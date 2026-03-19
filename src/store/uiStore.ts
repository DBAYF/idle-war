/** UI state store */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAudioEnabled } from '../shared/audio/audioService';

export interface UIState {
  worldViewOpen: boolean;
  upgradePanelOpen: boolean;
  audioMuted: boolean;
  hoveredUpgradeId: string | null;
  matchPauseOpen: boolean;
  lastDeployError: string | null;
  lastDeploySuccess: string | null;
}

interface UIActions {
  toggleWorldView: () => void;
  toggleUpgradePanel: () => void;
  toggleAudio: () => void;
  setHoveredUpgrade: (id: string | null) => void;
  setMatchPauseOpen: (open: boolean) => void;
  setLastDeployError: (msg: string | null) => void;
  setLastDeploySuccess: (msg: string | null) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      worldViewOpen: false,
      upgradePanelOpen: true,
      audioMuted: false,
      hoveredUpgradeId: null,
      matchPauseOpen: false,
      lastDeployError: null,
      lastDeploySuccess: null,

      toggleWorldView: () => set((s) => ({ worldViewOpen: !s.worldViewOpen })),
      toggleUpgradePanel: () => set((s) => ({ upgradePanelOpen: !s.upgradePanelOpen })),
      toggleAudio: () => {
        set((s) => {
          const next = !s.audioMuted;
          setAudioEnabled(!next);
          return { audioMuted: next };
        });
      },
      setHoveredUpgrade: (id) => set({ hoveredUpgradeId: id }),
      setMatchPauseOpen: (open) => set({ matchPauseOpen: open }),
      setLastDeployError: (msg) => set({ lastDeployError: msg, lastDeploySuccess: null }),
      setLastDeploySuccess: (msg) => set({ lastDeploySuccess: msg, lastDeployError: null }),
    }),
    {
      name: 'clickwar-ui',
      partialize: (s) => ({ audioMuted: s.audioMuted }),
      onRehydrateStorage: () => (state) => {
        if (state?.audioMuted != null) setAudioEnabled(!state.audioMuted);
      },
    }
  )
);
