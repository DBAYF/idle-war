import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { getUpgradeCost } from '../../../../domain/economy';
import { UPGRADE_DEFINITIONS } from '../../../../domain/constants';
import { audioService } from '../../../../shared/audio/audioService';

interface UpgradeCardProps {
  upgradeId: string;
}

const tooltips: Record<string, string> = {
  click_power: '+2 coins per click per level',
  auto_miner: '+1.5 coins/sec auto income per level',
  supply_gen: '+0.08 supply rate per level',
  bank_shield: 'Reduces vulnerability when banking',
};

export function UpgradeCard({ upgradeId }: UpgradeCardProps) {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const [justPurchased, setJustPurchased] = useState(false);

  const def = UPGRADE_DEFINITIONS.find((u) => u.id === upgradeId);
  const player = players.find((p) => p.id === localPlayerId);
  if (!def || !player) return null;

  const level = upgradeLevels[upgradeId] ?? 0;
  const cost = getUpgradeCost(upgradeId, level);
  const canAfford = player.economy.looseCoins >= cost;
  const isMaxed = level >= def.maxLevel;

  const handleBuy = () => {
    if (buyUpgrade(localPlayerId, upgradeId)) {
      audioService.playUpgrade();
      setJustPurchased(true);
      setTimeout(() => setJustPurchased(false), 400);
    }
  };

  return (
    <motion.div
      className={`upgrade-card ${canAfford && !isMaxed ? 'affordable' : ''} ${isMaxed ? 'maxed' : ''} ${justPurchased ? 'purchase-pulse' : ''}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={tooltips[def.id]}
      animate={justPurchased ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div className="upgrade-header">
        <span className="upgrade-name">{def.name}</span>
        <span className="upgrade-level">Lv.{level}</span>
      </div>
      <button
        className="upgrade-buy"
        onClick={handleBuy}
        disabled={!canAfford || isMaxed}
      >
        {isMaxed ? 'MAX' : `${cost} coins`}
      </button>
    </motion.div>
  );
}
