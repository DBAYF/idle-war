import { describe, it, expect } from 'vitest';
import { getEnemies } from './targetHelpers';
import { createPlayer } from '../store/gameStore';

describe('targetHelpers', () => {
  it('returns all non-local players in 1v1 (no teamId)', () => {
    const p0 = createPlayer('player-0', 0);
    const p1 = createPlayer('player-1', 1);
    p0.teamId = undefined;
    p1.teamId = undefined;
    const enemies = getEnemies([p0, p1], 'player-0');
    expect(enemies).toHaveLength(1);
    expect(enemies[0].id).toBe('player-1');
  });

  it('excludes teammate in 2v2', () => {
    const p0 = createPlayer('player-0', 0); // teamId 0
    const p1 = createPlayer('player-1', 1); // teamId 1
    const p2 = createPlayer('player-2', 2); // teamId 0 (same as p0)
    const p3 = createPlayer('player-3', 3); // teamId 1 (same as p1)
    const players = [p0, p1, p2, p3];
    const enemies = getEnemies(players, 'player-0');
    expect(enemies.map((e) => e.id)).toEqual(['player-1', 'player-3']);
    expect(enemies).not.toContainEqual(expect.objectContaining({ id: 'player-2' }));
  });

  it('returns all non-local in FFA when teamId differs', () => {
    const players = [
      { ...createPlayer('player-0', 0), teamId: 0 },
      { ...createPlayer('player-1', 1), teamId: 1 },
      { ...createPlayer('player-2', 2), teamId: 2 },
      { ...createPlayer('player-3', 3), teamId: 3 },
    ];
    const enemies = getEnemies(players, 'player-0');
    expect(enemies).toHaveLength(3);
    expect(enemies.map((e) => e.id)).toEqual(['player-1', 'player-2', 'player-3']);
  });
});
