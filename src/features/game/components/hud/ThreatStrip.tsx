import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { audioService } from '../../../../shared/audio/audioService';

export function ThreatStrip() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const unitsInFlight = useGameStore((s) => s.unitsInFlight);
  const prevIncomingRef = useRef(0);

  const incoming = unitsInFlight.filter((u) => u.targetId === localPlayerId && u.progress > 0.3);
  const underAttack = incoming.length > 0;

  useEffect(() => {
    if (incoming.length > 0 && prevIncomingRef.current === 0) {
      audioService.playIncoming();
    }
    prevIncomingRef.current = incoming.length;
  }, [incoming.length]);

  return (
    <>
      <AnimatePresence>
        {underAttack && (
          <motion.div
            className="under-attack-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      {incoming.length > 0 && (
        <motion.div
          className="threat-strip"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="threat-label">INCOMING</span>
          <span className="threat-count">{incoming.length}</span>
        </motion.div>
      )}
    </>
  );
}
