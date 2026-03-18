import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

interface QueueScreenProps {
  mode: '1v1' | '2v2' | 'ffa';
}

export function QueueScreen({ mode }: QueueScreenProps) {
  const navigate = useNavigate();
  const startMatch = useGameStore((s) => s.startMatch);

  useEffect(() => {
    const playerCount = mode === '1v1' ? 2 : mode === '2v2' ? 4 : 4;
    const timer = setTimeout(() => {
      startMatch(playerCount);
      navigate('/match');
    }, 2000);
    return () => clearTimeout(timer);
  }, [mode, navigate, startMatch]);

  return (
    <motion.div
      className="queue-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="queue-content">
        <motion.div
          className="queue-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <h2>MATCH FOUND</h2>
        <p>{mode === '1v1' ? '1v1' : mode === '2v2' ? '2v2' : 'FFA'} vs CPU — Starting...</p>
        <div className="queue-players">
          {Array.from({ length: mode === '1v1' ? 2 : 4 }, (_, i) => (
            <motion.div
              key={i}
              className="queue-player-card"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <div className="queue-avatar" />
              <span>Player {i + 1}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
