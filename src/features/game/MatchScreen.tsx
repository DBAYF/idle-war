import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResourceClickField } from './components/hud/ResourceClickField';
import { ResourceMeters } from './components/hud/ResourceMeters';
import { BankButton } from './components/hud/BankButton';
import { ThreatStrip } from './components/hud/ThreatStrip';
import { WallHealthMeter } from './components/hud/WallHealthMeter';
import { ScoreboardStrip } from './components/hud/ScoreboardStrip';
import { StealFeedback } from './components/hud/StealFeedback';
import { UpgradePanel } from './components/upgrades/UpgradePanel';
import { DeployBar } from './components/deploy/DeployBar';
import { BattleLayer } from './components/battle/BattleLayer';
import { WorldViewOverlay } from './components/overlays/WorldViewOverlay';
import { MatchPauseOverlay } from './components/overlays/MatchPauseOverlay';
import { DisconnectOverlay } from './components/overlays/DisconnectOverlay';
import { DebugHUD } from './components/overlays/DebugHUD';
import { useScreenShake } from './components/overlays/ScreenShake';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { TICK_MS } from '../../domain/constants';

export function MatchScreen() {
  const navigate = useNavigate();
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const matchEndTime = useGameStore((s) => s.matchEndTime);
  const tick = useGameStore((s) => s.tick);
  const resolveArrivingUnits = useGameStore((s) => s.resolveArrivingUnits);

  useEffect(() => {
    if (!matchStartTime) {
      navigate('/lobby');
      return;
    }

    const interval = setInterval(() => {
      tick();
      resolveArrivingUnits();
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [matchStartTime, navigate, tick, resolveArrivingUnits]);

  useEffect(() => {
    if (matchEndTime) {
      navigate('/match-end');
    }
  }, [matchEndTime, navigate]);

  const setMatchPauseOpen = useUIStore((s) => s.setMatchPauseOpen);
  const screenShake = useScreenShake();

  return (
    <motion.div
      className={`match-screen ${screenShake ? 'shake' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="match-settings-btn"
        onClick={() => setMatchPauseOpen(true)}
        title="Settings"
        aria-label="Settings"
      >
        ⚙️
      </button>
      <MatchPauseOverlay />
      <DisconnectOverlay />
      <DebugHUD />
      <BattleLayer />
      <div className="match-hud">
        <ThreatStrip />
        <div className="hud-top">
          <ResourceMeters />
        </div>
        <div className="hud-left">
          <ResourceClickField />
          <BankButton />
          <WallHealthMeter />
        </div>
        <div className="hud-minimap">
          <ScoreboardStrip />
        </div>
        <div className="hud-right">
          <UpgradePanel />
        </div>
        <div className="hud-bottom">
          <div className="deploy-area">
            <StealFeedback />
            <DeployBar />
          </div>
        </div>
      </div>
      <WorldViewOverlay />
    </motion.div>
  );
}
