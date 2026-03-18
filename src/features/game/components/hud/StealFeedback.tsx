import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';

export function StealFeedback() {
  const lastStealFeedback = useGameStore((s) => s.lastStealFeedback);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (lastStealFeedback) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(t);
    }
  }, [lastStealFeedback]);

  if (!lastStealFeedback) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="steal-feedback"
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -40, scale: 1.1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          +{lastStealFeedback.amount} stolen
        </motion.div>
      )}
    </AnimatePresence>
  );
}
