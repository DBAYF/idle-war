import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { hasReachedWinThreshold } from '../../domain/economy';
import { WIN_THRESHOLD } from '../../domain/constants';
import { audioService } from '../../shared/audio/audioService';

export function MatchEndScreen() {
  const navigate = useNavigate();
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const matchStats = useGameStore((s) => s.matchStats);
  const reset = useGameStore((s) => s.reset);

  const winner = players.find((p) => hasReachedWinThreshold(p.economy.securedWealth));
  const sortedByWealth = [...players].sort(
    (a, b) => b.economy.securedWealth - a.economy.securedWealth
  );
  const isLocalWinner = winner?.id === localPlayerId;
  const localStats = matchStats[localPlayerId] ?? { attacksSent: 0, coinsStolen: 0, coinsLost: 0, biggestSingleSteal: 0 };

  useEffect(() => {
    if (winner) {
      if (isLocalWinner) audioService.playWin();
      else audioService.playLose();
    }
  }, [winner, isLocalWinner]);

  const handleRematch = () => {
    reset();
    navigate('/lobby', { replace: true });
  };

  const handleLobby = () => {
    reset();
    navigate('/lobby', { replace: true });
  };

  return (
    <motion.div
      className="match-end-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="match-end-content">
        <motion.h1
          className={`result-title ${winner ? (isLocalWinner ? 'win' : 'lose') : 'timeup'}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
        >
          {winner ? (isLocalWinner ? 'VICTORY' : 'DEFEAT') : 'TIME UP'}
        </motion.h1>
        <motion.div
          className="match-stats-summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="stat-pair">
            <span className="stat-label">Attacks sent</span>
            <span className="stat-val">{localStats.attacksSent}</span>
          </div>
          <div className="stat-pair">
            <span className="stat-label">Coins stolen</span>
            <span className="stat-val">{localStats.coinsStolen}</span>
          </div>
          <div className="stat-pair">
            <span className="stat-label">Coins lost</span>
            <span className="stat-val">{localStats.coinsLost}</span>
          </div>
        </motion.div>
        {(localStats.biggestSingleSteal ?? 0) > 0 && (
          <motion.div
            className="key-moments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h4 className="key-moments-title">Key moment</h4>
            <div className="key-moment">
              <span className="km-label">Biggest single steal</span>
              <span className="km-val">{localStats.biggestSingleSteal} coins</span>
            </div>
          </motion.div>
        )}
        <div className="wealth-chart">
          {sortedByWealth.map((p, i) => {
            const pct = Math.min(100, (p.economy.securedWealth / WIN_THRESHOLD) * 100);
            return (
              <div key={p.id} className="wealth-bar-row">
                <span className="wb-name">{p.name}</span>
                <div className="wealth-bar-track">
                  <motion.div
                    className="wealth-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    style={{ backgroundColor: p.color }}
                  />
                </div>
                <span className="wb-value">{Math.floor(p.economy.securedWealth)}</span>
              </div>
            );
          })}
        </div>
        <motion.div
          className="stats-grid"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {sortedByWealth.map((p, i) => (
            <div
              key={p.id}
              className="stat-row"
              style={{ borderColor: p.color }}
            >
              <span className="rank">#{i + 1}</span>
              <span className="name">{p.name}</span>
              <span className="wealth">{Math.floor(p.economy.securedWealth)}</span>
            </div>
          ))}
        </motion.div>
        <motion.div
          className="match-end-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            className="btn-primary"
            onClick={handleRematch}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            REMATCH
          </motion.button>
          <motion.button
            className="btn-secondary"
            onClick={handleLobby}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            LOBBY
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
