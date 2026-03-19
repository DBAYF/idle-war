import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';

export function LandingScreen() {
  const audioMuted = useUIStore((s) => s.audioMuted);
  const toggleAudio = useUIStore((s) => s.toggleAudio);

  return (
    <motion.div
      className="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="landing-bg">
        <div className="landing-particles">
          {Array.from({ length: 12 }, (_, i) => (
            <motion.div
              key={i}
              className="particle"
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              style={{
                left: `${10 + (i % 4) * 25}%`,
                top: `${20 + Math.floor(i / 4) * 25}%`,
              }}
            />
          ))}
        </div>
      </div>
      <button
        className="landing-settings"
        onClick={toggleAudio}
        title={audioMuted ? 'Unmute' : 'Mute'}
        aria-label={audioMuted ? 'Unmute' : 'Mute'}
      >
        {audioMuted ? '🔇' : '🔊'}
      </button>
      <motion.div
        className="landing-content"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h1 className="landing-title">CLICK WAR</h1>
        <p className="landing-subtitle">
          Economy. Pressure. Victory.
        </p>
        <p className="landing-lore">Compete for wealth in the Coin Realms.</p>
        <p className="landing-offline">Offline vs CPU · Online 1v1 with friends</p>
        <motion.div
          className="landing-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/lobby">
            <motion.button
              className="btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              PLAY NOW
            </motion.button>
          </Link>
          <Link to="/lobby">
            <motion.button
              className="btn-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Guest Play
            </motion.button>
          </Link>
          <motion.button
            className="btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Account (coming soon)"
          >
            Account
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
