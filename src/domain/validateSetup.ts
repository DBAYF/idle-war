/** Setup validation — single source of truth for config validation */

import type { MatchConfig, MatchMode, AIDifficulty } from './types';
import { SUPPLY_SCARCITY_PRESETS } from './constants';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

const DURATION_MIN = 120;
const DURATION_MAX = 600;
const WIN_THRESHOLD_MIN = 500;
const WIN_THRESHOLD_MAX = 3000;
const VALID_MODES: MatchMode[] = ['1v1', '2v2', 'ffa'];
const VALID_AI_DIFFICULTIES: AIDifficulty[] = ['easy', 'normal', 'hard', 'brutal'];

const SUPPLY_RATE_MIN = 0.1;
const SUPPLY_RATE_MAX = 0.5;
const SUPPLY_CAP_MIN = 40;
const SUPPLY_CAP_MAX = 120;
const INITIAL_SUPPLY_MIN = 1;
const INITIAL_SUPPLY_MAX = 15;

function isSupplyPresetValid(
  baseSupplyRate: number,
  supplyCap: number,
  initialSupply: number
): boolean {
  return Object.values(SUPPLY_SCARCITY_PRESETS).some(
    (p) =>
      p.baseSupplyRate === baseSupplyRate &&
      p.supplyCap === supplyCap &&
      p.initialSupply === initialSupply
  );
}

export function validateSetup(
  config: MatchConfig,
  mode: MatchMode,
  isMultiplayer: boolean
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!VALID_MODES.includes(mode)) {
    errors.push('Invalid match mode.');
  }

  if (config.durationSec < DURATION_MIN || config.durationSec > DURATION_MAX) {
    errors.push('Duration must be between 2 and 10 minutes.');
  }

  if (config.winThreshold < WIN_THRESHOLD_MIN || config.winThreshold > WIN_THRESHOLD_MAX) {
    errors.push('Win goal must be between 500 and 3000.');
  }

  if (
    config.baseSupplyRate < SUPPLY_RATE_MIN ||
    config.baseSupplyRate > SUPPLY_RATE_MAX
  ) {
    errors.push('Supply rate is out of valid range.');
  }
  if (config.supplyCap < SUPPLY_CAP_MIN || config.supplyCap > SUPPLY_CAP_MAX) {
    errors.push('Supply cap is out of valid range.');
  }
  if (
    config.initialSupply < INITIAL_SUPPLY_MIN ||
    config.initialSupply > INITIAL_SUPPLY_MAX
  ) {
    errors.push('Initial supply is out of valid range.');
  }

  if (!isSupplyPresetValid(config.baseSupplyRate, config.supplyCap, config.initialSupply)) {
    warnings.push('Supply values do not match a preset; using custom values.');
  }

  if (!isMultiplayer) {
    if (!VALID_AI_DIFFICULTIES.includes(config.aiDifficulty)) {
      errors.push('Invalid AI difficulty.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
