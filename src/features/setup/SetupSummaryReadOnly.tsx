import type { MatchConfig } from '../../domain/types';
import { SUPPLY_SCARCITY_PRESETS } from '../../domain/constants';

interface SetupSummaryReadOnlyProps {
  config: MatchConfig | null;
  className?: string;
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

export function SetupSummaryReadOnly({ config, className }: SetupSummaryReadOnlyProps) {
  if (config == null) {
    return (
      <p className={`setup-summary-placeholder ${className ?? ''}`.trim()} aria-live="polite">
        Waiting for host to set rules…
      </p>
    );
  }
  const durationMin = config.durationSec / 60;
  const supplyName = getSupplyPresetName(config);
  const parts: string[] = [
    '1v1',
    `${durationMin} min`,
    `First to ${config.winThreshold} wins`,
    `${supplyName} supply`,
  ];
  return (
    <div className={`setup-summary setup-summary-readonly ${className ?? ''}`.trim()} role="status" aria-live="polite">
      {parts.join(' · ')}
    </div>
  );
}
