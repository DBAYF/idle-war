import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';

export function TargetSelector() {
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const selectedTargetId = useGameStore((s) => s.selectedTargetId);
  const setSelectedTarget = useGameStore((s) => s.setSelectedTarget);

  const enemies = players.filter((p) => p.id !== localPlayerId);

  return (
    <div className="target-selector">
      <span className="target-label">TARGET</span>
      <div className="target-tabs">
        {enemies.map((p) => (
          <motion.button
            key={p.id}
            className={`target-tab ${selectedTargetId === p.id ? 'selected' : ''}`}
            onClick={() => setSelectedTarget(p.id)}
            style={{ '--team-color': p.color } as React.CSSProperties}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {p.name}
            {p.isLeader && <span className="leader-badge">★</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
