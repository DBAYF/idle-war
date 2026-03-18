import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { audioService } from '../../../../shared/audio/audioService';
import type { UnitType } from '../../../../domain/types';
import { UNIT_STATS } from '../../../../domain/constants';

interface UnitCardProps {
  type: UnitType;
}

export function UnitCard({ type }: UnitCardProps) {
  const [, forceUpdate] = useState(0);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const selectedTargetId = useGameStore((s) => s.selectedTargetId);
  const lastUnitDeployTime = useGameStore((s) => s.lastUnitDeployTime);
  const deployUnit = useGameStore((s) => s.deployUnit);

  const stats = UNIT_STATS[type];
  const player = players.find((p) => p.id === localPlayerId);
  if (!stats || !player) return null;

  const canAfford =
    player.economy.supply >= stats.supplyCost &&
    player.economy.looseCoins >= stats.coinCost;
  const cooldownRemaining = Math.max(
    0,
    stats.cooldownMs - (Date.now() - (lastUnitDeployTime[type] ?? 0))
  );
  const onCooldown = cooldownRemaining > 0;
  const canDeploy = canAfford && !onCooldown && selectedTargetId && selectedTargetId !== localPlayerId;
  const cooldownPct = onCooldown ? (cooldownRemaining / stats.cooldownMs) * 100 : 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [onCooldown, lastUnitDeployTime[type]]);

  const handleDeploy = () => {
    if (!canDeploy || !selectedTargetId) return;
    if (deployUnit(localPlayerId, selectedTargetId, type)) {
      audioService.playDeploy();
    }
  };

  return (
    <motion.button
      className={`unit-card ${canDeploy ? 'ready' : ''}`}
      onClick={handleDeploy}
      disabled={!canDeploy}
      whileHover={canDeploy ? { scale: 1.05 } : {}}
      whileTap={canDeploy ? { scale: 0.98 } : {}}
    >
      <span className="unit-name">{stats.name}</span>
      <span className="unit-cost">
        {stats.supplyCost} supply · {stats.coinCost} coins
      </span>
      {onCooldown && (
        <div className="cooldown-radial">
          <svg viewBox="0 0 36 36" className="cooldown-svg">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(0,212,170,0.6)"
              strokeWidth="3"
              strokeDasharray={`${cooldownPct * 1.005} 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
        </div>
      )}
    </motion.button>
  );
}
