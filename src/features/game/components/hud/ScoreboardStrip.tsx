import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { WIN_THRESHOLD } from '../../../../domain/constants';

export function ScoreboardStrip() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const matchConfig = useGameStore((s) => s.matchConfig);
  const winThreshold = matchConfig?.winThreshold ?? WIN_THRESHOLD;

  const sorted = [...players].sort(
    (a, b) =>
      b.economy.securedWealth + b.economy.looseCoins -
      (a.economy.securedWealth + a.economy.looseCoins)
  );

  return (
    <div className="scoreboard-strip">
      {sorted.map((p, i) => (
        <motion.div
          key={p.id}
          className={`scoreboard-item ${p.id === localPlayerId ? 'you' : ''}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          style={{ borderColor: p.color }}
        >
          <span className="sb-rank">#{i + 1}</span>
          <span className="sb-name">{p.name}</span>
          <div className="sb-wealth-bar">
            <motion.div
              className="sb-wealth-fill"
              animate={{
                width: `${Math.min(100, (p.economy.securedWealth / winThreshold) * 100)}%`,
              }}
              style={{ backgroundColor: p.color }}
            />
          </div>
          <span className="sb-value">
            {Math.floor(p.economy.securedWealth + p.economy.looseCoins)}
          </span>
          {p.isLeader && <span className="sb-leader">★</span>}
        </motion.div>
      ))}
    </div>
  );
}
