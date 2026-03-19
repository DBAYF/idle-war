/** Main game/match state store */

import { create } from 'zustand';
import type { PlayerState, UnitInFlight, UnitType, MatchConfig } from '../domain/types';
import {
  createInitialEconomy,
  getUpgradeCost,
  applyUpgradeEffect,
  bankCoins,
  hasReachedWinThreshold,
} from '../domain/economy';
import { createUnitInFlight, resolveUnitArrival, updateUnitProgress, getShieldReduction } from '../domain/combat';
import { getAIAction } from '../domain/ai';
import {
  UNIT_STATS,
  TEAM_COLORS,
  BASE_WALL_HEALTH,
  MATCH_DURATION_SEC,
  SUPPLY_CAP,
  BASE_SUPPLY_RATE,
  DEFAULT_MATCH_CONFIG,
  TICK_MS,
  DEFENDER_SHIELD_DURATION_MS,
  DEFENDER_SHIELD_PERCENT,
  SABOTEUR_DEBUFF_MULTIPLIER,
} from '../domain/constants';
import { getPvCpuClickCooldownMs } from '../domain/configHelpers';
import { audioService } from '../shared/audio/audioService';
import { broadcastAction, disconnect, type GameAction } from '../shared/network/matchService';
import { useUIStore } from './uiStore';

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
  amount?: number;
}

export interface GameState {
  isMultiplayer: boolean;
  peerDisconnected: boolean;
  matchStartTime: number | null;
  matchEndTime: number | null;
  tickIndex: number;
  matchConfig: MatchConfig | null;
  players: PlayerState[];
  localPlayerId: string;
  unitsInFlight: UnitInFlight[];
  upgradeLevels: UpgradeLevels;
  selectedTargetId: string | null;
  lastUnitDeployTime: Record<UnitType, number>;
  lastBotClickTime: Record<string, number>;
  lastBotDeployTime: Record<string, number>;
  lastPlayerClickTime: number;
  matchStats: Record<string, MatchStats>;
  lastStealFeedback: StealFeedback | null;
  recentImpacts: ImpactEvent[];
  attackCountByTarget: Record<string, number>;
  lastBotActedTick: number | null;
  lastBotAction: { botId: string; action: string; tickIndex: number } | null;
  lastRoomId: string | null;
  wasHost: boolean;
}

interface GameActions {
  startMatch: (playerCount?: number, config?: Partial<MatchConfig>) => void;
  startMultiplayerMatch: (players: PlayerState[], matchStartTime: number, localPlayerIndex: number, matchConfig?: MatchConfig) => void;
  applyRemoteAction: (action: GameAction) => void;
  tick: () => void;
  clickForCoins: (playerId: string) => boolean;
  buyUpgrade: (playerId: string, upgradeId: string) => boolean;
  deployUnit: (ownerId: string, targetId: string, type: UnitType) => true | 'cooldown' | 'supply' | 'coins';
  bankCoins: (playerId: string, amount: number) => void;
  setSelectedTarget: (targetId: string | null) => void;
  resolveArrivingUnits: () => void;
  setPeerDisconnected: (v: boolean) => void;
  setLastRoomId: (id: string | null) => void;
  setWasHost: (v: boolean) => void;
  clearLastRoom: () => void;
  reset: () => void;
}

export const createPlayer = (id: string, index: number, config?: Partial<MatchConfig>): PlayerState => ({
  id,
  name: `Player ${index + 1}`,
  teamId: index % 2,
  color: TEAM_COLORS[index % TEAM_COLORS.length],
  economy: createInitialEconomy(config),
  wallHealth: BASE_WALL_HEALTH,
  maxWallHealth: BASE_WALL_HEALTH,
  isLeader: false,
});

