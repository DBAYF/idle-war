/** Human-like AI opponent – steady pace, realistic actions */

import type { PlayerState, UnitType } from './types';
import { UNIT_STATS, UPGRADE_DEFINITIONS } from './constants';
import { getUpgradeCost } from './economy';

/** Minimum ms between clicks – steady, human-like pace (~1 click/sec) */
const CLICK_COOLDOWN_MS = 1100;

/** Bank when loose coins exceed this – protect wealth */
const BANK_THRESHOLD = 90;

/** Minimum ms between any deploy – avoid troop spam */
const DEPLOY_THROTTLE_MS = 14000;

/** Only deploy when we have surplus – not every spare coin */
const DEPLOY_LOOSE_MIN = 70;
const DEPLOY_SUPPLY_MIN = 35;

export function getAIAction(
  bot: PlayerState,
  enemies: PlayerState[],
  upgradeLevels: Record<string, number>,
  lastBotClickTime: number,
  now: number,
  lastBotDeployTime: number
): 'click' | 'bank' | { upgrade: string } | { deploy: { type: UnitType; targetId: string } } | null {
  if (bot.economy.looseCoins > BANK_THRESHOLD) {
    return 'bank';
  }

  if (now - lastBotClickTime > CLICK_COOLDOWN_MS) {
    return 'click';
  }

  for (const def of UPGRADE_DEFINITIONS) {
    const level = upgradeLevels[def.id] ?? 0;
    if (level >= def.maxLevel) continue;
    const cost = getUpgradeCost(def.id, level);
    if (bot.economy.looseCoins >= cost * 1.2) {
      return { upgrade: def.id };
    }
  }

  const timeSinceDeploy = now - lastBotDeployTime;
  if (timeSinceDeploy < DEPLOY_THROTTLE_MS) return null;
  if (bot.economy.looseCoins < DEPLOY_LOOSE_MIN || bot.economy.supply < DEPLOY_SUPPLY_MIN) return null;

  const target = enemies[0];
  if (!target) return null;

  const deployOrder: UnitType[] = ['runner', 'bruiser', 'saboteur'];
  for (const type of deployOrder) {
    const stats = UNIT_STATS[type];
    if (
      bot.economy.supply >= stats.supplyCost &&
      bot.economy.looseCoins >= stats.coinCost
    ) {
      return { deploy: { type, targetId: target.id } };
    }
  }

  return null;
}
