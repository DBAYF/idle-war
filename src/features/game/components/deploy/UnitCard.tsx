import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { useUIStore } from '../../../../store/uiStore';
import { audioService } from '../../../../shared/audio/audioService';
import type { UnitType } from '../../../../domain/types';
import { UNIT_STATS, TICK_MS } from '../../../../domain/constants';

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
  const setLastDeployError = useUIStore((s) => s.setLastDeployError);
  const setLastDeploySuccess = useUIStore((s) => s.setLastDeploySuccess);

  const stats = UNIT_STATS[type];
  const player = players.find((p) => p.id === localPlayerId);
  if (!stats || !player) return null;

  const canAfford =
    player.economy.supply >= stats.supplyCost &&
    player.economy.looseCoins >= stats.coinCost;
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const tickIndex = useGameStore((s) => s.tickIndex);
  const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : Date.now();
  const cooldownRemaining = Math.max(
    0,
    stats.cooldownMs - (simulationTime - (lastUnitDeployTime[type] ?? 0))
  );
  const onCooldown = cooldownRemaining > 0;
  const isDefender = type === 'defender';
  const [deployLockUntil, setDeployLockUntil] = useState(0);
  const isDebounceLocked = Date.now() < deployLockUntil;
  const canDeploy =
    canAfford &&
    !onCooldown &&
    !isDebounceLocked &&
    (isDefender ? true : selectedTargetId != null && selectedTargetId !== localPlayerId);
  const cooldownPct = onCooldown ? (cooldownRemaining / stats.cooldownMs) * 100 : 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [onCooldown, lastUnitDeployTime[type]]);

  useEffect(() => {
    if (!isDebounceLocked) return;
    const t = setTimeout(() => forceUpdate((n) => n + 1), 410);
    return () => clearTimeout(t);
  }, [deployLockUntil]);

  const pointerDownRef = useRef(false);
  const firedFromPointerRef = useRef(false);

  const handleDeploy = () => {
    if (!canDeploy || isDebounceLocked) return;
    const targetId = isDefender ? localPlayerId : selectedTargetId;
    if (!targetId) return;
    const result = deployUnit(localPlayerId, targetId, type);
    if (result === true) {
      setDeployLockUntil(Date.now() + 400);
      audioService.playDeploy();
      setLastDeploySuccess('Sent!');
    } else {
      const msg =
        result === 'cooldown'
          ? 'On cooldown'
          : result === 'supply'
            ? 'Need more supply'
            : 'Need more coins';
      setLastDeployError(msg);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = true;
    e.preventDefault();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerDownRef.current && canDeploy && !isDebounceLocked) {
      handleDeploy();
      firedFromPointerRef.current = true;
      setTimeout(() => {
        firedFromPointerRef.current = false;
      }, 0);
    }
    pointerDownRef.current = false;
  };
  const onPointerCancel = () => {
    pointerDownRef.current = false;
  };
  const onClickFallback = (e: React.MouseEvent) => {
    if (!firedFromPointerRef.current) handleDeploy();
  };

  return (
    <motion.button
      className={`unit-card ${canDeploy ? 'ready' : ''}`}
      onClick={onClickFallback}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      disabled={!canDeploy}
      title={stats.flavour}
      whileHover={canDeploy ? { scale: 1.05 } : {}}
      whileTap={canDeploy ? { scale: 0.98 } : {}}
      style={{ touchAction: 'manipulation' }}
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
