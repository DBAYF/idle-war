/** Combat formulas and unit logic — single source of truth */

import type { UnitInFlight, UnitType } from './types';
import type { UnitStats } from './types';
import { UNIT_STATS, TRAVEL_DURATION_MS } from './constants';

export function createUnitInFlight(
  type: UnitType,
  ownerId: string,
  targetId: string,
  spawnTime: number
): UnitInFlight {
  return {
    id: `${ownerId}-${type}-${spawnTime}`,
    type,
    ownerId,
    targetId,
    progress: 0,
    spawnTime,
  };
}

export function updateUnitProgress(
  unit: UnitInFlight,
  now: number
): UnitInFlight {
  const elapsed = now - unit.spawnTime;
  const stats = UNIT_STATS[unit.type];
  const speed = stats?.speed ?? 1;
  const progress = Math.min(1, (elapsed / TRAVEL_DURATION_MS) * speed);
  return { ...unit, progress };
}

export function getUnitTravelDuration(type: UnitType): number {
  const stats = UNIT_STATS[type];
  return TRAVEL_DURATION_MS / (stats?.speed ?? 1);
}

/**
 * Resolve unit arrival: compute steal amount and wall damage.
 * Single source of truth for combat formulas.
 * - Leader bonus: 1.1x steal when attacking the wealth leader
 * - Repeat-attack penalty: after 3 attacks, reduce steal by 10% per extra attack (min 50%)
 * - Shield reduction is applied by caller (defender/bank shield)
 */
export function resolveUnitArrival(
  stats: UnitStats,
  targetLooseCoins: number,
  attackCount: number,
  isLeaderTarget: boolean
): { stealAmount: number; wallDamage: number } {
  let stealAmount = Math.min(stats.coinSteal, targetLooseCoins);
  if (stealAmount > 0 && isLeaderTarget) {
    stealAmount = Math.min(targetLooseCoins, Math.ceil(stealAmount * 1.1));
  }
  if (attackCount > 3) {
    stealAmount = Math.floor(stealAmount * Math.max(0.5, 1 - (attackCount - 3) * 0.1));
  }
  const wallDamage = stats.wallDamage;
  return { stealAmount, wallDamage };
}

/** Compute effective steal reduction from defender and bank shields (use max) */
export function getShieldReduction(
  defenderPercent: number | undefined,
  defenderUntil: number | undefined,
  bankPercent: number | undefined,
  bankUntil: number | undefined,
  simulationTime: number
): number {
  let reduction = 0;
  if (defenderPercent != null && defenderUntil != null && simulationTime < defenderUntil) {
    reduction = Math.max(reduction, defenderPercent);
  }
  if (bankPercent != null && bankUntil != null && simulationTime < bankUntil) {
    reduction = Math.max(reduction, bankPercent);
  }
  return reduction;
}
