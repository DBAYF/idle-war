import { describe, it, expect } from 'vitest';
import {
  createUnitInFlight,
  updateUnitProgress,
  resolveUnitArrival,
  getUnitTravelDuration,
} from './combat';
import { UNIT_STATS } from './constants';

describe('combat', () => {
  describe('createUnitInFlight', () => {
    it('creates unit with progress 0', () => {
      const unit = createUnitInFlight('runner', 'p1', 'p2', 1000);
      expect(unit.type).toBe('runner');
      expect(unit.ownerId).toBe('p1');
      expect(unit.targetId).toBe('p2');
      expect(unit.progress).toBe(0);
      expect(unit.spawnTime).toBe(1000);
      expect(unit.id).toContain('p1');
      expect(unit.id).toContain('runner');
    });
  });

  describe('updateUnitProgress', () => {
    it('computes progress from elapsed time and speed', () => {
      const unit = createUnitInFlight('runner', 'p1', 'p2', 0);
      const TRAVEL_MS = 3000;
      const runnerSpeed = UNIT_STATS.runner.speed;
      const halfTime = 0 + TRAVEL_MS / 2 / runnerSpeed;
      const updated = updateUnitProgress(unit, halfTime);
      expect(updated.progress).toBeCloseTo(0.5, 2);
    });
    it('caps progress at 1', () => {
      const unit = createUnitInFlight('runner', 'p1', 'p2', 0);
      const farFuture = 0 + 10000;
      const updated = updateUnitProgress(unit, farFuture);
      expect(updated.progress).toBe(1);
    });
  });

  describe('resolveUnitArrival', () => {
    const runnerStats = UNIT_STATS.runner;
    const bruiserStats = UNIT_STATS.bruiser;

    it('steals up to coinSteal and target loose coins', () => {
      const { stealAmount } = resolveUnitArrival(runnerStats, 100, 1, false);
      expect(stealAmount).toBe(15);
    });
    it('caps steal at target loose coins', () => {
      const { stealAmount } = resolveUnitArrival(runnerStats, 10, 1, false);
      expect(stealAmount).toBe(10);
    });
    it('applies 1.1x leader bonus when attacking leader', () => {
      const base = resolveUnitArrival(runnerStats, 100, 1, false).stealAmount;
      const leader = resolveUnitArrival(runnerStats, 100, 1, true).stealAmount;
      expect(leader).toBe(Math.ceil(base * 1.1));
    });
    it('applies repeat-attack penalty after 3 attacks', () => {
      const first = resolveUnitArrival(runnerStats, 100, 3, false).stealAmount;
      const fourth = resolveUnitArrival(runnerStats, 100, 4, false).stealAmount;
      expect(fourth).toBeLessThan(first);
      expect(fourth).toBe(Math.floor(first * 0.9));
    });
    it('caps repeat penalty at 50%', () => {
      const many = resolveUnitArrival(runnerStats, 100, 10, false).stealAmount;
      expect(many).toBeGreaterThanOrEqual(7);
      expect(many).toBeLessThanOrEqual(15);
    });
    it('returns wall damage from stats', () => {
      expect(resolveUnitArrival(runnerStats, 100, 1, false).wallDamage).toBe(0);
      expect(resolveUnitArrival(bruiserStats, 100, 1, false).wallDamage).toBe(25);
    });
  });

  describe('getUnitTravelDuration', () => {
    it('returns duration based on speed', () => {
      const runner = getUnitTravelDuration('runner');
      const bruiser = getUnitTravelDuration('bruiser');
      expect(runner).toBeLessThan(bruiser);
    });
  });
});
