import { useState, useEffect } from 'react';
import { useGameStore } from '../../../../store/gameStore';

export function DebugHUD() {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);
  const tickIndex = useGameStore((s) => s.tickIndex);
  const matchStartTime = useGameStore((s) => s.matchStartTime);
  const unitsInFlight = useGameStore((s) => s.unitsInFlight);
  const players = useGameStore((s) => s.players);
  const lastBotAction = useGameStore((s) => s.lastBotAction);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible || !import.meta.env.DEV) return;
    let frames = 0;
    let last = performance.now();
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!import.meta.env.DEV || !visible || !matchStartTime) return null;

  const matchTimeSec = ((Date.now() - matchStartTime) / 1000).toFixed(1);

  const botName = lastBotAction
    ? players.find((p) => p.id === lastBotAction!.botId)?.name ?? lastBotAction.botId
    : null;

  return (
    <div className="debug-hud">
      <div className="debug-hud-row">tick: {tickIndex}</div>
      <div className="debug-hud-row">match: {matchTimeSec}s</div>
      <div className="debug-hud-row">units: {unitsInFlight.length}</div>
      <div className="debug-hud-row">players: {players.length}</div>
      <div className="debug-hud-row">fps: {fps}</div>
      {lastBotAction && (
        <div className="debug-hud-row">
          CPU: {botName} → {lastBotAction.action} (tick {lastBotAction.tickIndex})
        </div>
      )}
    </div>
  );
}
