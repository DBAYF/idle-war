import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QueueScreen } from '../matchmaking/QueueScreen';
import { TutorialModal } from './TutorialModal';

export function LobbyScreen() {
  const navigate = useNavigate();
  const [queueMode, setQueueMode] = useState<'1v1' | '2v2' | 'ffa' | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const handleQuickMatch = (mode: '1v1' | '2v2' | 'ffa') => {
    setQueueMode(mode);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {queueMode ? (
          <QueueScreen key="queue" mode={queueMode} />
        ) : (
          <motion.div
            key="lobby"
            className="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="lobby-bg" />
            <div className="lobby-content">
        <h1>LOBBY</h1>
        <p className="lobby-sub">Choose your battle</p>
        <motion.button
          className="mode-card mode-card-online"
          onClick={() => navigate('/room')}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="mode-title">Online</span>
          <span className="mode-desc">1v1 vs Friend</span>
        </motion.button>
        <div className="lobby-offline-badge">
          <span className="offline-dot" />
          Offline · vs CPU
        </div>
        <button
          className="lobby-tutorial-btn"
          onClick={() => setShowTutorial(true)}
        >
          How to play
        </button>
        <motion.div
          className="lobby-modes"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            className="mode-card"
            onClick={() => handleQuickMatch('1v1')}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mode-title">1v1</span>
            <span className="mode-desc">You vs 1 CPU</span>
          </motion.button>
          <motion.button
            className="mode-card"
            onClick={() => handleQuickMatch('2v2')}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mode-title">2v2</span>
            <span className="mode-desc">You + CPU vs 2 CPU</span>
          </motion.button>
          <motion.button
            className="mode-card"
            onClick={() => handleQuickMatch('ffa')}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mode-title">FFA</span>
            <span className="mode-desc">You vs 3 CPU</span>
          </motion.button>
          <motion.button
            className="mode-card"
            onClick={() => navigate('/custom')}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mode-title">Custom</span>
            <span className="mode-desc">Set your own rules</span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTutorial && (
          <TutorialModal key="tutorial" onClose={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
