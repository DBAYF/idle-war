import type { MatchConfig, MatchMode } from '../../domain/types';
import { SUPPLY_SCARCITY_PRESETS } from '../../domain/constants';

interface SetupSummaryProps {
  config: MatchConfig;
  mode: MatchMode;
  showAi?: boolean;
}

function getSupplyPresetName(config: MatchConfig): string {
  for (const [name, preset] of Object.entries(SUPPLY_SCARCITY_PRESETS)) {
    if (
      preset.baseSupplyRate === config.baseSupplyRate &&
      preset.supplyCap === config.supplyCap &&
      preset.initialSupply === config.initialSupply
    ) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return 'Custom';
}

export function SetupSummary({ config, mode, showAi = true }: SetupSummaryProps) {
  const durationMin = config.durationSec / 60;
  const supplyName = getSupplyPresetName(config);
  const aiName = config.aiDifficulty.charAt(0).toUpperCase() + config.aiDifficulty.slice(1);

  const modeLabel = showAi ? `${mode.toUpperCase()} vs CPU` : mode.toUpperCase();
  const parts: string[] = [
    modeLabel,
    `${durationMin} min`,
    `First to ${config.winThreshold} wins`,
  ];
  if (showAi) {
    parts.push(`${aiName} AI`);
    parts.push(`${supplyName} supply`);
  }

  return (
    <div className="setup-summary" role="status">
      {parts.join(' · ')}
    </div>
  );
}
