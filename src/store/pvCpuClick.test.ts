import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';

describe('pvCpuClick', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('rejects second click within cooldown in PvCPU', () => {
    useGameStore.getState().startMatch(2, { aiDifficulty: 'normal' });
    const { matchStartTime, localPlayerId } = useGameStore.getState();
    expect(matchStartTime).toBeTruthy();

    const first = useGameStore.getState().clickForCoins(localPlayerId);
    expect(first).toBe(true);

    const second = useGameStore.getState().clickForCoins(localPlayerId);
    expect(second).toBe(false);
  });

  it('allows clicks after cooldown elapsed in PvCPU', () => {
    useGameStore.getState().startMatch(2, { aiDifficulty: 'normal' });
    const { localPlayerId } = useGameStore.getState();

    const first = useGameStore.getState().clickForCoins(localPlayerId);
    expect(first).toBe(true);

    for (let i = 0; i < 70; i++) {
      useGameStore.getState().tick();
      useGameStore.getState().resolveArrivingUnits();
    }

    const second = useGameStore.getState().clickForCoins(localPlayerId);
    expect(second).toBe(true);
  });
});
