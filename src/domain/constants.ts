/** Game constants and default values */

import type { UnitStats, UpgradeDefinition, MatchConfig, SupplyScarcity, AIDifficulty } from './types';
import { loadUnits, loadUpgrades } from './loadContent';

export const MATCH_DURATION_SEC = 300; // 5 minutes
export const WIN_THRESHOLD = 1000;
export const BASE_CLICK_VALUE = 5;
export const BASE_SUPPLY_RATE = 0.25;
export const SUPPLY_CAP = 80;
export const INITIAL_SUPPLY = 5;
export const BASE_WALL_HEALTH = 100;
export const TRAVEL_DURATION_MS = 3000;
export const TICK_MS = 1000 / 60;

export const UNIT_STATS: Record<string, UnitStats> = loadUnits();
export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = loadUpgrades();

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  mode: '1v1',
  durationSec: MATCH_DURATION_SEC,
  winThreshold: WIN_THRESHOLD,
  baseClickValue: BASE_CLICK_VALUE,
  baseSupplyRate: BASE_SUPPLY_RATE,
  supplyCap: SUPPLY_CAP,
  initialSupply: INITIAL_SUPPLY,
  aiDifficulty: 'normal',
};

export const SUPPLY_SCARCITY_PRESETS: Record<SupplyScarcity, { baseSupplyRate: number; supplyCap: number; initialSupply: number }> = {
  easy: { baseSupplyRate: 0.35, supplyCap: 100, initialSupply: 10 },
  normal: { baseSupplyRate: 0.25, supplyCap: 80, initialSupply: 5 },
  hard: { baseSupplyRate: 0.15, supplyCap: 60, initialSupply: 3 },
};

export interface AIDifficultyPreset {
  clickCooldownMs: number;
  bankThreshold: number;
  deployThrottleMs: number;
  deployLooseMin: number;
  deploySupplyMin: number;
  upgradeCostMult: number;
  pvCpuPlayerClickCooldownMs: number;
  attackWeight: number;
  noiseWidth: number;
}

export const AI_DIFFICULTY_PRESETS: Record<AIDifficulty, AIDifficultyPreset> = {
  easy: { clickCooldownMs: 1800, bankThreshold: 100, deployThrottleMs: 16000, deployLooseMin: 80, deploySupplyMin: 40, upgradeCostMult: 1.5, pvCpuPlayerClickCooldownMs: 1800, attackWeight: 0.5, noiseWidth: 0.35 },
  normal: { clickCooldownMs: 1100, bankThreshold: 70, deployThrottleMs: 10000, deployLooseMin: 55, deploySupplyMin: 28, upgradeCostMult: 1.2, pvCpuPlayerClickCooldownMs: 1100, attackWeight: 1.0, noiseWidth: 0.2 },
  hard: { clickCooldownMs: 700, bankThreshold: 50, deployThrottleMs: 7000, deployLooseMin: 40, deploySupplyMin: 20, upgradeCostMult: 1.0, pvCpuPlayerClickCooldownMs: 700, attackWeight: 1.4, noiseWidth: 0.12 },
  brutal: { clickCooldownMs: 450, bankThreshold: 35, deployThrottleMs: 4000, deployLooseMin: 30, deploySupplyMin: 12, upgradeCostMult: 0.9, pvCpuPlayerClickCooldownMs: 450, attackWeight: 1.8, noiseWidth: 0.06 },
};

export const DEFENDER_SHIELD_DURATION_MS = 3000;
export const DEFENDER_SHIELD_PERCENT = 0.2;
export const SABOTEUR_DEBUFF_MULTIPLIER = 0.8;
export const SABOTEUR_DEBUFF_DURATION_MS = 5000;

export const TEAM_COLORS = [
  '#00d4aa',
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
];
