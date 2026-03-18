/** Main game/match state store */

import { create } from 'zustand';
import type { PlayerState, UnitInFlight, UnitType } from '../domain/types';
import {
  createInitialEconomy,
  getUpgradeCost,
  applyUpgradeEffect,
  bankCoins,
  hasReachedWinThreshold,
} from '../domain/economy';
import { createUnitInFlight } from '../domain/combat';
import { getAIAction } from '../domain/ai';
import {
  UNIT_STATS,
  TEAM_COLORS,
  BASE_WALL_HEALTH,
  MATCH_DURATION_SEC,
  SUPPLY_CAP,
  BASE_SUPPLY_RATE,
} from '../domain/constants';
import { audioService } from '../shared/audio/audioService';
import { broadcastAction, disconnect, type GameAction } from '../shared/network/matchService';

export interface UpgradeLevels {
  [upgradeId: string]: number;
}

export interface MatchStats {
  attacksSent: number;
  coinsStolen: number;
  coinsLost: number;
  biggestSingleSteal?: number;
}

export interface StealFeedback {
  amount: number;
  timestamp: number;
}

export interface ImpactEvent {
  targetId: string;
  timestamp: number;
}

export interface GameState {
  isMultiplayer: boolean;
  matchStartTime: number | null;
  matchEndTime: number | null;
  players: PlayerState[];
  localPlayerId: string;
  unitsInFlight: UnitInFlight[];
  upgradeLevels: UpgradeLevels;
  selectedTargetId: string | null;
  lastUnitDeployTime: Record<UnitType, number>;
  lastBotClickTime: number;
  lastBotDeployTime: Record<string, number>;
  matchStats: Record<string, MatchStats>;
  lastStealFeedback: StealFeedback | null;
  recentImpacts: ImpactEvent[];
  attackCountByTarget: Record<string, number>;
}

interface GameActions {
  startMatch: (playerCount?: number) => void;
  startMultiplayerMatch: (players: PlayerState[], matchStartTime: number, localPlayerIndex: number) => void;
  applyRemoteAction: (action: GameAction) => void;
  tick: (now: number) => void;
  clickForCoins: (playerId: string) => void;
  buyUpgrade: (playerId: string, upgradeId: string) => boolean;
  deployUnit: (ownerId: string, targetId: string, type: UnitType) => boolean;
  bankCoins: (playerId: string, amount: number) => void;
  setSelectedTarget: (targetId: string | null) => void;
  resolveArrivingUnits: (now: number) => void;
  reset: () => void;
}

export const createPlayer = (id: string, index: number): PlayerState => ({
  id,
  name: `Player ${index + 1}`,
  teamId: index % 2,
  color: TEAM_COLORS[index % TEAM_COLORS.length],
  economy: createInitialEconomy(),
  wallHealth: BASE_WALL_HEALTH,
  maxWallHealth: BASE_WALL_HEALTH,
  isLeader: false,
});

