import { motion } from 'framer-motion';
import type { MatchConfig, SupplyScarcity, AIDifficulty } from '../../domain/types';
import { SUPPLY_SCARCITY_PRESETS } from '../../domain/constants';

const AI_DIFFICULTY_DESCRIPTIONS: Record<AIDifficulty, string> = {
  easy: 'Focuses on economy; slower to attack.',
  normal: 'Balanced; attacks and banks sensibly.',
  hard: 'Aggressive; targets well and reacts fast.',
  brutal: 'Very aggressive and accurate; tough opponent.',
};

interface GameRulesFormProps {
  config: MatchConfig;
  onChange: (config: MatchConfig) => void;
  showAiDifficulty: boolean;
}

const WIN_GOAL_MIN = 500;
const WIN_GOAL_MAX = 3000;
const WIN_GOAL_STEP = 100;
const DURATION_MIN = 120;
const DURATION_MAX = 600;
const DURATION_STEP = 60;

export function GameRulesForm({ config, onChange, showAiDifficulty }: GameRulesFormProps) {
  const update = (partial: Partial<MatchConfig>) => {
    onChange({ ...config, ...partial });
  };

  const setSupplyScarcity = (preset: SupplyScarcity) => {
    const p = SUPPLY_SCARCITY_PRESETS[preset];
    update({
      baseSupplyRate: p.baseSupplyRate,
      supplyCap: p.supplyCap,
      initialSupply: p.initialSupply,
    });
  };

  const setAiDifficulty = (difficulty: AIDifficulty) => {
    update({ aiDifficulty: difficulty });
  };

  return (
    <div className="game-rules-form">
      <div className="rules-section" role="group" aria-labelledby="win-goal-label">
        <label id="win-goal-label" className="rules-label" htmlFor="win-goal">Win Goal</label>
        <p className="form-helper">First to secure this much wealth wins.</p>
        <div className="rules-row">
          <input
            type="range"
            id="win-goal-slider"
            min={WIN_GOAL_MIN}
            max={WIN_GOAL_MAX}
            step={WIN_GOAL_STEP}
            value={config.winThreshold}
            onChange={(e) => update({ winThreshold: Number(e.target.value) })}
            className="rules-slider"
            aria-labelledby="win-goal-label"
          />
          <input
            type="number"
            id="win-goal"
            min={WIN_GOAL_MIN}
            max={WIN_GOAL_MAX}
            step={WIN_GOAL_STEP}
            value={config.winThreshold}
            onChange={(e) => update({ winThreshold: Math.min(WIN_GOAL_MAX, Math.max(WIN_GOAL_MIN, Number(e.target.value))) })}
            className="rules-number"
            aria-labelledby="win-goal-label"
          />
        </div>
      </div>

      <div className="rules-section" role="group" aria-labelledby="supply-scarcity-label">
        <label id="supply-scarcity-label" className="rules-label">Supply Scarcity</label>
        <p className="form-helper">Higher = slower supply gain.</p>
        <div className="rules-presets">
          {(['easy', 'normal', 'hard'] as SupplyScarcity[]).map((preset) => {
            const p = SUPPLY_SCARCITY_PRESETS[preset];
            const isActive =
              config.baseSupplyRate === p.baseSupplyRate &&
              config.supplyCap === p.supplyCap &&
              config.initialSupply === p.initialSupply;
            return (
              <motion.button
                key={preset}
                type="button"
                className={`rules-preset-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSupplyScarcity(preset)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-pressed={isActive}
                aria-label={`Supply scarcity: ${preset}`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="rules-section" role="group" aria-labelledby="duration-label">
        <label id="duration-label" className="rules-label" htmlFor="duration-slider">Duration (min)</label>
        <p className="form-helper">Match length in minutes.</p>
        <div className="rules-row">
          <input
            type="range"
            id="duration-slider"
            min={DURATION_MIN}
            max={DURATION_MAX}
            step={DURATION_STEP}
            value={config.durationSec}
            onChange={(e) => update({ durationSec: Number(e.target.value) })}
            className="rules-slider"
            aria-labelledby="duration-label"
          />
          <span className="rules-value">{config.durationSec / 60} min</span>
        </div>
      </div>

      {showAiDifficulty && (
        <div className="rules-section" role="group" aria-labelledby="ai-difficulty-label">
          <label id="ai-difficulty-label" className="rules-label">AI Difficulty</label>
          <p className="form-helper">Affects bot aggression, timing, and targeting.</p>
          <div className="rules-presets">
            {(['easy', 'normal', 'hard', 'brutal'] as AIDifficulty[]).map((difficulty) => {
              const isActive = config.aiDifficulty === difficulty;
              return (
                <motion.button
                  key={difficulty}
                  type="button"
                  className={`rules-preset-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setAiDifficulty(difficulty)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={isActive}
                  aria-label={`AI difficulty: ${difficulty}. ${AI_DIFFICULTY_DESCRIPTIONS[difficulty]}`}
                  title={AI_DIFFICULTY_DESCRIPTIONS[difficulty]}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </motion.button>
              );
            })}
          </div>
          <p className="form-helper form-helper-subtle" aria-live="polite">
            {AI_DIFFICULTY_DESCRIPTIONS[config.aiDifficulty]}
          </p>
        </div>
      )}
    </div>
  );
}
