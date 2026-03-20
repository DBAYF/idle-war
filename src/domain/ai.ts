/** Human-like AI – utility-based action scoring with controlled randomness */

import type { PlayerState, UnitType, AIDifficulty, UnitInFlight } from './types';
import { UNIT_STATS, UPGRADE_DEFINITIONS, AI_DIFFICULTY_PRESETS } from './constants';
import { getUpgradeCost } from './economy';

export type AIAction = 'click' | 'bank' | { upgrade: string } | { deploy: { type: UnitType; targetId: string } } | null;

/** Optional RNG for tests: pass () => 0.5 for deterministic (no noise) */
export function getAIAction(
  bot: PlayerState,
  enemies: PlayerState[],
  upgradeLevels: Record<string, number>,
  lastBotClickTime: number,
  now: number,
  lastBotDeployTime: number,
  aiDifficulty: AIDifficulty = 'normal',
  unitsInFlight: UnitInFlight[] = [],
  supplyCap: number = 80,
  random: () => number = Math.random
): AIAction {
  const preset = AI_DIFFICULTY_PRESETS[aiDifficulty];
  const {
    clickCooldownMs,
    bankThreshold,
    deployThrottleMs,
    deployLooseMin,
    deploySupplyMin,
    upgradeCostMult,
    attackWeight,
    noiseWidth,
  } = preset;
  const unitsTargetingBot = unitsInFlight.filter((u) => u.targetId === bot.id).length;
  const timeSinceDeploy = now - lastBotDeployTime;
  const clickCooldownElapsed = now - lastBotClickTime > clickCooldownMs;
  const effectiveDeployThrottleMs = deployThrottleMs * (0.95 + 0.1 * random());
  const deployThrottleElapsed = timeSinceDeploy >= effectiveDeployThrottleMs;
  const canAffordDeployMin = bot.economy.looseCoins >= deployLooseMin && bot.economy.supply >= deploySupplyMin;

  type Candidate = { action: AIAction; score: number };
  const candidates: Candidate[] = [];

  function addNoise(score: number): number {
    const noise = (random() - 0.5) * noiseWidth * Math.max(1, score);
    return Math.max(0, score + noise);
  }

  if (bot.economy.looseCoins > 0) {
    let bankScore = Math.min(2, bot.economy.looseCoins / Math.max(1, bankThreshold)) * 10;
    if (unitsTargetingBot >= 2) bankScore += 8;
    else if (unitsTargetingBot >= 1) bankScore += 3;
    candidates.push({ action: 'bank', score: addNoise(bankScore) });
  }

  if (clickCooldownElapsed) {
    const clickScore = 6 + (bot.economy.coinPerClick / Math.max(1, bot.economy.autoIncomePerSec || 0.1)) * 2;
    candidates.push({ action: 'click', score: addNoise(clickScore) });
  }

  const supplyLow = bot.economy.supply < supplyCap * 0.3;
  const autoLow = bot.economy.autoIncomePerSec < bot.economy.coinPerClick * 0.5;
  const upgradeOrder = [...UPGRADE_DEFINITIONS];
  if (supplyLow) {
    const supplyGen = upgradeOrder.find((u) => u.id === 'supply_gen');
    if (supplyGen) {
      upgradeOrder.splice(upgradeOrder.indexOf(supplyGen), 1);
      upgradeOrder.unshift(supplyGen);
    }
  } else if (autoLow) {
    const autoMiner = upgradeOrder.find((u) => u.id === 'auto_miner');
    if (autoMiner) {
      upgradeOrder.splice(upgradeOrder.indexOf(autoMiner), 1);
      upgradeOrder.unshift(autoMiner);
    }
  }
  for (const def of upgradeOrder) {
    const level = upgradeLevels[def.id] ?? 0;
    if (level >= def.maxLevel) continue;
    const cost = getUpgradeCost(def.id, level);
    if (bot.economy.looseCoins >= cost * upgradeCostMult) {
      const upgradeScore = 5 + (def.id === 'supply_gen' && supplyLow ? 4 : 0) + (def.id === 'auto_miner' && autoLow ? 4 : 0);
      candidates.push({ action: { upgrade: def.id }, score: addNoise(upgradeScore) });
      break;
    }
  }

  if (deployThrottleElapsed && canAffordDeployMin && enemies.length > 0) {
    const enemyLeader = enemies.find((e) => e.isLeader);
    const weAreBehind = Boolean(
      enemyLeader && bot.economy.securedWealth < enemyLeader.economy.securedWealth - 100
    );
    const timeFactor = Math.min(1.2, timeSinceDeploy / Math.max(1, deployThrottleMs));

    if (
      unitsTargetingBot > 2 &&
      UNIT_STATS.defender &&
      bot.economy.supply >= UNIT_STATS.defender.supplyCost &&
      bot.economy.looseCoins >= UNIT_STATS.defender.coinCost
    ) {
      const defenderScore = (20 + unitsTargetingBot * 5) * timeFactor * attackWeight;
      candidates.push({ action: { deploy: { type: 'defender', targetId: bot.id } }, score: addNoise(defenderScore) });
    }

    for (const target of enemies) {
      if (target.id === bot.id) continue;
      const targetScore = scoreTarget(bot, target, weAreBehind);
      const deployOptions = getFeasibleDeployTypes(bot, target);
      for (const type of deployOptions) {
        const stats = UNIT_STATS[type];
        if (!stats || bot.economy.supply < stats.supplyCost || bot.economy.looseCoins < stats.coinCost) continue;
        const unitBonus = type === 'bruiser' && target.wallHealth < 50 ? 1.3 : type === 'saboteur' && target.isLeader ? 1.2 : 1;
        const deployScore = targetScore * timeFactor * attackWeight * unitBonus;
        candidates.push({ action: { deploy: { type, targetId: target.id } }, score: addNoise(deployScore) });
      }
    }
  }

  if (candidates.length === 0) {
    if (clickCooldownElapsed) return 'click';
    return null;
  }

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].score > best.score) best = candidates[i];
  }

  const minScore = 0.5;
  if (best.score < minScore && clickCooldownElapsed) return 'click';
  return best.score >= minScore ? best.action : null;
}

function scoreTarget(bot: PlayerState, target: PlayerState, weAreBehind: boolean): number {
  let s = 5;
  if (target.isLeader) s += 15;
  s += Math.min(20, target.economy.securedWealth / 50);
  s += Math.min(15, target.economy.looseCoins / 25);
  if (target.wallHealth < 50) s += 12;
  if (target.wallHealth < 25) s += 8;
  if (weAreBehind && target.economy.securedWealth > bot.economy.securedWealth) s += 10;
  return s;
}

function getFeasibleDeployTypes(bot: PlayerState, target: PlayerState): UnitType[] {
  const wallLow = target.wallHealth < 50;
  const targetAhead = target.economy.securedWealth > bot.economy.securedWealth;
  const order: UnitType[] = [];
  if (wallLow && UNIT_STATS.bruiser) order.push('bruiser');
  if (targetAhead && UNIT_STATS.runner) order.push('runner');
  if (target.isLeader && UNIT_STATS.saboteur) order.push('saboteur');
  if (!order.includes('runner')) order.push('runner');
  if (!order.includes('bruiser')) order.push('bruiser');
  if (!order.includes('saboteur')) order.push('saboteur');
  return order;
}
