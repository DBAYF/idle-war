import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';

export function DisconnectOverlay() {
  const navigate = useNavigate();
  const peerDisconnected = useGameStore((s) => s.peerDisconnected);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const reset = useGameStore((s) => s.reset);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleReturnToLobby = () => {
    reset();
    navigate('/lobby', { replace: true });
  };

  useEffect(() => {
    if (isMultiplayer && peerDisconnected && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isMultiplayer, peerDisconnected]);

  if (!isMultiplayer || !peerDisconnected) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="disconnect-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="alert"
        aria-live="assertive"
      >
        <motion.div
          className="disconnect-panel"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <h3 className="disconnect-title">Opponent left</h3>
          <p className="disconnect-message">Your opponent has disconnected from the match.</p>
          <p className="disconnect-message">You can return to the lobby and create or join a new room.</p>
          <motion.button
            ref={buttonRef}
            className="btn-primary"
            onClick={handleReturnToLobby}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Return to lobby"
          >
            Return to Lobby
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
