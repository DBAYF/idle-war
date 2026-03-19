import { z } from 'zod';
import { UNIT_STATS, UPGRADE_DEFINITIONS } from './constants';

const UnitStatsSchema = z.object({
  type: z.string(),
  name: z.string(),
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

const UnitsSchema = z.record(z.string(), UnitStatsSchema);
const UpgradesSchema = z.array(UpgradeDefinitionSchema);

export function validateContent(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    UnitsSchema.parse(UNIT_STATS);
  } catch (e) {
    errors.push(`Units: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    UpgradesSchema.parse(UPGRADE_DEFINITIONS);
  } catch (e) {
    errors.push(`Upgrades: ${e instanceof Error ? e.message : String(e)}`);
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
