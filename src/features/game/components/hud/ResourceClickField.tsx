import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { audioService } from '../../../../shared/audio/audioService';
import { getPvCpuClickCooldownMs } from '../../../../domain/configHelpers';
import { TICK_MS } from '../../../../domain/constants';

interface FloatNum {
  id: number;
  value: number;
  x: number;
}

export function ResourceClickField() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const clickForCoins = useGameStore((s) => s.clickForCoins);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const tickIndex = useGameStore((s) => s.tickIndex);
  const lastPlayerClickTime = useGameStore((s) => s.lastPlayerClickTime);
  const matchConfig = useGameStore((s) => s.matchConfig);
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const [clickId, setClickId] = useState(0);
  const pointerDownRef = useRef(false);
  const pointerClientXRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firedFromPointerRef = useRef(false);
  const clickLockUntilRef = useRef(0);
  const CLICK_DEBOUNCE_MS = 300;

  const player = players.find((p) => p.id === localPlayerId);
  if (!player) return null;

  const showCooldownRing = !isMultiplayer && matchStartTime != null;
  const simulationTime = matchStartTime ? matchStartTime + tickIndex * TICK_MS : Date.now();
  const cooldownMs = getPvCpuClickCooldownMs(matchConfig?.aiDifficulty ?? 'normal');
  const elapsed = lastPlayerClickTime ? simulationTime - lastPlayerClickTime : cooldownMs;
  const remainingPct = Math.min(100, (elapsed / cooldownMs) * 100);
  const onCooldown = remainingPct < 100;

  const applyClick = (clientX: number) => {
    const now = Date.now();
    if (now < clickLockUntilRef.current) return;
    clickLockUntilRef.current = now + CLICK_DEBOUNCE_MS;
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const x = rect ? ((clientX - rect.left) / rect.width - 0.5) * 40 : 0;
    const applied = clickForCoins(localPlayerId);
    if (applied) {
      audioService.playClick();
      const value = player.economy.coinPerClick;
      const id = clickId + 1;
      setClickId(id);
      setFloatNums((prev) => [...prev, { id, value, x }]);
      setTimeout(() => {
        setFloatNums((prev) => prev.filter((n) => n.id !== id));
      }, 800);
    } else {
      audioService.playCooldownTick();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    applyClick(e.clientX);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = true;
    pointerClientXRef.current = e.clientX;
    e.preventDefault();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerDownRef.current) {
      applyClick(pointerClientXRef.current);
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
  const onClickFallback = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!firedFromPointerRef.current) applyClick(e.clientX);
  };

  return (
    <motion.div
      ref={containerRef}
      className="resource-click-field"
      onClick={onClickFallback}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      whileTap={{ scale: 0.92 }}
      style={{ '--player-color': player.color, touchAction: 'manipulation' } as React.CSSProperties}
    >
      {showCooldownRing && onCooldown && (
        <div className="resource-click-cooldown-ring" aria-hidden>
          <svg viewBox="0 0 36 36" className="resource-click-cooldown-svg">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="rgba(0,212,170,0.5)"
              strokeWidth="2"
              strokeDasharray={`${remainingPct * 1.005} 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
        </div>
      )}
      <motion.div
        className="click-glow"
        key="glow"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 0.25 }}
      />
      <div className="click-burst" />
      <span className="click-label">CLICK</span>
      <span className="click-value">+{player.economy.coinPerClick}</span>
      <AnimatePresence>
        {floatNums.map((n) => (
          <motion.span
            key={n.id}
            className="float-gain"
            initial={{ opacity: 1, y: 0, x: n.x }}
            animate={{ opacity: 0, y: -50, x: n.x }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            +{n.value}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
