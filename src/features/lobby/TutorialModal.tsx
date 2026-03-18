import { motion } from 'framer-motion';

interface TutorialModalProps {
  onClose: () => void;
}

export function TutorialModal({ onClose }: TutorialModalProps) {
  return (
    <motion.div
      className="tutorial-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="tutorial-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>HOW TO PLAY</h2>
        <ol className="tutorial-steps">
          <li><strong>Click</strong> the resource node to earn loose coins</li>
          <li><strong>Buy upgrades</strong> to increase click power and auto income</li>
          <li><strong>Bank</strong> loose coins to secure them (only secured counts toward victory)</li>
          <li><strong>Deploy units</strong> to steal coins from enemies and damage their wall</li>
          <li>First to <strong>1000 secured wealth</strong> wins</li>
        </ol>
        <p className="tutorial-tip">Loose coins can be stolen — bank during safe windows!</p>
        <motion.button
          className="btn-primary"
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          GOT IT
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
