/** Economy formulas and logic */

import type { PlayerEconomy } from './types';
import {
  BASE_CLICK_VALUE,
  BASE_SUPPLY_RATE,
  UPGRADE_DEFINITIONS,
  WIN_THRESHOLD,
} from './constants';

export function getUpgradeCost(
  upgradeId: string,
  currentLevel: number
): number {
  const def = UPGRADE_DEFINITIONS.find((u) => u.id === upgradeId);
  if (!def || currentLevel >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
}

/** Diminishing returns: each level past 1 is 5% less effective (min 50%) */
function diminishingFactor(level: number): number {
  return Math.max(0.5, 1 - (level - 1) * 0.05);
}

export function applyUpgradeEffect(
  economy: PlayerEconomy,
  upgradeId: string,
  newLevel: number
): PlayerEconomy {
  const def = UPGRADE_DEFINITIONS.find((u) => u.id === upgradeId);
  if (!def) return economy;

  const incrementalEffect = def.effectPerLevel * diminishingFactor(newLevel);

  switch (def.category) {
    case 'manual':
      return { ...economy, coinPerClick: economy.coinPerClick + incrementalEffect };
    case 'auto':
      return { ...economy, autoIncomePerSec: economy.autoIncomePerSec + incrementalEffect };
    case 'supply':
      return { ...economy, supplyRate: economy.supplyRate + incrementalEffect };
    case 'banking':
      return economy; // Banking efficiency handled separately
    default:
      return economy;
  }
}

export function createInitialEconomy(): PlayerEconomy {
  return {
    looseCoins: 100,
    securedWealth: 0,
    supply: 5,
    supplyRate: BASE_SUPPLY_RATE,
    coinPerClick: BASE_CLICK_VALUE,
    autoIncomePerSec: 0,
  };
}

export function canBank(economy: PlayerEconomy): boolean {
  return economy.looseCoins > 0;
}

export function bankCoins(
  economy: PlayerEconomy,
  amount: number
): PlayerEconomy {
  const toBank = Math.min(amount, economy.looseCoins);
  return {
    ...economy,
    looseCoins: economy.looseCoins - toBank,
    securedWealth: economy.securedWealth + toBank,
  };
}

export function hasReachedWinThreshold(securedWealth: number): boolean {
  return securedWealth >= WIN_THRESHOLD;
}
