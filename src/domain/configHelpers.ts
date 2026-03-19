/** Config helpers for match setup */

import type { MatchConfig, MatchMode } from './types';
import type { AIDifficulty } from './types';
import { DEFAULT_MATCH_CONFIG, AI_DIFFICULTY_PRESETS } from './constants';

export function getQuickPlayConfig(mode: MatchMode): MatchConfig {
  return { ...DEFAULT_MATCH_CONFIG, mode };
}

export function getPlayerCount(mode: MatchMode): number {
  return mode === '1v1' ? 2 : 4;
}

export function getPvCpuClickCooldownMs(difficulty: AIDifficulty): number {
  return AI_DIFFICULTY_PRESETS[difficulty].pvCpuPlayerClickCooldownMs;
}
