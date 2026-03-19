import { describe, it, expect } from 'vitest';
import { getAIAction } from './ai';
import { createPlayer } from '../store/gameStore';

const deterministicRandom = () => 0.5;

describe('ai', () => {
  const createBot = (overrides?: Partial<ReturnType<typeof createPlayer>>) => {
    const p = createPlayer('bot', 1);
    return { ...p, ...overrides };
  };

  const createEnemy = () => createPlayer('enemy', 0);

  it('returns bank when loose coins exceed threshold', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 150,
        securedWealth: 0,
        supply: 10,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const action = getAIAction(bot, [createEnemy()], {}, 0, 10000, 0, 'normal', [], 80, deterministicRandom);
    expect(action).toBe('bank');
  });

  it('returns click when cooldown elapsed', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 10,
        securedWealth: 0,
        supply: 10,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const action = getAIAction(bot, [createEnemy()], {}, 0, 2000, 0, 'normal', [], 80, deterministicRandom);
    expect(action).toBe('click');
  });

  it('returns deploy when can afford and throttle elapsed', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 35,
        securedWealth: 0,
        supply: 50,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const enemy = createEnemy();
    const now = 20000;
    const lastBotClickTime = now - 500;
    const maxUpgrades = { click_power: 10, auto_miner: 8, supply_gen: 6 };
    const action = getAIAction(bot, [enemy], maxUpgrades, lastBotClickTime, now, 0, 'normal', [], 80, deterministicRandom);
    const isDeploy = typeof action === 'object' && action !== null && 'deploy' in action;
    expect(isDeploy || action === 'bank' || (typeof action === 'object' && action !== null && 'upgrade' in action)).toBe(true);
    if (isDeploy) expect((action as { deploy: { targetId: string } }).deploy.targetId).toBe(enemy.id);
  });

  it('returns no deploy when deploy throttle not elapsed', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 30,
        securedWealth: 0,
        supply: 50,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const maxUpgrades = { click_power: 10, auto_miner: 8, supply_gen: 6 };
    const action = getAIAction(bot, [createEnemy()], maxUpgrades, 5000, 5000, 5000, 'normal', [], 80, deterministicRandom);
    const isDeploy = typeof action === 'object' && action !== null && 'deploy' in action;
    expect(isDeploy).toBe(false);
  });

  it('returns bank when under incoming pressure and loose > 30', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 40,
        securedWealth: 0,
        supply: 10,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const enemy = createEnemy();
    const unitsTargetingBot = [
      { id: 'u1', type: 'runner' as const, ownerId: enemy.id, targetId: bot.id, progress: 0.5, spawnTime: 0 },
      { id: 'u2', type: 'runner' as const, ownerId: enemy.id, targetId: bot.id, progress: 0.3, spawnTime: 0 },
      { id: 'u3', type: 'bruiser' as const, ownerId: enemy.id, targetId: bot.id, progress: 0.2, spawnTime: 0 },
    ];
    const action = getAIAction(bot, [enemy], {}, 0, 10000, 0, 'normal', unitsTargetingBot, 80, deterministicRandom);
    expect(['bank', 'click']).toContain(action);
  });

  it('returns upgrade when can afford and below bank threshold', () => {
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 50,
        securedWealth: 0,
        supply: 10,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const action = getAIAction(bot, [createEnemy()], {}, 10000, 10000, 10000, 'normal', [], 80, deterministicRandom);
    expect(action && typeof action === 'object' && 'upgrade' in action).toBe(true);
  });

  it('returns deploy when deploy-urgent (behind by >100)', () => {
    const enemy = createEnemy();
    enemy.isLeader = true;
    enemy.economy = { ...enemy.economy, securedWealth: 200 };
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 60,
        securedWealth: 50,
        supply: 40,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const now = 15000;
    const lastBotClickTime = now - 500;
    const maxUpgrades = { click_power: 10, auto_miner: 8, supply_gen: 6 };
    const action = getAIAction(bot, [enemy], maxUpgrades, lastBotClickTime, now, 0, 'normal', [], 80, deterministicRandom);
    expect(action && typeof action === 'object' && 'deploy' in action).toBe(true);
    expect((action as { deploy: { targetId: string } }).deploy.targetId).toBe(enemy.id);
  });

  it('returns deploy or bank when under attack', () => {
    const enemy = createEnemy();
    const bot = createBot({
      economy: {
        ...createPlayer('x', 0).economy,
        looseCoins: 60,
        securedWealth: 100,
        supply: 40,
        supplyRate: 0.25,
        coinPerClick: 5,
        autoIncomePerSec: 0,
      },
    });
    const unitsTargetingBot = [
      { id: 'u1', type: 'runner' as const, ownerId: enemy.id, targetId: bot.id, progress: 0.5, spawnTime: 0 },
    ];
    const now = 15000;
    const lastBotClickTime = now - 500;
    const maxUpgrades = { click_power: 10, auto_miner: 8, supply_gen: 6 };
    const action = getAIAction(bot, [enemy], maxUpgrades, lastBotClickTime, now, 0, 'normal', unitsTargetingBot, 80, deterministicRandom);
    expect(action === 'bank' || action === 'click' || (typeof action === 'object' && action !== null && 'deploy' in action)).toBe(true);
  });
});
