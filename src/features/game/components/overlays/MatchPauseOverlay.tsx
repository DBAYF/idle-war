import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../../../store/uiStore';
import { useGameStore } from '../../../../store/gameStore';

export function MatchPauseOverlay() {
  const navigate = useNavigate();
  const matchPauseOpen = useUIStore((s) => s.matchPauseOpen);
  const setMatchPauseOpen = useUIStore((s) => s.setMatchPauseOpen);
  const audioMuted = useUIStore((s) => s.audioMuted);
  const toggleAudio = useUIStore((s) => s.toggleAudio);
  const reset = useGameStore((s) => s.reset);

  const handleLeaveMatch = () => {
    reset();
    setMatchPauseOpen(false);
    navigate('/lobby', { replace: true });
  };

  return (
    <AnimatePresence>
      {matchPauseOpen && (
        <motion.div
          className="match-pause-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMatchPauseOpen(false)}
        >
          <motion.div
            className="match-pause-panel"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="match-pause-title">Settings</h3>
            <div className="match-pause-row">
              <span>Sound</span>
              <button
                className="match-pause-toggle"
                onClick={toggleAudio}
                aria-label={audioMuted ? 'Unmute' : 'Mute'}
              >
                {audioMuted ? '🔇 Off' : '🔊 On'}
              </button>
            </div>
            <div className="match-pause-actions">
              <motion.button
                className="btn-secondary"
                onClick={() => setMatchPauseOpen(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Resume
              </motion.button>
              <motion.button
                className="btn-leave"
                onClick={handleLeaveMatch}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Leave Match
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
