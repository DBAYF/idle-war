import { describe, it, expect } from 'vitest';
import {
  getUpgradeCost,
  applyUpgradeEffect,
  bankCoins,
  hasReachedWinThreshold,
  createInitialEconomy,
} from './economy';

describe('economy', () => {
  describe('getUpgradeCost', () => {
    it('returns base cost for level 0', () => {
      expect(getUpgradeCost('click_power', 0)).toBe(25);
      expect(getUpgradeCost('auto_miner', 0)).toBe(50);
    });
    it('returns increased cost for higher levels', () => {
      const l0 = getUpgradeCost('click_power', 0);
      const l1 = getUpgradeCost('click_power', 1);
      expect(l1).toBeGreaterThan(l0);
      expect(l1).toBe(Math.floor(25 * Math.pow(1.4, 1)));
    });
    it('returns Infinity at max level', () => {
      expect(getUpgradeCost('click_power', 10)).toBe(Infinity);
      expect(getUpgradeCost('click_power', 9)).toBeLessThan(Infinity);
    });
    it('returns Infinity for unknown upgrade', () => {
      expect(getUpgradeCost('unknown', 0)).toBe(Infinity);
    });
  });

  describe('applyUpgradeEffect', () => {
    it('increases coinPerClick for manual upgrade', () => {
      const eco = createInitialEconomy();
      const after = applyUpgradeEffect(eco, 'click_power', 1);
      expect(after.coinPerClick).toBeGreaterThan(eco.coinPerClick);
    });
    it('increases autoIncomePerSec for auto upgrade', () => {
      const eco = createInitialEconomy();
      const after = applyUpgradeEffect(eco, 'auto_miner', 1);
      expect(after.autoIncomePerSec).toBeGreaterThan(eco.autoIncomePerSec);
    });
    it('increases supplyRate for supply upgrade', () => {
      const eco = createInitialEconomy();
      const after = applyUpgradeEffect(eco, 'supply_gen', 1);
      expect(after.supplyRate).toBeGreaterThan(eco.supplyRate);
    });
    it('returns economy unchanged for banking category', () => {
      const eco = createInitialEconomy();
      const after = applyUpgradeEffect(eco, 'bank_shield', 1);
      expect(after).toEqual(eco);
    });
    it('returns economy unchanged for unknown upgrade', () => {
      const eco = createInitialEconomy();
      const after = applyUpgradeEffect(eco, 'unknown', 1);
      expect(after).toEqual(eco);
    });
  });

  describe('bankCoins', () => {
    it('transfers loose coins to secured wealth', () => {
      const eco = createInitialEconomy();
      eco.looseCoins = 50;
      eco.securedWealth = 100;
      const after = bankCoins(eco, 30);
      expect(after.looseCoins).toBe(20);
      expect(after.securedWealth).toBe(130);
    });
    it('caps at available loose coins', () => {
      const eco = createInitialEconomy();
      eco.looseCoins = 20;
      const after = bankCoins(eco, 50);
      expect(after.looseCoins).toBe(0);
      expect(after.securedWealth).toBe(20);
    });
  });

  describe('hasReachedWinThreshold', () => {
    it('returns true when at or above threshold', () => {
      expect(hasReachedWinThreshold(1000)).toBe(true);
      expect(hasReachedWinThreshold(1001)).toBe(true);
    });
    it('returns false when below threshold', () => {
      expect(hasReachedWinThreshold(999)).toBe(false);
    });
    it('respects config winThreshold', () => {
      expect(hasReachedWinThreshold(500, { winThreshold: 500 })).toBe(true);
      expect(hasReachedWinThreshold(499, { winThreshold: 500 })).toBe(false);
    });
  });
});
