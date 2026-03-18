import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';

export function WallHealthMeter() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);

  const player = players.find((p) => p.id === localPlayerId);
  if (!player) return null;

  const pct = (player.wallHealth / player.maxWallHealth) * 100;

  return (
    <div className="wall-health-meter">
      <span className="wall-label">WALL</span>
      <div className="wall-bar">
        <motion.div
          className="wall-fill"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
          style={{ backgroundColor: player.color }}
        />
      </div>
      <span className="wall-value">{Math.floor(player.wallHealth)}</span>
    </div>
  );
}
