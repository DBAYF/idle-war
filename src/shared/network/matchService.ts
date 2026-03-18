/** P2P multiplayer via PeerJS */

import Peer from 'peerjs';

export type GameAction =
  | { type: 'start'; matchStartTime: number; players: unknown[]; localPlayerIndex: number; senderId: string }
  | { type: 'click'; playerId: string; senderId: string }
  | { type: 'bank'; playerId: string; amount: number; senderId: string }
  | { type: 'upgrade'; playerId: string; upgradeId: string; senderId: string }
  | { type: 'deploy'; ownerId: string; targetId: string; unitType: string; senderId: string };

export interface MatchServiceCallbacks {
  onAction: (action: GameAction) => void;
  onPeerJoined: () => void;
  onPeerLeft: () => void;
  onError: (err: Error) => void;
}

let peer: InstanceType<typeof Peer> | null = null;
let connections: { open: boolean; send: (d: unknown) => void; close: () => void }[] = [];
let callbacks: MatchServiceCallbacks | null = null;
let isHostMode = false;

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function parseAction(data: unknown): GameAction | null {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as GameAction;
    } catch {
      return null;
    }
  }
  return data as GameAction;
}

function relayToAll(data: unknown) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  connections.forEach((c) => {
    if (c.open) c.send(msg);
  });
}

function setupConnection(conn: { open: boolean; send: (d: unknown) => void; close: () => void; on: (e: string, cb: (...args: unknown[]) => void) => void }) {
  const c = conn as { open: boolean; send: (d: unknown) => void; close: () => void };
  conn.on('data', (data: unknown) => {
    const action = parseAction(data);
    if (action?.type && callbacks) {
      callbacks.onAction(action);
      if (isHostMode) relayToAll(data);
    }
  });
  conn.on('close', () => {
    connections = connections.filter((x) => x !== c);
    callbacks?.onPeerLeft();
  });
  conn.on('error', (err: unknown) => callbacks?.onError(err instanceof Error ? err : new Error(String(err))));
  connections.push(c);
  callbacks?.onPeerJoined();
}

export function createRoom(callbacksArg: MatchServiceCallbacks): Promise<string> {
  return new Promise((resolve, reject) => {
    callbacks = callbacksArg;
    isHostMode = true;
    const roomId = generateRoomId();
    peer = new Peer(roomId, {
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    });
    peer.on('open', () => resolve(roomId));
    peer.on('connection', (conn) => {
      conn.on('open', () => setupConnection(conn as Parameters<typeof setupConnection>[0]));
    });
    peer.on('error', (err) => {
      callbacks?.onError(err);
      reject(err);
    });
  });
}

export function joinRoom(
  roomId: string,
  callbacksArg: MatchServiceCallbacks
): Promise<void> {
  return new Promise((resolve, reject) => {
    callbacks = callbacksArg;
    isHostMode = false;
    peer = new Peer({
      host: '0.peerjs.com',
      port: 443,
      path: '/',
      secure: true,
    });
    peer.on('open', () => {
      const conn = peer!.connect(roomId);
      conn.on('open', () => {
        setupConnection(conn as Parameters<typeof setupConnection>[0]);
        resolve();
      });
      conn.on('error', (err) => {
        callbacks?.onError(err);
        reject(err);
      });
    });
    peer.on('error', (err) => {
      callbacks?.onError(err);
      reject(err);
    });
  });
}

export function broadcastAction(action: GameAction): void {
  const msg = JSON.stringify(action);
  connections.forEach((conn) => {
    if (conn.open) conn.send(msg);
  });
}

export function getConnections(): { open: boolean; send: (d: unknown) => void; close: () => void }[] {
  return [...connections];
}

export function isHost(): boolean {
  return peer !== null && connections.length > 0;
}

export function disconnect(): void {
  connections.forEach((c) => c.close());
  connections = [];
  if (peer) {
    peer.destroy();
    peer = null;
  }
  callbacks = null;
  isHostMode = false;
}
