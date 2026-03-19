import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { GameRulesForm } from './GameRulesForm';
import { SetupSummary } from '../setup/SetupSummary';
import { ValidationBanner } from '../setup/ValidationBanner';
import { DEFAULT_MATCH_CONFIG } from '../../domain/constants';
import { validateSetup } from '../../domain/validateSetup';
import { getPlayerCount } from '../../domain/configHelpers';
import type { MatchConfig, MatchMode } from '../../domain/types';

export function CustomGameSetup() {
  const navigate = useNavigate();
  const startMatch = useGameStore((s) => s.startMatch);
  const [config, setConfig] = useState<MatchConfig>(() => ({ ...DEFAULT_MATCH_CONFIG }));
  const [mode, setMode] = useState<MatchMode>('1v1');

  const fullConfig: MatchConfig = { ...config, mode };
  const validation = validateSetup(fullConfig, mode, false);
  const playerCount = getPlayerCount(mode);

  const handleStart = () => {
    if (!validation.valid) return;
    startMatch(playerCount, fullConfig);
    navigate('/match');
  };

  return (
    <motion.div
      className="lobby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="lobby-bg" />
      <div className="lobby-content">
        <h1>CUSTOM GAME</h1>
        <p className="lobby-sub">Configure your realm's skirmish</p>

        <div className="rules-section">
          <label className="rules-label">Mode</label>
          <div className="lobby-modes" style={{ marginBottom: '1rem' }}>
            {(['1v1', '2v2', 'ffa'] as MatchMode[]).map((m) => (
              <motion.button
                key={m}
                className={`mode-card ${mode === m ? 'mode-card-online' : ''}`}
                onClick={() => setMode(m)}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="mode-title">{m.toUpperCase()}</span>
                <span className="mode-desc">
                  {m === '1v1' ? 'You vs 1 CPU' : m === '2v2' ? 'You + CPU vs 2 CPU' : 'You vs 3 CPU'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="game-rules-wrap">
          <GameRulesForm config={config} onChange={setConfig} showAiDifficulty={true} />
        </div>

        <SetupSummary config={fullConfig} mode={mode} showAi={true} />
        <p className="setup-pvcpu-hint">In vs CPU, your clicks are paced to keep matches fair.</p>
        <ValidationBanner validation={validation} />

        <motion.button
          className="mode-card"
          onClick={handleStart}
          disabled={!validation.valid}
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          style={{ marginTop: '1rem' }}
        >
          <span className="mode-title">Start Match</span>
          <span className="mode-desc">{mode.toUpperCase()} vs CPU</span>
        </motion.button>

        <motion.button
          className="lobby-back-btn"
          onClick={() => navigate('/lobby')}
          style={{ marginTop: '1rem' }}
        >
          ← Back to Lobby
        </motion.button>
      </div>
    </motion.div>
  );
}
