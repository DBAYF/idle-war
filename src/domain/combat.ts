/** Combat formulas and unit logic */

import type { UnitInFlight, UnitType } from './types';
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

export function calculateStealAmount(
  unitType: UnitType,
  targetLooseCoins: number,
  isLeader: boolean
): number {
  const stats = UNIT_STATS[unitType];
  if (!stats) return 0;
  const baseSteal = Math.min(stats.coinSteal, targetLooseCoins);
  return isLeader ? baseSteal * 0.9 : baseSteal;
}

export function calculateWallDamage(unitType: UnitType): number {
  return UNIT_STATS[unitType]?.wallDamage ?? 0;
}
