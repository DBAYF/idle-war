import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { audioService } from '../../../../shared/audio/audioService';

interface FloatNum {
  id: number;
  value: number;
  x: number;
}

export function ResourceClickField() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const clickForCoins = useGameStore((s) => s.clickForCoins);
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const [clickId, setClickId] = useState(0);

  const player = players.find((p) => p.id === localPlayerId);
  if (!player) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 40;
    clickForCoins(localPlayerId);
    audioService.playClick();
    const value = player.economy.coinPerClick;
    const id = clickId + 1;
    setClickId(id);
    setFloatNums((prev) => [...prev, { id, value, x }]);
    setTimeout(() => {
      setFloatNums((prev) => prev.filter((n) => n.id !== id));
    }, 800);
  };

  return (
    <motion.div
      className="resource-click-field"
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      style={{ '--player-color': player.color } as React.CSSProperties}
    >
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
