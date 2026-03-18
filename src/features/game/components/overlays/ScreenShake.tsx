import { useEffect, useState } from 'react';
import { useGameStore } from '../../../../store/gameStore';

export function useScreenShake() {
  const [shaking, setShaking] = useState(false);
  const recentImpacts = useGameStore((s) => s.recentImpacts);
  const localPlayerId = useGameStore((s) => s.localPlayerId);

  useEffect(() => {
    const hitLocal = recentImpacts.some((i) => i.targetId === localPlayerId);
    if (hitLocal) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 350);
      return () => clearTimeout(t);
    }
  }, [recentImpacts, localPlayerId]);

  return shaking;
}
