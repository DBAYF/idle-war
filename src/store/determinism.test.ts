import { describe, it, expect } from 'vitest';
import { useGameStore } from './gameStore';

function checksum(state: { players: unknown[]; unitsInFlight: unknown[] }): string {
  return JSON.stringify({
    players: state.players.map((p) => ({
      id: (p as { id: string }).id,
      economy: (p as { economy: unknown }).economy,
      wallHealth: (p as { wallHealth: number }).wallHealth,
    })),
    unitsInFlight: state.unitsInFlight.map((u) => ({
      id: (u as { id: string }).id,
      progress: (u as { progress: number }).progress,
      type: (u as { type: string }).type,
    })),
    tickIndex: useGameStore.getState().tickIndex,
  });
}

describe('determinism', () => {
  it('produces identical state after same number of ticks', () => {
    useGameStore.getState().startMatch(2);
    for (let i = 0; i < 100; i++) {
      useGameStore.getState().tick();
      useGameStore.getState().resolveArrivingUnits();
    }
    const state1 = useGameStore.getState();
    const cs1 = checksum({ players: state1.players, unitsInFlight: state1.unitsInFlight });

    useGameStore.getState().reset();
    useGameStore.getState().startMatch(2);
    for (let i = 0; i < 100; i++) {
      useGameStore.getState().tick();
      useGameStore.getState().resolveArrivingUnits();
    }
    const state2 = useGameStore.getState();
    const cs2 = checksum({ players: state2.players, unitsInFlight: state2.unitsInFlight });

    expect(cs1).toBe(cs2);
  });
});
