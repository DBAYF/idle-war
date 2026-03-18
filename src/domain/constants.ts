/** Game constants and default values */

import type { UnitStats, UpgradeDefinition, MatchConfig } from './types';

export const MATCH_DURATION_SEC = 300; // 5 minutes
export const WIN_THRESHOLD = 1000;
export const BASE_CLICK_VALUE = 5;
export const BASE_SUPPLY_RATE = 0.25;
export const SUPPLY_CAP = 80;
export const BASE_WALL_HEALTH = 100;
export const TRAVEL_DURATION_MS = 3000;

export const UNIT_STATS: Record<string, UnitStats> = {
  runner: {
    type: 'runner',
    name: 'Runner',
    speed: 1.5,
    durability: 0.3,
    coinSteal: 15,
    wallDamage: 0,
    saboteurDuration: 0,
    supplyCost: 3,
    coinCost: 20,
    cooldownMs: 2000,
  },
  bruiser: {
    type: 'bruiser',
    name: 'Bruiser',
    speed: 0.6,
    durability: 1.5,
    coinSteal: 5,
    wallDamage: 25,
    saboteurDuration: 0,
    supplyCost: 5,
    coinCost: 50,
    cooldownMs: 4000,
  },
  saboteur: {
    type: 'saboteur',
    name: 'Saboteur',
    speed: 1,
    durability: 0.6,
    coinSteal: 8,
    wallDamage: 0,
    saboteurDuration: 5000,
    supplyCost: 4,
    coinCost: 35,
    cooldownMs: 3500,
  },
  defender: {
    type: 'defender',
    name: 'Defender',
    speed: 0,
    durability: 2,
    coinSteal: 0,
    wallDamage: 0,
    saboteurDuration: 0,
    supplyCost: 3,
    coinCost: 40,
    cooldownMs: 6000,
  },
};

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  {
    id: 'click_power',
    name: 'Click Power',
    category: 'manual',
    baseCost: 25,
    costMultiplier: 1.4,
    maxLevel: 10,
    effectPerLevel: 2,
  },
  {
    id: 'auto_miner',
    name: 'Auto Miner',
    category: 'auto',
    baseCost: 50,
    costMultiplier: 1.5,
    maxLevel: 8,
    effectPerLevel: 1.5,
  },
  {
    id: 'supply_gen',
    name: 'Supply Generator',
    category: 'supply',
    baseCost: 40,
    costMultiplier: 1.45,
    maxLevel: 6,
    effectPerLevel: 0.08,
  },
  {
    id: 'bank_shield',
    name: 'Bank Shield',
    category: 'banking',
    baseCost: 80,
    costMultiplier: 1.6,
    maxLevel: 4,
    effectPerLevel: 0.1,
  },
];

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: '1v1',
  durationSec: MATCH_DURATION_SEC,
  winThreshold: WIN_THRESHOLD,
  baseClickValue: BASE_CLICK_VALUE,
  baseSupplyRate: BASE_SUPPLY_RATE,
};

export const TEAM_COLORS = [
  '#00d4aa',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
];