const initialState: GameState = {
  isMultiplayer: false,
  matchStartTime: null,
  matchEndTime: null,
  players: [],
  localPlayerId: '',
  unitsInFlight: [],
  upgradeLevels: {},
  selectedTargetId: null,
  lastUnitDeployTime: {
    runner: 0,
    bruiser: 0,
    saboteur: 0,
    defender: 0,
  },
  lastBotClickTime: 0,
  lastBotDeployTime: {},
  matchStats: {},
  lastStealFeedback: null,
  recentImpacts: [],
  attackCountByTarget: {},
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startMatch: (playerCount = 2) => {
    const players: PlayerState[] = Array.from({ length: playerCount }, (_, i) =>
      createPlayer(`player-${i}`, i)
    );
    players[0].name = 'You';
    const matchStats: Record<string, MatchStats> = {};
    players.forEach((p) => {
      matchStats[p.id] = { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
    });
    set({
      ...initialState,
      isMultiplayer: false,
      matchStartTime: Date.now(),
      players,
      localPlayerId: 'player-0',
      selectedTargetId: playerCount > 1 ? 'player-1' : null,
      matchStats,
      attackCountByTarget: {},
    });
  },

  startMultiplayerMatch: (players, matchStartTime, localPlayerIndex) => {
    const matchStats: Record<string, MatchStats> = {};
    players.forEach((p) => {
      matchStats[p.id] = { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
    });
    const localPlayerId = players[localPlayerIndex]?.id ?? players[0].id;
    const selectedTargetId = players.find((p) => p.id !== localPlayerId)?.id ?? null;
    set({
      ...initialState,
      isMultiplayer: true,
      matchStartTime,
      players,
      localPlayerId,
      selectedTargetId,
      matchStats,
      attackCountByTarget: {},
    });
  },

  applyRemoteAction: (action) => {
    const { localPlayerId } = get();
    if (action.senderId === localPlayerId) return;

    if (action.type === 'start') return;
    if (action.type === 'click') {
      const { players } = get();
      const player = players.find((p) => p.id === action.playerId);
      if (!player) return;
      const maxWealth = Math.max(...players.map((p) => p.economy.securedWealth));
      const isBehind = player.economy.securedWealth < maxWealth * 0.6 && maxWealth > 100;
      const gain = player.economy.coinPerClick * (isBehind ? 1.1 : 1);
      set({
        players: players.map((p) =>
          p.id === action.playerId
            ? { ...p, economy: { ...p.economy, looseCoins: p.economy.looseCoins + gain } }
            : p
        ),
      });
    } else if (action.type === 'bank') {
      const { players } = get();
      const player = players.find((p) => p.id === action.playerId);
      if (!player) return;
      const newEconomy = bankCoins(player.economy, action.amount);
      set({
        players: players.map((p) =>
          p.id === action.playerId ? { ...p, economy: newEconomy } : p
        ),
      });
    } else if (action.type === 'upgrade') {
      const { players, upgradeLevels } = get();
      const player = players.find((p) => p.id === action.playerId);
      if (!player) return false;
      const level = upgradeLevels[action.upgradeId] ?? 0;
      const cost = getUpgradeCost(action.upgradeId, level);
      if (player.economy.looseCoins < cost) return;
      const newEconomy = applyUpgradeEffect(
        { ...player.economy, looseCoins: player.economy.looseCoins - cost },
        action.upgradeId,
        level + 1
      );
      set({
        players: players.map((p) =>
          p.id === action.playerId ? { ...p, economy: newEconomy } : p
        ),
        upgradeLevels: { ...upgradeLevels, [action.upgradeId]: level + 1 },
      });
    } else if (action.type === 'deploy') {
      const { players, unitsInFlight, lastUnitDeployTime } = get();
      const owner = players.find((p) => p.id === action.ownerId);
      const stats = UNIT_STATS[action.unitType as UnitType];
      if (!owner || !stats) return;
      const now = Date.now();
      const cooldown = lastUnitDeployTime[action.unitType as UnitType] ?? 0;
      if (now - cooldown < stats.cooldownMs) return;
      if (owner.economy.supply < stats.supplyCost) return;
      if (owner.economy.looseCoins < stats.coinCost) return;
      const unit = createUnitInFlight(
        action.unitType as UnitType,
        action.ownerId,
        action.targetId,
        now
      );
      const { matchStats, attackCountByTarget } = get();
      const ownerStats = matchStats[action.ownerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0 };
      const key = `${action.ownerId}-${action.targetId}`;
      const count = (attackCountByTarget[key] ?? 0) + 1;
      const newEconomy = {
        ...owner.economy,
        supply: owner.economy.supply - stats.supplyCost,
        looseCoins: owner.economy.looseCoins - stats.coinCost,
      };
      set({
        players: players.map((p) =>
          p.id === action.ownerId ? { ...p, economy: newEconomy } : p
        ),
        unitsInFlight: [...unitsInFlight, unit],
        lastUnitDeployTime: {
          ...lastUnitDeployTime,
          [action.unitType as UnitType]: now,
        },
        matchStats: {
          ...matchStats,
          [action.ownerId]: { ...ownerStats, attacksSent: ownerStats.attacksSent + 1 },
        },
        attackCountByTarget: { ...attackCountByTarget, [key]: count },
      });
    }
  },

  tick: (now: number) => {
    const { matchStartTime, matchEndTime, players, localPlayerId, upgradeLevels, lastBotClickTime, lastBotDeployTime } = get();
    if (!matchStartTime || matchEndTime) return;

    const elapsed = (now - matchStartTime) / 1000;
    if (elapsed >= MATCH_DURATION_SEC) {
      set({ matchEndTime: now });
      return;
    }

    const winner = players.find((p) =>
      hasReachedWinThreshold(p.economy.securedWealth)
    );
    if (winner) {
      set({ matchEndTime: now });
      return;
    }

    const maxWealth = Math.max(
      ...players.map((p) => p.economy.securedWealth)
    );
    let updatedPlayers = players.map((p) => {
      const economy = { ...p.economy };
      economy.autoIncomePerSec = economy.autoIncomePerSec || 0;
      economy.supplyRate = economy.supplyRate ?? BASE_SUPPLY_RATE;
      economy.looseCoins += economy.autoIncomePerSec / 60;
      economy.supply = Math.min(SUPPLY_CAP, economy.supply + economy.supplyRate / 60);
      return {
        ...p,
        economy,
        isLeader: p.economy.securedWealth === maxWealth && maxWealth > 0,
      };
    });

    const { unitsInFlight } = get();
    const updatedUnits = unitsInFlight.map((u) => ({
      ...u,
      progress: Math.min(
        1,
        u.progress + (1000 / 60 / 3000) * (UNIT_STATS[u.type]?.speed ?? 1)
      ),
    }));

    let newLastBotClickTime = lastBotClickTime;
    let newLastBotDeployTime = { ...lastBotDeployTime };
    let newUpgradeLevels = { ...upgradeLevels };
    let newUnitsInFlight = [...updatedUnits];

    const isMultiplayer = get().isMultiplayer;
    const bots = isMultiplayer ? [] : updatedPlayers.filter((p) => p.id !== localPlayerId);
    let aiActed = false;
    for (const bot of bots) {
      if (aiActed) break;
      const enemies = updatedPlayers.filter((p) => p.id !== bot.id);
      const action = getAIAction(
        bot,
        enemies,
        newUpgradeLevels,
        newLastBotClickTime,
        now,
        newLastBotDeployTime[bot.id] ?? 0
      );
      if (action === 'bank') {
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (idx >= 0 && updatedPlayers[idx].economy.looseCoins > 0) {
          const b = updatedPlayers[idx];
          const toBank = Math.floor(b.economy.looseCoins);
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = {
            ...b,
            economy: {
              ...b.economy,
              looseCoins: 0,
              securedWealth: b.economy.securedWealth + toBank,
            },
          };
          aiActed = true;
        }
      } else if (action === 'click') {
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (idx >= 0) {
          const b = updatedPlayers[idx];
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = {
            ...b,
            economy: {
              ...b.economy,
              looseCoins: b.economy.looseCoins + b.economy.coinPerClick,
            },
          };
          newLastBotClickTime = now;
          aiActed = true;
        }
      } else if (action && 'upgrade' in action) {
        const level = newUpgradeLevels[action.upgrade] ?? 0;
        const cost = getUpgradeCost(action.upgrade, level);
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (idx >= 0 && updatedPlayers[idx].economy.looseCoins >= cost) {
          const b = updatedPlayers[idx];
          const newEco = applyUpgradeEffect(
            { ...b.economy, looseCoins: b.economy.looseCoins - cost },
            action.upgrade,
            level + 1
          );
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = { ...b, economy: newEco };
          newUpgradeLevels = { ...newUpgradeLevels, [action.upgrade]: level + 1 };
          aiActed = true;
        }
      } else if (action && 'deploy' in action) {
        const stats = UNIT_STATS[action.deploy.type];
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (
          idx >= 0 &&
          stats &&
          updatedPlayers[idx].economy.supply >= stats.supplyCost &&
          updatedPlayers[idx].economy.looseCoins >= stats.coinCost
        ) {
          const b = updatedPlayers[idx];
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = {
            ...b,
            economy: {
              ...b.economy,
              supply: b.economy.supply - stats.supplyCost,
              looseCoins: b.economy.looseCoins - stats.coinCost,
            },
          };
          newUnitsInFlight = [
            ...newUnitsInFlight,
            createUnitInFlight(action.deploy.type, bot.id, action.deploy.targetId, now),
          ];
          newLastBotDeployTime = { ...newLastBotDeployTime, [bot.id]: now };
          aiActed = true;
        }
      }
    }

    set({
      players: updatedPlayers,
      unitsInFlight: newUnitsInFlight,
      upgradeLevels: newUpgradeLevels,
      lastBotClickTime: newLastBotClickTime,
      lastBotDeployTime: newLastBotDeployTime,
    });
  },

  clickForCoins: (playerId: string) => {
    const { players, localPlayerId, isMultiplayer } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const maxWealth = Math.max(...players.map((p) => p.economy.securedWealth));
    const isBehind = player.economy.securedWealth < maxWealth * 0.6 && maxWealth > 100;
    const catchUpBonus = isBehind && playerId === localPlayerId ? 1.1 : 1;
    const gain = player.economy.coinPerClick * catchUpBonus;
    const newEconomy = {
      ...player.economy,
      looseCoins: player.economy.looseCoins + gain,
    };
    set({
      players: players.map((p) =>
        p.id === playerId ? { ...p, economy: newEconomy } : p
      ),
    });
    if (isMultiplayer && playerId === localPlayerId) {
      broadcastAction({ type: 'click', playerId, senderId: localPlayerId });
    }
  },

  buyUpgrade: (playerId: string, upgradeId: string) => {
    const { players, upgradeLevels } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return false;
    const level = upgradeLevels[upgradeId] ?? 0;
    const cost = getUpgradeCost(upgradeId, level);
    if (player.economy.looseCoins < cost) return false;

    const newEconomy = {
      ...player.economy,
      looseCoins: player.economy.looseCoins - cost,
    };
    const newEconomyWithEffect = applyUpgradeEffect(
      newEconomy,
      upgradeId,
      level + 1
    );

    set({
      players: players.map((p) =>
        p.id === playerId ? { ...p, economy: newEconomyWithEffect } : p
      ),
      upgradeLevels: { ...upgradeLevels, [upgradeId]: level + 1 },
    });
    if (get().isMultiplayer && playerId === get().localPlayerId) {
      broadcastAction({ type: 'upgrade', playerId, upgradeId, senderId: get().localPlayerId });
    }
    return true;
  },

  deployUnit: (ownerId: string, targetId: string, type: UnitType) => {
    const { players, unitsInFlight, lastUnitDeployTime } = get();
    const owner = players.find((p) => p.id === ownerId);
    const stats = UNIT_STATS[type];
    if (!owner || !stats) return false;

    const now = Date.now();
    const cooldown = lastUnitDeployTime[type] ?? 0;
    if (now - cooldown < stats.cooldownMs) return false;
    if (owner.economy.supply < stats.supplyCost) return false;
    if (owner.economy.looseCoins < stats.coinCost) return false;

    const newEconomy = {
      ...owner.economy,
      supply: owner.economy.supply - stats.supplyCost,
      looseCoins: owner.economy.looseCoins - stats.coinCost,
    };

    const unit = createUnitInFlight(type, ownerId, targetId, now);
    const { matchStats, attackCountByTarget } = get();
    const ownerStats = matchStats[ownerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0 };
    const key = `${ownerId}-${targetId}`;
    const count = (attackCountByTarget[key] ?? 0) + 1;

    set({
      players: players.map((p) =>
        p.id === ownerId ? { ...p, economy: newEconomy } : p
      ),
      unitsInFlight: [...unitsInFlight, unit],
      lastUnitDeployTime: {
        ...lastUnitDeployTime,
        [type]: now,
      },
      matchStats: {
        ...matchStats,
        [ownerId]: { ...ownerStats, attacksSent: ownerStats.attacksSent + 1 },
      },
      attackCountByTarget: { ...attackCountByTarget, [key]: count },
    });
    if (get().isMultiplayer && ownerId === get().localPlayerId) {
      broadcastAction({
        type: 'deploy',
        ownerId,
        targetId,
        unitType: type,
        senderId: get().localPlayerId,
      });
    }
    return true;
  },

  bankCoins: (playerId: string, amount: number) => {
    const { players, localPlayerId, isMultiplayer } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const newEconomy = bankCoins(player.economy, amount);
    set({
      players: players.map((p) =>
        p.id === playerId ? { ...p, economy: newEconomy } : p
      ),
    });
    if (isMultiplayer && playerId === localPlayerId) {
      broadcastAction({ type: 'bank', playerId, amount, senderId: localPlayerId });
    }
  },

  setSelectedTarget: (targetId: string | null) => {
    set({ selectedTargetId: targetId });
  },

  resolveArrivingUnits: (_now: number) => {
    const { unitsInFlight, players, matchStats, localPlayerId, attackCountByTarget } = get();
    const arriving = unitsInFlight.filter((u) => u.progress >= 1);
    if (arriving.length === 0) return;

    const maxWealth = Math.max(...players.map((p) => p.economy.securedWealth));
    const leaderId = players.find((p) => p.economy.securedWealth === maxWealth && maxWealth > 0)?.id;

    let newPlayers = [...players];
    let newStats = { ...matchStats };
    let totalStolenByLocal = 0;

    for (const u of arriving) {
      const target = newPlayers.find((p) => p.id === u.targetId);
      const stats = UNIT_STATS[u.type];
      if (!target || !stats) continue;

      let stealAmount = Math.min(stats.coinSteal, target.economy.looseCoins);
      if (u.targetId === leaderId && stealAmount > 0) {
        stealAmount = Math.min(target.economy.looseCoins, Math.ceil(stealAmount * 1.1));
      }
      const attackKey = `${u.ownerId}-${u.targetId}`;
      const attackCount = attackCountByTarget[attackKey] ?? 1;
      if (attackCount > 3) {
        stealAmount = Math.floor(stealAmount * Math.max(0.5, 1 - (attackCount - 3) * 0.1));
      }
      const wallDamage = stats.wallDamage;

      const targetStats = newStats[u.targetId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
      const ownerStats = newStats[u.ownerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };

      const newOwnerBiggest = Math.max(ownerStats.biggestSingleSteal ?? 0, stealAmount);

      if (u.ownerId === localPlayerId && stealAmount > 0) totalStolenByLocal += stealAmount;
      if (u.targetId === localPlayerId) audioService.playImpact();
      if (u.ownerId === localPlayerId && stealAmount > 0) audioService.playStolenCoin();

      newStats = {
        ...newStats,
        [u.targetId]: { ...targetStats, coinsLost: targetStats.coinsLost + stealAmount },
        [u.ownerId]: { ...ownerStats, coinsStolen: ownerStats.coinsStolen + stealAmount, biggestSingleSteal: newOwnerBiggest },
      };

      newPlayers = newPlayers.map((p) => {
        if (p.id === u.targetId) {
          return {
            ...p,
            economy: {
              ...p.economy,
              looseCoins: Math.max(0, p.economy.looseCoins - stealAmount),
            },
            wallHealth: Math.max(0, p.wallHealth - wallDamage),
          };
        }
        if (p.id === u.ownerId && stealAmount > 0) {
          return {
            ...p,
            economy: {
              ...p.economy,
              looseCoins: p.economy.looseCoins + stealAmount,
            },
          };
        }
        return p;
      });
    }

    const stealFeedback: StealFeedback | null =
      totalStolenByLocal > 0 ? { amount: totalStolenByLocal, timestamp: Date.now() } : null;

    const now = Date.now();
    const newImpacts: ImpactEvent[] = [...new Set(arriving.map((u) => u.targetId))].map(
      (targetId) => ({ targetId, timestamp: now })
    );

    set({
      players: newPlayers,
      unitsInFlight: unitsInFlight.filter((u) => u.progress < 1),
      matchStats: newStats,
      lastStealFeedback: stealFeedback,
      recentImpacts: newImpacts,
    });
  },

  reset: () => {
    const { isMultiplayer } = get();
    if (isMultiplayer) disconnect();
    set({ ...initialState, isMultiplayer: false });
  },
}));
