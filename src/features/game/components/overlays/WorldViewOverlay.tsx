import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { useUIStore } from '../../../../store/uiStore';

export function WorldViewOverlay() {
  const worldViewOpen = useUIStore((s) => s.worldViewOpen);
  const toggleWorldView = useUIStore((s) => s.toggleWorldView);
  const players = useGameStore((s) => s.players);
  const unitsInFlight = useGameStore((s) => s.unitsInFlight);

  return (
    <>
      <motion.button
        className="world-view-toggle"
        onClick={toggleWorldView}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        {worldViewOpen ? 'BATTLE' : 'WORLD'}
      </motion.button>
      <AnimatePresence>
        {worldViewOpen && (
          <motion.div
            className="world-view-overlay"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={toggleWorldView}
          >
            <div className="world-map" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="world-view-close"
                onClick={toggleWorldView}
                aria-label="Close world view"
              >
                ✕
              </button>
              {players.map((p, i) => {
                const n = players.length;
                const angle = (2 * Math.PI * i) / n - Math.PI / 2;
                const radiusPct = 35;
                const left = 50 + radiusPct * Math.cos(angle);
                const top = 50 + radiusPct * Math.sin(angle);
                return (
                  <div
                    key={p.id}
                    className="world-base"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                      borderColor: p.color,
                    }}
                  >
                    <span>{p.name}</span>
                    <span>{Math.floor(p.economy.securedWealth + p.economy.looseCoins)}</span>
                    {p.isLeader && <span className="leader">★</span>}
                  </div>
                );
              })}
              {unitsInFlight.map((u) => {
                const owner = players.find((p) => p.id === u.ownerId);
                const target = players.find((p) => p.id === u.targetId);
                if (!owner || !target) return null;
                const oi = players.findIndex((p) => p.id === u.ownerId);
                const ti = players.findIndex((p) => p.id === u.targetId);
                const n = players.length;
                const angleO = (2 * Math.PI * oi) / n - Math.PI / 2;
                const angleT = (2 * Math.PI * ti) / n - Math.PI / 2;
                const radiusPct = 35;
                const startX = 50 + radiusPct * Math.cos(angleO);
                const startY = 50 + radiusPct * Math.sin(angleO);
                const endX = 50 + radiusPct * Math.cos(angleT);
                const endY = 50 + radiusPct * Math.sin(angleT);
                const left = startX + (endX - startX) * u.progress;
                const top = startY + (endY - startY) * u.progress;
                return (
                  <div
                    key={u.id}
                    className="world-unit"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: owner.color,
                    }}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
