import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { getEnemies } from '../../../../domain/targetHelpers';

export function TargetSelector() {
  const players = useGameStore((s) => s.players);
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const selectedTargetId = useGameStore((s) => s.selectedTargetId);
  const setSelectedTarget = useGameStore((s) => s.setSelectedTarget);
  const tabRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const pointerDownTargetIdRef = useRef<string | null>(null);
  const firedFromPointerRef = useRef(false);

  const enemies = getEnemies(players, localPlayerId);

  useEffect(() => {
    if (selectedTargetId != null && !enemies.some((e) => e.id === selectedTargetId)) {
      setSelectedTarget(enemies[0]?.id ?? null);
    }
  }, [enemies, selectedTargetId, setSelectedTarget]);

  useEffect(() => {
    if (selectedTargetId == null) return;
    const el = tabRefs.current.get(selectedTargetId);
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [selectedTargetId]);

  const selectTarget = (id: string) => {
    setSelectedTarget(id);
  };
  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    pointerDownTargetIdRef.current = id;
    e.preventDefault();
  };
  const onPointerUp = (id: string) => (e: React.PointerEvent) => {
    if (pointerDownTargetIdRef.current === id) {
      selectTarget(id);
      firedFromPointerRef.current = true;
      setTimeout(() => {
        firedFromPointerRef.current = false;
      }, 0);
    }
    pointerDownTargetIdRef.current = null;
  };
  const onPointerCancel = () => {
    pointerDownTargetIdRef.current = null;
  };
  const onClickFallback = (id: string) => (e: React.MouseEvent) => {
    if (!firedFromPointerRef.current) selectTarget(id);
  };

  const selectedEnemy = enemies.find((e) => e.id === selectedTargetId);

  return (
    <div className="target-selector">
      <span className="target-label">TARGET</span>
      {selectedEnemy && (
        <span className="target-attacking-label" aria-live="polite">
          Attacking: {selectedEnemy.name}
        </span>
      )}
      <div className="target-tabs" role="tablist">
        {enemies.map((p) => (
          <motion.button
            key={p.id}
            ref={(el) => {
              tabRefs.current.set(p.id, el);
            }}
            className={`target-tab ${selectedTargetId === p.id ? 'selected' : ''}`}
            onClick={onClickFallback(p.id)}
            onPointerDown={onPointerDown(p.id)}
            onPointerUp={onPointerUp(p.id)}
            onPointerCancel={onPointerCancel}
            style={{ '--team-color': p.color } as React.CSSProperties}
            aria-selected={selectedTargetId === p.id}
            role="tab"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {p.name}
            {p.isLeader && <span className="leader-badge">★</span>}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
