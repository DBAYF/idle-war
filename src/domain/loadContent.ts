import { z } from 'zod';
import type { UnitStats, UpgradeDefinition } from './types';

const UnitStatsSchema = z.object({
  type: z.string(),
  name: z.string(),
  flavour: z.string().optional(),
  speed: z.number(),
  durability: z.number(),
  coinSteal: z.number(),
  wallDamage: z.number(),
  saboteurDuration: z.number(),
  supplyCost: z.number(),
  coinCost: z.number(),
  cooldownMs: z.number(),
});

const UpgradeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['manual', 'auto', 'supply', 'banking', 'unit', 'defence']),
  baseCost: z.number(),
  costMultiplier: z.number(),
  maxLevel: z.number(),
  effectPerLevel: z.number(),
});

const UnitsArraySchema = z.array(UnitStatsSchema);
const UpgradesArraySchema = z.array(UpgradeDefinitionSchema);

const EMBEDDED_UNITS: UnitStats[] = [
  { type: 'runner', name: 'Runner', speed: 1.5, durability: 0.3, coinSteal: 15, wallDamage: 0, saboteurDuration: 0, supplyCost: 3, coinCost: 20, cooldownMs: 2000 },
  { type: 'bruiser', name: 'Bruiser', speed: 0.6, durability: 1.5, coinSteal: 5, wallDamage: 25, saboteurDuration: 0, supplyCost: 5, coinCost: 50, cooldownMs: 4000 },
  { type: 'saboteur', name: 'Saboteur', speed: 1, durability: 0.6, coinSteal: 8, wallDamage: 0, saboteurDuration: 5000, supplyCost: 4, coinCost: 35, cooldownMs: 3500 },
  { type: 'defender', name: 'Defender', speed: 0, durability: 2, coinSteal: 0, wallDamage: 0, saboteurDuration: 0, supplyCost: 3, coinCost: 40, cooldownMs: 6000 },
];

const EMBEDDED_UPGRADES: UpgradeDefinition[] = [
  { id: 'click_power', name: 'Click Power', category: 'manual', baseCost: 25, costMultiplier: 1.4, maxLevel: 10, effectPerLevel: 2 },
  { id: 'auto_miner', name: 'Auto Miner', category: 'auto', baseCost: 50, costMultiplier: 1.5, maxLevel: 8, effectPerLevel: 1.5 },
  { id: 'supply_gen', name: 'Supply Generator', category: 'supply', baseCost: 40, costMultiplier: 1.45, maxLevel: 6, effectPerLevel: 0.08 },
  { id: 'bank_shield', name: 'Bank Shield', category: 'banking', baseCost: 80, costMultiplier: 1.6, maxLevel: 4, effectPerLevel: 0.1 },
];

import unitsJson from '../../content/units.json';
import upgradesJson from '../../content/upgrades.json';

function toUnitsRecord(arr: UnitStats[]): Record<string, UnitStats> {
  const rec: Record<string, UnitStats> = {};
  for (const u of arr) {
    rec[u.type] = u;
  }
  return rec;
}

let cachedUnits: Record<string, UnitStats> | null = null;
let cachedUpgrades: UpgradeDefinition[] | null = null;

export function loadUnits(): Record<string, UnitStats> {
  if (cachedUnits) return cachedUnits;
  try {
    const parsed = UnitsArraySchema.parse(unitsJson) as UnitStats[];
    cachedUnits = toUnitsRecord(parsed);
    return cachedUnits;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[loadContent] Failed to load units.json, using embedded:', e);
    }
    cachedUnits = toUnitsRecord(EMBEDDED_UNITS);
    return cachedUnits;
  }
}

export function loadUpgrades(): UpgradeDefinition[] {
  if (cachedUpgrades) return cachedUpgrades;
  try {
    cachedUpgrades = UpgradesArraySchema.parse(upgradesJson) as UpgradeDefinition[];
    return cachedUpgrades;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[loadContent] Failed to load upgrades.json, using embedded:', e);
    }
    cachedUpgrades = [...EMBEDDED_UPGRADES];
    return cachedUpgrades;
  }
}
