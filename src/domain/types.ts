/** Core domain types for the economy-war PvP game */

export type UnitType = 'runner' | 'bruiser' | 'saboteur' | 'defender';

export type MatchMode = '1v1' | '2v2' | 'ffa';

export interface UnitStats {
  type: UnitType;
  name: string;
  speed: number;
  durability: number;
  coinSteal: number;
  wallDamage: number;
  saboteurDuration: number;
  supplyCost: number;
  coinCost: number;
  cooldownMs: number;
}

export interface PlayerEconomy {
  looseCoins: number;
  securedWealth: number;
  supply: number;
  supplyRate: number;
  coinPerClick: number;
  autoIncomePerSec: number;
}

export interface PlayerState {
  id: string;
  name: string;
  teamId?: number;
  color: string;
  economy: PlayerEconomy;
  wallHealth: number;
  maxWallHealth: number;
  isLeader: boolean;
}

export interface UnitInFlight {
  id: string;
  type: UnitType;
  ownerId: string;
  targetId: string;
  progress: number;
  spawnTime: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  category: 'manual' | 'auto' | 'banking' | 'supply' | 'unit' | 'defence';
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effectPerLevel: number;
}

export interface MatchConfig {
  mode: MatchMode;
  durationSec: number;
  winThreshold: number;
  baseClickValue: number;
  baseSupplyRate: number;
}
