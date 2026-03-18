import { useEffect, useRef, useState } from 'react';
import { Application, Graphics } from 'pixi.js';
import { useGameStore } from '../../../../store/gameStore';

const IMPACT_DISPLAY_MS = 500;

export function BattleLayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const [appReady, setAppReady] = useState(false);

  const players = useGameStore((s) => s.players);
  const unitsInFlight = useGameStore((s) => s.unitsInFlight);
  const recentImpacts = useGameStore((s) => s.recentImpacts);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new Application();
    appRef.current = app;
    let mounted = true;

    const init = async () => {
      try {
        await app.init({
          background: 0x0a0b0f,
          backgroundAlpha: 0.95,
          resizeTo: container,
          antialias: true,
        });
        if (mounted && containerRef.current) {
          containerRef.current.appendChild(app.canvas);
          setAppReady(true);
        }
      } catch (err) {
        console.error('BattleLayer init failed:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      setAppReady(false);
      try {
        app.destroy(true);
      } catch (_) {
        /* ignore destroy errors */
      }
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !appReady) return;

    app.stage.removeChildren();

    const baseWidth = app.screen.width;
    const baseHeight = app.screen.height;
    const centerX = baseWidth / 2;
    const centerY = baseHeight / 2;
    const radius = 0.35 * Math.min(baseWidth, baseHeight);
    const playerCount = players.length;

    const getRadialPos = (i: number) => {
      const angle = (2 * Math.PI * i) / playerCount - Math.PI / 2;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    };

    const drawWall = (x: number, y: number, color: number, health: number, maxHealth: number) => {
      const g = new Graphics();
      const height = 80;
      const width = 20;
      g.rect(x - width / 2, y - height / 2, width, height)
        .fill({ color: 0x333333, alpha: 0.8 });
      g.rect(x - width / 2, y - height / 2, width, height * (health / maxHealth))
        .fill({ color, alpha: 0.9 });
      app.stage.addChild(g);
    };

    players.forEach((p, i) => {
      const pos = getRadialPos(i);
      const color = parseInt(p.color.replace('#', ''), 16);
      drawWall(pos.x, pos.y, color, p.wallHealth, p.maxWallHealth);
    });

    unitsInFlight.forEach((u) => {
      const owner = players.find((p) => p.id === u.ownerId);
      const target = players.find((p) => p.id === u.targetId);
      if (!owner || !target) return;

      const ownerIdx = players.findIndex((p) => p.id === u.ownerId);
      const targetIdx = players.findIndex((p) => p.id === u.targetId);
      const start = getRadialPos(ownerIdx);
      const end = getRadialPos(targetIdx);

      const x = start.x + (end.x - start.x) * u.progress;
      const y = start.y + (end.y - start.y) * u.progress;

      const g = new Graphics();
      const color = parseInt(owner.color.replace('#', ''), 16);
      g.circle(x, y, 8)
        .fill({ color, alpha: 0.9 })
        .stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
      app.stage.addChild(g);
    });

    const now = Date.now();
    recentImpacts
      .filter((i) => now - i.timestamp < IMPACT_DISPLAY_MS)
      .forEach((impact) => {
        const targetIdx = players.findIndex((p) => p.id === impact.targetId);
        if (targetIdx < 0) return;
        const pos = getRadialPos(targetIdx);
        const x = pos.x;
        const y = pos.y;
        const age = (now - impact.timestamp) / IMPACT_DISPLAY_MS;
        const radius = 15 + age * 25;
        const alpha = 1 - age;
        const burst = new Graphics();
        burst.circle(x, y, radius).fill({ color: 0xff6600, alpha: alpha * 0.4 });
        burst.circle(x, y, radius).stroke({ color: 0xffaa00, width: 2, alpha: alpha * 0.6 });
        app.stage.addChild(burst);
      });
  }, [players, unitsInFlight, recentImpacts, appReady]);

  return <div ref={containerRef} className="battle-layer" />;
}