const initialState: GameState = {
  isMultiplayer: false,
  peerDisconnected: false,
  matchStartTime: null,
  matchEndTime: null,
  tickIndex: 0,
  matchConfig: null,
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
  lastBotClickTime: {},
  lastBotDeployTime: {},
  lastPlayerClickTime: 0,
  matchStats: {},
  lastStealFeedback: null,
  recentImpacts: [],
  attackCountByTarget: {},
  lastBotActedTick: null,
  lastBotAction: null,
  lastRoomId: null,
  wasHost: false,
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  startMatch: (playerCount = 2, config?: Partial<MatchConfig>) => {
    const matchConfig: MatchConfig = { ...DEFAULT_MATCH_CONFIG, ...config };
    const players: PlayerState[] = Array.from({ length: playerCount }, (_, i) =>
      createPlayer(`player-${i}`, i, matchConfig)
    );
    players[0].name = 'You';
    const matchStats: Record<string, MatchStats> = {};
    players.forEach((p) => {
      matchStats[p.id] = { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
    });
    useUIStore.getState().setLastDeployError(null);
    useUIStore.getState().setLastDeploySuccess(null);
    const matchStartTime = Date.now();
    const localId = 'player-0';
    const local = players.find((p) => p.id === localId);
    const firstEnemy =
      players.find(
        (p) =>
          p.id !== localId &&
          (local?.teamId == null || (p.teamId ?? -1) !== (local.teamId ?? -1))
      ) ?? players.find((p) => p.id !== localId);
    const selectedTargetId = firstEnemy?.id ?? (playerCount > 1 ? 'player-1' : null);
    set({
      ...initialState,
      isMultiplayer: false,
      matchStartTime,
      tickIndex: 0,
      matchConfig,
      players,
      localPlayerId: localId,
      selectedTargetId,
      matchStats,
      attackCountByTarget: {},
    });
  },

  startMultiplayerMatch: (players, matchStartTime, localPlayerIndex, matchConfig?: MatchConfig) => {
    useUIStore.getState().setLastDeployError(null);
    useUIStore.getState().setLastDeploySuccess(null);
    const config = matchConfig ?? DEFAULT_MATCH_CONFIG;
    const matchStats: Record<string, MatchStats> = {};
    players.forEach((p) => {
      matchStats[p.id] = { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
    });
    const localPlayerId = players[localPlayerIndex]?.id ?? players[0].id;
    const local = players.find((p) => p.id === localPlayerId);
    const firstEnemy =
      players.find(
        (p) =>
          p.id !== localPlayerId &&
          (local?.teamId == null || (p.teamId ?? -1) !== (local.teamId ?? -1))
      ) ?? players.find((p) => p.id !== localPlayerId);
    const selectedTargetId = firstEnemy?.id ?? null;
    set({
      ...initialState,
      isMultiplayer: true,
      peerDisconnected: false,
      matchStartTime,
      tickIndex: 0,
      matchConfig: config,
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
      const { players, matchStartTime, tickIndex, upgradeLevels } = get();
      const player = players.find((p) => p.id === action.playerId);
      if (!player) return;
      const newEconomy = bankCoins(player.economy, action.amount);
      const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : Date.now();
      const bankShieldLevel = upgradeLevels['bank_shield'] ?? 0;
      const bankShieldUntil = bankShieldLevel > 0 ? simulationTime + 2000 * (1 + bankShieldLevel * 0.1) : undefined;
      const bankShieldPercent = bankShieldLevel > 0 ? 0.1 * bankShieldLevel : undefined;
      set({
        players: players.map((p) =>
          p.id === action.playerId
            ? {
                ...p,
                economy: newEconomy,
                ...(bankShieldUntil != null && bankShieldPercent != null
                  ? { bankShieldUntil, bankShieldPercent }
                  : {}),
              }
            : p
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
      const { players, unitsInFlight, lastUnitDeployTime, matchStartTime, tickIndex } = get();
      const owner = players.find((p) => p.id === action.ownerId);
      const stats = UNIT_STATS[action.unitType as UnitType];
      if (!owner || !stats || !matchStartTime) return;
      const simulationTime = matchStartTime + tickIndex * TICK_MS;
      const cooldown = lastUnitDeployTime[action.unitType as UnitType] ?? 0;
      if (simulationTime - cooldown < stats.cooldownMs) return;
      if (owner.economy.supply < stats.supplyCost) return;
      if (owner.economy.looseCoins < stats.coinCost) return;
      const newEconomy = {
        ...owner.economy,
        supply: owner.economy.supply - stats.supplyCost,
        looseCoins: owner.economy.looseCoins - stats.coinCost,
      };
      if (action.unitType === 'defender') {
        const shieldUntil = simulationTime + DEFENDER_SHIELD_DURATION_MS;
        set({
          players: players.map((p) =>
            p.id === action.ownerId
              ? {
                  ...p,
                  economy: newEconomy,
                  defenderShieldUntil: shieldUntil,
                  defenderShieldPercent: DEFENDER_SHIELD_PERCENT,
                }
              : p
          ),
          lastUnitDeployTime: {
            ...lastUnitDeployTime,
            [action.unitType as UnitType]: simulationTime,
          },
        });
      } else {
        const unit = createUnitInFlight(
          action.unitType as UnitType,
          action.ownerId,
          action.targetId,
          simulationTime
        );
        const { matchStats, attackCountByTarget } = get();
        const ownerStats = matchStats[action.ownerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0 };
        const key = `${action.ownerId}-${action.targetId}`;
        const count = (attackCountByTarget[key] ?? 0) + 1;
        set({
          players: players.map((p) =>
            p.id === action.ownerId ? { ...p, economy: newEconomy } : p
          ),
          unitsInFlight: [...unitsInFlight, unit],
          lastUnitDeployTime: {
            ...lastUnitDeployTime,
            [action.unitType as UnitType]: simulationTime,
          },
          matchStats: {
            ...matchStats,
            [action.ownerId]: { ...ownerStats, attacksSent: ownerStats.attacksSent + 1 },
          },
          attackCountByTarget: { ...attackCountByTarget, [key]: count },
        });
      }
    }
  },

  tick: () => {
    const { matchStartTime, matchEndTime, matchConfig, players, localPlayerId, upgradeLevels, lastBotClickTime, lastBotDeployTime, tickIndex } = get();
    if (!matchStartTime || matchEndTime) return;

    const newTickIndex = tickIndex + 1;
    const simulationTime = matchStartTime + newTickIndex * TICK_MS;

    const durationSec = matchConfig?.durationSec ?? MATCH_DURATION_SEC;
    const supplyCap = matchConfig?.supplyCap ?? SUPPLY_CAP;
    const baseSupplyRate = matchConfig?.baseSupplyRate ?? BASE_SUPPLY_RATE;
    const aiDifficulty = matchConfig?.aiDifficulty ?? 'normal';

    const elapsed = (simulationTime - matchStartTime) / 1000;
    if (elapsed >= durationSec) {
      set({ matchEndTime: simulationTime, tickIndex: newTickIndex });
      return;
    }

    const winner = players.find((p) =>
      hasReachedWinThreshold(p.economy.securedWealth, matchConfig)
    );
    if (winner) {
      set({ matchEndTime: simulationTime, tickIndex: newTickIndex });
      return;
    }

    const maxWealth = Math.max(
      ...players.map((p) => p.economy.securedWealth)
    );
    let updatedPlayers = players.map((p) => {
      const economy = { ...p.economy };
      economy.autoIncomePerSec = economy.autoIncomePerSec || 0;
      economy.supplyRate = economy.supplyRate ?? baseSupplyRate;
      const saboteurMult =
        p.saboteurDebuffUntil != null && simulationTime < p.saboteurDebuffUntil
          ? SABOTEUR_DEBUFF_MULTIPLIER
          : 1;
      economy.looseCoins += (economy.autoIncomePerSec / 60) * saboteurMult;
      economy.supply = Math.min(supplyCap, economy.supply + economy.supplyRate / 60);
      return {
        ...p,
        economy,
        isLeader: p.economy.securedWealth === maxWealth && maxWealth > 0,
      };
    });

    const { unitsInFlight } = get();
    const updatedUnits = unitsInFlight.map((u) =>
      updateUnitProgress(u, simulationTime)
    );

    let newLastBotClickTime = { ...lastBotClickTime };
    let newLastBotDeployTime = { ...lastBotDeployTime };
    let newUpgradeLevels = { ...upgradeLevels };
    let newUnitsInFlight = [...updatedUnits];

    const isMultiplayer = get().isMultiplayer;
    const bots = isMultiplayer ? [] : updatedPlayers.filter((p) => p.id !== localPlayerId);
    let botActedThisTick = false;
    let lastBotActionThisTick: { botId: string; action: string; tickIndex: number } | null = null;
    for (const bot of bots) {
      const enemies = updatedPlayers.filter((p) => p.id !== bot.id);
      const action = getAIAction(
        bot,
        enemies,
        newUpgradeLevels,
        newLastBotClickTime[bot.id] ?? 0,
        simulationTime,
        newLastBotDeployTime[bot.id] ?? 0,
        aiDifficulty,
        newUnitsInFlight,
        supplyCap
      );
      if (action === 'bank') {
        botActedThisTick = true;
        lastBotActionThisTick = { botId: bot.id, action: 'bank', tickIndex: newTickIndex };
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (idx >= 0 && updatedPlayers[idx].economy.looseCoins > 0) {
          const b = updatedPlayers[idx];
          const toBank = Math.floor(b.economy.looseCoins);
          const bankShieldLevel = newUpgradeLevels['bank_shield'] ?? 0;
          const bankShieldUntil = bankShieldLevel > 0 ? simulationTime + 2000 * (1 + bankShieldLevel * 0.1) : undefined;
          const bankShieldPercent = bankShieldLevel > 0 ? 0.1 * bankShieldLevel : undefined;
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = {
            ...b,
            economy: {
              ...b.economy,
              looseCoins: 0,
              securedWealth: b.economy.securedWealth + toBank,
            },
            ...(bankShieldUntil != null && bankShieldPercent != null ? { bankShieldUntil, bankShieldPercent } : {}),
          };
        }
      } else if (action === 'click') {
        botActedThisTick = true;
        lastBotActionThisTick = { botId: bot.id, action: 'click', tickIndex: newTickIndex };
        const idx = updatedPlayers.findIndex((p) => p.id === bot.id);
        if (idx >= 0) {
          const b = updatedPlayers[idx];
          const saboteurMult =
            b.saboteurDebuffUntil != null && simulationTime < b.saboteurDebuffUntil
              ? SABOTEUR_DEBUFF_MULTIPLIER
              : 1;
          updatedPlayers = [...updatedPlayers];
          updatedPlayers[idx] = {
            ...b,
            economy: {
              ...b.economy,
              looseCoins: b.economy.looseCoins + b.economy.coinPerClick * saboteurMult,
            },
          };
          newLastBotClickTime = { ...newLastBotClickTime, [bot.id]: simulationTime };
        }
      } else if (action && 'upgrade' in action) {
        botActedThisTick = true;
        lastBotActionThisTick = { botId: bot.id, action: `upgrade:${action.upgrade}`, tickIndex: newTickIndex };
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
        }
      } else if (action && 'deploy' in action) {
        botActedThisTick = true;
        lastBotActionThisTick = { botId: bot.id, action: `deploy:${action.deploy.type}`, tickIndex: newTickIndex };
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
          if (action.deploy.type === 'defender') {
            const shieldUntil = simulationTime + DEFENDER_SHIELD_DURATION_MS;
            updatedPlayers[idx] = {
              ...updatedPlayers[idx],
              defenderShieldUntil: shieldUntil,
              defenderShieldPercent: DEFENDER_SHIELD_PERCENT,
            };
          } else {
            newUnitsInFlight = [
              ...newUnitsInFlight,
              createUnitInFlight(action.deploy.type, bot.id, action.deploy.targetId, simulationTime),
            ];
          }
          newLastBotDeployTime = { ...newLastBotDeployTime, [bot.id]: simulationTime };
        }
      }
    }

    set({
      players: updatedPlayers,
      unitsInFlight: newUnitsInFlight,
      upgradeLevels: newUpgradeLevels,
      lastBotClickTime: newLastBotClickTime,
      lastBotDeployTime: newLastBotDeployTime,
      tickIndex: newTickIndex,
      lastBotActedTick: botActedThisTick ? newTickIndex : get().lastBotActedTick,
      lastBotAction: lastBotActionThisTick ?? get().lastBotAction,
    });
  },

  clickForCoins: (playerId: string) => {
    const { players, localPlayerId, isMultiplayer, matchStartTime, tickIndex, lastPlayerClickTime, matchConfig } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return false;
    const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : Date.now();

    if (!isMultiplayer && playerId === localPlayerId) {
      const cooldown = getPvCpuClickCooldownMs(matchConfig?.aiDifficulty ?? 'normal');
      if (simulationTime - lastPlayerClickTime < cooldown) return false;
    }

    const saboteurMult =
      player.saboteurDebuffUntil != null && simulationTime < player.saboteurDebuffUntil
        ? SABOTEUR_DEBUFF_MULTIPLIER
        : 1;
    const maxWealth = Math.max(...players.map((p) => p.economy.securedWealth));
    const isBehind = player.economy.securedWealth < maxWealth * 0.6 && maxWealth > 100;
    const catchUpBonus = isBehind && playerId === localPlayerId ? 1.1 : 1;
    const gain = player.economy.coinPerClick * saboteurMult * catchUpBonus;
    const newEconomy = {
      ...player.economy,
      looseCoins: player.economy.looseCoins + gain,
    };
    set({
      players: players.map((p) =>
        p.id === playerId ? { ...p, economy: newEconomy } : p
      ),
      ...(!isMultiplayer && playerId === localPlayerId ? { lastPlayerClickTime: simulationTime, lastBotActedTick: null } : {}),
    });
    if (isMultiplayer && playerId === localPlayerId) {
      broadcastAction({ type: 'click', playerId, senderId: localPlayerId });
    }
    return true;
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
      ...(playerId === get().localPlayerId ? { lastBotActedTick: null } : {}),
    });
    if (get().isMultiplayer && playerId === get().localPlayerId) {
      broadcastAction({ type: 'upgrade', playerId, upgradeId, senderId: get().localPlayerId });
    }
    return true;
  },

  deployUnit: (ownerId: string, targetId: string, type: UnitType): true | 'cooldown' | 'supply' | 'coins' => {
    const { players, unitsInFlight, lastUnitDeployTime, matchStartTime, tickIndex } = get();
    const owner = players.find((p) => p.id === ownerId);
    const stats = UNIT_STATS[type];
    if (!owner || !stats || !matchStartTime) return 'coins';

    const simulationTime = matchStartTime + tickIndex * TICK_MS;
    const cooldown = lastUnitDeployTime[type] ?? 0;
    if (simulationTime - cooldown < stats.cooldownMs) return 'cooldown';
    if (owner.economy.supply < stats.supplyCost) return 'supply';
    if (owner.economy.looseCoins < stats.coinCost) return 'coins';

    const newEconomy = {
      ...owner.economy,
      supply: owner.economy.supply - stats.supplyCost,
      looseCoins: owner.economy.looseCoins - stats.coinCost,
    };

    if (type === 'defender') {
      const shieldUntil = simulationTime + DEFENDER_SHIELD_DURATION_MS;
      set({
        players: players.map((p) =>
          p.id === ownerId
            ? {
                ...p,
                economy: newEconomy,
                defenderShieldUntil: shieldUntil,
                defenderShieldPercent: DEFENDER_SHIELD_PERCENT,
              }
            : p
        ),
        lastUnitDeployTime: {
          ...lastUnitDeployTime,
          [type]: simulationTime,
        },
        ...(ownerId === get().localPlayerId ? { lastBotActedTick: null } : {}),
      });
      if (get().isMultiplayer && ownerId === get().localPlayerId) {
        broadcastAction({
          type: 'deploy',
          ownerId,
          targetId: ownerId,
          unitType: type,
          senderId: get().localPlayerId,
        });
      }
      return true;
    }

    const unit = createUnitInFlight(type, ownerId, targetId, simulationTime);
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
        [type]: simulationTime,
      },
      matchStats: {
        ...matchStats,
        [ownerId]: { ...ownerStats, attacksSent: ownerStats.attacksSent + 1 },
      },
      attackCountByTarget: { ...attackCountByTarget, [key]: count },
      ...(ownerId === get().localPlayerId ? { lastBotActedTick: null } : {}),
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
    const { players, localPlayerId, isMultiplayer, matchStartTime, tickIndex, upgradeLevels } = get();
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const newEconomy = bankCoins(player.economy, amount);
    const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : Date.now();
    const bankShieldLevel = upgradeLevels['bank_shield'] ?? 0;
    const bankShieldUntil = bankShieldLevel > 0 ? simulationTime + 2000 * (1 + bankShieldLevel * 0.1) : undefined;
    const bankShieldPercent = bankShieldLevel > 0 ? 0.1 * bankShieldLevel : undefined;
    set({
      players: players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              economy: newEconomy,
              ...(bankShieldUntil != null && bankShieldPercent != null
                ? { bankShieldUntil, bankShieldPercent }
                : {}),
            }
          : p
      ),
      ...(playerId === localPlayerId ? { lastBotActedTick: null } : {}),
    });
    if (isMultiplayer && playerId === localPlayerId) {
      broadcastAction({ type: 'bank', playerId, amount, senderId: localPlayerId });
    }
  },

  setSelectedTarget: (targetId: string | null) => {
    set({ selectedTargetId: targetId });
  },

  setPeerDisconnected: (v: boolean) => {
    set({ peerDisconnected: v });
  },

  resolveArrivingUnits: () => {
    const { unitsInFlight, players, matchStats, localPlayerId, attackCountByTarget, matchStartTime, tickIndex } = get();
    const arriving = unitsInFlight.filter((u) => u.progress >= 1);
    if (arriving.length === 0) return;

    const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : 0;
    const maxWealth = Math.max(...players.map((p) => p.economy.securedWealth));
    const leaderId = players.find((p) => p.economy.securedWealth === maxWealth && maxWealth > 0)?.id;

    let newPlayers = [...players];
    let newStats = { ...matchStats };
    let totalStolenByLocal = 0;
    const stealByTarget: Record<string, number> = {};

    for (const u of arriving) {
      const target = newPlayers.find((p) => p.id === u.targetId);
      const stats = UNIT_STATS[u.type];
      if (!target || !stats) continue;

      const attackKey = `${u.ownerId}-${u.targetId}`;
      const attackCount = attackCountByTarget[attackKey] ?? 1;
      const isLeaderTarget = u.targetId === leaderId;
      let { stealAmount, wallDamage } = resolveUnitArrival(
        stats,
        target.economy.looseCoins,
        attackCount,
        isLeaderTarget
      );

      const shieldReduction = getShieldReduction(
        target.defenderShieldPercent,
        target.defenderShieldUntil,
        target.bankShieldPercent,
        target.bankShieldUntil,
        simulationTime
      );
      if (shieldReduction > 0) {
        stealAmount = Math.floor(stealAmount * (1 - shieldReduction));
      }
      stealAmount = Math.min(stealAmount, target.economy.looseCoins);

      const saboteurDebuffUntil =
        u.type === 'saboteur' && stats.saboteurDuration > 0
          ? simulationTime + stats.saboteurDuration
          : undefined;

      const targetStats = newStats[u.targetId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };
      const ownerStats = newStats[u.ownerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };

      const newOwnerBiggest = Math.max(ownerStats.biggestSingleSteal ?? 0, stealAmount);

      stealByTarget[u.targetId] = (stealByTarget[u.targetId] ?? 0) + stealAmount;
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
          const updates: Partial<PlayerState> = {
            economy: {
              ...p.economy,
              looseCoins: Math.max(0, p.economy.looseCoins - stealAmount),
            },
            wallHealth: Math.max(0, p.wallHealth - wallDamage),
          };
          if (saboteurDebuffUntil != null) {
            updates.saboteurDebuffUntil = saboteurDebuffUntil;
          }
          return { ...p, ...updates };
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

    const now = Date.now();
    const stealFeedback: StealFeedback | null =
      totalStolenByLocal > 0 ? { amount: totalStolenByLocal, timestamp: now } : null;

    const newImpacts: ImpactEvent[] = [...new Set(arriving.map((u) => u.targetId))].map(
      (targetId) => ({ targetId, timestamp: now, amount: stealByTarget[targetId] ?? 0 })
    );

    set({
      players: newPlayers,
      unitsInFlight: unitsInFlight.filter((u) => u.progress < 1),
      matchStats: newStats,
      lastStealFeedback: stealFeedback,
      recentImpacts: newImpacts,
    });
  },

  setLastRoomId: (id) => set({ lastRoomId: id }),
  setWasHost: (v) => set({ wasHost: v }),
  clearLastRoom: () => set({ lastRoomId: null, wasHost: false }),

  reset: () => {
    const { isMultiplayer } = get();
    if (isMultiplayer) disconnect();
    useUIStore.getState().setLastDeployError(null);
    useUIStore.getState().setLastDeploySuccess(null);
    set({ ...initialState, isMultiplayer: false, lastRoomId: null, wasHost: false });
  },
}));
