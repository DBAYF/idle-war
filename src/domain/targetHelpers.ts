/** Target selection helpers — used by TargetSelector and tests */

import type { PlayerState } from './types';

/**
 * Returns players that are valid deploy targets (enemies) for the local player.
 * In 2v2: excludes teammates (same teamId).
 * In FFA/1v1: excludes only self.
 */
export function getEnemies(players: PlayerState[], localPlayerId: string): PlayerState[] {
  const localPlayer = players.find((p) => p.id === localPlayerId);
  if (localPlayer?.teamId != null) {
    return players.filter(
      (p) => p.id !== localPlayerId && (p.teamId ?? -1) !== localPlayer.teamId
    );
  }
  return players.filter((p) => p.id !== localPlayerId);
}
