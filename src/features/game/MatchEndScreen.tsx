import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { hasReachedWinThreshold } from '../../domain/economy';
import { WIN_THRESHOLD, TICK_MS } from '../../domain/constants';
import { audioService } from '../../shared/audio/audioService';

export function MatchEndScreen() {
  const navigate = useNavigate();
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const matchStats = useGameStore((s) => s.matchStats);
  const matchConfig = useGameStore((s) => s.matchConfig);
  const tickIndex = useGameStore((s) => s.tickIndex);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const lastRoomId = useGameStore((s) => s.lastRoomId);
  const reset = useGameStore((s) => s.reset);
  const clearLastRoom = useGameStore((s) => s.clearLastRoom);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  const winThreshold = matchConfig?.winThreshold ?? WIN_THRESHOLD;
  const winner = players.find((p) => hasReachedWinThreshold(p.economy.securedWealth, matchConfig));
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

  useEffect(() => {
    primaryButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && players.length > 0) {
      const totalDeploys = Object.values(matchStats).reduce((s, st) => s + (st?.attacksSent ?? 0), 0);
      const elapsedSec = Math.round((tickIndex * TICK_MS) / 1000);
      const cpuDeploys = players
        .filter((p) => p.id !== localPlayerId)
        .reduce((s, p) => s + (matchStats[p.id]?.attacksSent ?? 0), 0);
      console.log('[MatchEnd]', {
        mode: isMultiplayer ? 'PvP' : 'PvCPU',
        elapsedSec,
        totalDeploys,
        cpuDeploys,
        perPlayer: Object.fromEntries(
          players.map((p) => [p.name, matchStats[p.id]?.attacksSent ?? 0])
        ),
      });
    }
  }, [players, matchStats, localPlayerId, tickIndex, isMultiplayer]);

  const handleRematch = () => {
    navigate(lastRoomId ? `/room/${lastRoomId}` : '/room', { replace: true });
  };

  const handleLobby = () => {
    clearLastRoom();
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
        {winner && (
          <p className="match-end-lore">
            {isLocalWinner ? 'Your realm secured victory.' : 'The rival realm prevailed.'}
          </p>
        )}
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
            const pct = Math.min(100, (p.economy.securedWealth / winThreshold) * 100);
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
          {isMultiplayer ? (
            <>
              <motion.button
                ref={primaryButtonRef}
                className="btn-primary"
                onClick={handleRematch}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Rematch with same opponent"
              >
                REMATCH
              </motion.button>
              <motion.button
                className="btn-secondary"
                onClick={handleLobby}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Back to lobby"
              >
                LOBBY
              </motion.button>
            </>
          ) : (
            <motion.button
              ref={primaryButtonRef}
              className="btn-primary"
              onClick={handleLobby}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Back to lobby"
            >
              LOBBY
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
