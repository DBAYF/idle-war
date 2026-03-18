import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../../store/gameStore';
import { MATCH_DURATION_SEC, WIN_THRESHOLD, SUPPLY_CAP } from '../../../../domain/constants';
import { audioService } from '../../../../shared/audio/audioService';

const VICTORY_WARNING_THRESHOLD = 800;

export function ResourceMeters() {
  const localPlayerId = useGameStore((s) => s.localPlayerId);
  const players = useGameStore((s) => s.players);
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const victoryWarningPlayed = useRef(false);

  const player = players.find((p) => p.id === localPlayerId);
  if (!player || !matchStartTime) return null;

  const elapsed = (Date.now() - matchStartTime) / 1000;
  const timeLeft = Math.max(0, MATCH_DURATION_SEC - elapsed);
  const securedPct = Math.min(100, (player.economy.securedWealth / WIN_THRESHOLD) * 100);
  const isEndgame = timeLeft <= 30;
  const nearVictory = player.economy.securedWealth >= VICTORY_WARNING_THRESHOLD;

  useEffect(() => {
    if (nearVictory && !victoryWarningPlayed.current) {
      audioService.playVictoryNear();
      victoryWarningPlayed.current = true;
    }
  }, [nearVictory]);

  return (
    <div className="resource-meters">
      <div className="meter-row">
        <span className="meter-label">Loose</span>
        <div className="meter-bar loose">
          <motion.div
            className="meter-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (player.economy.looseCoins / 200) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <span className="meter-value">{Math.floor(player.economy.looseCoins)}</span>
      </div>
      <div className="meter-row">
        <span className="meter-label">Secured</span>
        <div className="meter-bar secured">
          <motion.div
            className="meter-fill"
            initial={{ width: 0 }}
            animate={{ width: `${securedPct}%` }}
            transition={{ type: 'spring', stiffness: 80 }}
          />
        </div>
        <span className="meter-value">{Math.floor(player.economy.securedWealth)}</span>
      </div>
      <div className="meter-row">
        <span className="meter-label">Supply</span>
        <div className="meter-bar supply">
          <motion.div
            className="meter-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (player.economy.supply / SUPPLY_CAP) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>
        <span className="meter-value">{Math.floor(player.economy.supply)}</span>
      </div>
      {player.economy.autoIncomePerSec > 0 && (
        <div className="income-display">
          {player.economy.autoIncomePerSec.toFixed(1)}/s auto
        </div>
      )}
      <div className={`timer ${isEndgame ? 'endgame' : ''}`}>
        {Math.floor(timeLeft / 60)}:{(Math.floor(timeLeft % 60) + '').padStart(2, '0')}
      </div>
    </div>
  );
}
