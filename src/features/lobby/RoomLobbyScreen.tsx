import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createRoom, joinRoom, broadcastAction, disconnect, getConnections, setCallbacks } from '../../shared/network/matchService';
import { useGameStore, createPlayer } from '../../store/gameStore';
import { GameRulesForm } from './GameRulesForm';
import { SetupSummary } from '../setup/SetupSummary';
import { SetupSummaryReadOnly } from '../setup/SetupSummaryReadOnly';
import { ValidationBanner } from '../setup/ValidationBanner';
import { DEFAULT_MATCH_CONFIG } from '../../domain/constants';
import { validateSetup } from '../../domain/validateSetup';
import type { PlayerState, MatchConfig } from '../../domain/types';

const CONFIG_SYNC_DEBOUNCE_MS = 400;
const JOIN_TIMEOUT_MS = 15000;
const COPY_FEEDBACK_MS = 2000;

type RoomState = 'create' | 'join' | 'waiting' | 'joining' | 'error' | 'connectionEnded';
type CopyFeedback = 'link' | 'code' | null;

export function RoomLobbyScreen() {
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const [roomState, setRoomState] = useState<RoomState>(() => (paramRoomId ? 'join' : 'create'));
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState(() => (paramRoomId?.toUpperCase() ?? ''));
  const [error, setError] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [isHostUser, setIsHostUser] = useState(false);
  const [hostConfig, setHostConfig] = useState<MatchConfig>(() => ({ ...DEFAULT_MATCH_CONFIG }));
  const [receivedConfig, setReceivedConfig] = useState<MatchConfig | null>(null);
  const [hostLeft, setHostLeft] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const [startInProgress, setStartInProgress] = useState(false);
  const configSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hostConfigRef = useRef<MatchConfig>(hostConfig);
  const joinerRoomIdRef = useRef('');
  hostConfigRef.current = hostConfig;

  const startMultiplayerMatch = useGameStore((s) => s.startMultiplayerMatch);
  const setLastRoomId = useGameStore((s) => s.setLastRoomId);
  const setWasHost = useGameStore((s) => s.setWasHost);
  const clearLastRoom = useGameStore((s) => s.clearLastRoom);
  const lastRoomId = useGameStore((s) => s.lastRoomId);
  const wasHost = useGameStore((s) => s.wasHost);

  // Rematch return: re-enter room without disconnecting (do NOT disconnect on unmount; only on Leave room)
  useEffect(() => {
    if (!paramRoomId || lastRoomId !== paramRoomId) return;
    const conns = getConnections();
    if (conns.length > 0) {
      setCallbacks({
        onAction: (action) => {
          if (action.type === 'start') {
            setLastRoomId(paramRoomId);
            setWasHost(false);
            startMultiplayerMatch(
              action.players as PlayerState[],
              action.matchStartTime,
              action.localPlayerIndex,
              action.matchConfig
            );
            navigate('/match');
          } else if (action.type === 'configSync' && action.senderId === 'host') {
            setReceivedConfig(action.matchConfig);
          } else {
            useGameStore.getState().applyRemoteAction(action);
          }
        },
        onPeerJoined: () => {
          setPeerCount(getConnections().length);
          const cfg = { ...hostConfigRef.current, mode: '1v1' as const };
          const valid = validateSetup(cfg, '1v1', true);
          if (valid.valid) {
            broadcastAction({ type: 'configSync', matchConfig: cfg, senderId: 'host' });
          }
        },
        onPeerLeft: () => {
          setPeerCount(getConnections().length);
          if (!wasHost) setHostLeft(true);
          useGameStore.getState().setPeerDisconnected(true);
        },
        onError: (err) => setError(err.message),
      });
      setRoomState('waiting');
      setRoomId(paramRoomId);
      setIsHostUser(wasHost);
      setPeerCount(conns.length);
      if (wasHost) {
        const cfg = { ...DEFAULT_MATCH_CONFIG, mode: '1v1' as const };
        broadcastAction({ type: 'configSync', matchConfig: cfg, senderId: 'host' });
      }
    } else {
      setRoomState('connectionEnded');
      setRoomId(paramRoomId);
    }
  }, [paramRoomId, lastRoomId, wasHost, startMultiplayerMatch, navigate, setLastRoomId, setWasHost]);

  // Host: debounced configSync when rules change and peerCount >= 1
  useEffect(() => {
    if (!isHostUser || peerCount < 1) return;
    if (configSyncTimeoutRef.current) clearTimeout(configSyncTimeoutRef.current);
    configSyncTimeoutRef.current = setTimeout(() => {
      const cfg = { ...hostConfigRef.current, mode: '1v1' as const };
      broadcastAction({ type: 'configSync', matchConfig: cfg, senderId: 'host' });
      configSyncTimeoutRef.current = null;
    }, CONFIG_SYNC_DEBOUNCE_MS);
    return () => {
      if (configSyncTimeoutRef.current) clearTimeout(configSyncTimeoutRef.current);
    };
  }, [isHostUser, peerCount, hostConfig]);

  const handleCreateRoom = async () => {
    setRoomState('waiting');
    setError('');
    try {
      setIsHostUser(true);
      const id = await createRoom({
        onAction: (action) => {
          if (action.type === 'start') {
            startMultiplayerMatch(
              action.players as PlayerState[],
              action.matchStartTime,
              action.localPlayerIndex,
              action.matchConfig
            );
            navigate('/match');
          } else {
            useGameStore.getState().applyRemoteAction(action);
          }
        },
        onPeerJoined: () => {
          setPeerCount(getConnections().length);
          const cfg = { ...hostConfigRef.current, mode: '1v1' as const };
          const valid = validateSetup(cfg, '1v1', true);
          if (valid.valid) {
            broadcastAction({ type: 'configSync', matchConfig: cfg, senderId: 'host' });
          }
        },
        onPeerLeft: () => {
          setPeerCount(getConnections().length);
          useGameStore.getState().setPeerDisconnected(true);
        },
        onError: (err) => setError(err.message),
      });
      setRoomId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setRoomState('create');
    }
  };

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Enter a valid room code');
      return;
    }
    setRoomState('joining');
    setError('');
    setIsHostUser(false);
    setRoomId(code);
    joinerRoomIdRef.current = code;
    const joinPromise = joinRoom(code, {
      onAction: (action) => {
        if (action.type === 'start') {
          setLastRoomId(joinerRoomIdRef.current || code);
          setWasHost(false);
          startMultiplayerMatch(
            action.players as PlayerState[],
            action.matchStartTime,
            action.localPlayerIndex,
            action.matchConfig
          );
          navigate('/match');
        } else if (action.type === 'configSync' && action.senderId === 'host') {
          setReceivedConfig(action.matchConfig);
        } else {
          useGameStore.getState().applyRemoteAction(action);
        }
      },
      onPeerJoined: () => {},
      onPeerLeft: () => {
        setHostLeft(true);
        useGameStore.getState().setPeerDisconnected(true);
      },
      onError: (err) => {
        setError(err.message);
        setRoomState('join');
      },
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out. Check the code and try again.')), JOIN_TIMEOUT_MS)
    );
    Promise.race([joinPromise, timeoutPromise])
      .then(() => setRoomState('waiting'))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't connect. Check the code or try again.");
        setRoomState('join');
      });
  };

  const matchConfig: MatchConfig = { ...hostConfig, mode: '1v1' };
  const hostValidation = validateSetup(matchConfig, '1v1', true);

  const handleStartMatch = () => {
    if (!hostValidation.valid || startInProgress) return;
    setStartInProgress(true);
    setLastRoomId(roomId);
    setWasHost(true);
    const players: PlayerState[] = [
      createPlayer('player-0', 0, matchConfig),
      createPlayer('player-1', 1, matchConfig),
    ];
    players[0].name = 'You';
    players[1].name = 'Opponent';
    const matchStartTime = Date.now();
    startMultiplayerMatch(players, matchStartTime, 0, matchConfig);
    broadcastAction({
      type: 'start',
      matchStartTime,
      players,
      localPlayerIndex: 0,
      senderId: 'player-0',
      matchConfig,
    });
    navigate('/match');
  };

  const handleBack = () => {
    clearLastRoom();
    disconnect();
    navigate('/lobby');
  };

  const handleReturnToLobbyFromHostLeft = () => {
    clearLastRoom();
    disconnect();
    navigate('/lobby', { replace: true });
  };

  const copyToClipboard = (text: string, kind: CopyFeedback) => {
    try {
      navigator.clipboard.writeText(text);
      setCopyFeedback(kind);
      setTimeout(() => setCopyFeedback(null), COPY_FEEDBACK_MS);
    } catch {
      setError('Copy failed; please copy the code manually.');
    }
  };
  const copyLink = () => copyToClipboard(`${window.location.origin}/#/room/${roomId}`, 'link');
  const copyCode = () => copyToClipboard(roomId, 'code');

  if (roomState === 'create' || roomState === 'join') {
    return (
      <motion.div
        className="lobby"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="lobby-bg" />
        <div className="lobby-content">
          <h1>ONLINE MULTIPLAYER</h1>
          <p className="lobby-sub">Play with a friend</p>
          {error && <p className="lobby-error">{error}</p>}
          <motion.div className="lobby-modes" style={{ flexDirection: 'column', gap: '1rem' }}>
            {roomState === 'create' ? (
              <>
                <motion.button
                  className="mode-card"
                  onClick={handleCreateRoom}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mode-title">Create Room</span>
                  <span className="mode-desc">Host a 1v1 match</span>
                </motion.button>
                <motion.button
                  className="mode-card mode-card-secondary"
                  onClick={() => setRoomState('join')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mode-title">Join Room</span>
                  <span className="mode-desc">Enter room code</span>
                </motion.button>
              </>
            ) : (
              <>
                <div className="join-input-wrap">
                  <input
                    type="text"
                    className="join-input"
                    placeholder="Room code (e.g. ABC123)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    aria-label="Room code"
                  />
                </div>
                <motion.button
                  className="mode-card"
                  onClick={handleJoinRoom}
                  disabled={joinCode.trim().length < 4}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mode-title">Join</span>
                </motion.button>
                <motion.button
                  className="mode-card mode-card-secondary"
                  onClick={() => { setRoomState('create'); setJoinCode(''); setError(''); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back
                </motion.button>
              </>
            )}
            <motion.button
              className="lobby-back-btn"
              onClick={() => navigate('/lobby')}
            >
              ← Lobby
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  if (roomState === 'connectionEnded') {
    return (
      <motion.div className="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="lobby-bg" />
        <div className="lobby-content">
          <h1>ROOM {roomId}</h1>
          <p className="lobby-sub">Connection ended.</p>
          <p className="room-status">Leave room and create or join a new room.</p>
          <motion.button className="lobby-back-btn" onClick={handleBack} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Leave room
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (roomState === 'waiting' && !isHostUser && hostLeft) {
    return (
      <motion.div className="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="lobby-bg" />
        <div className="lobby-content">
          <h1>ROOM {roomId}</h1>
          <p className="lobby-sub">Host left the room.</p>
          <motion.button className="lobby-back-btn" onClick={handleReturnToLobbyFromHostLeft} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            Return to lobby
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="lobby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="lobby-bg" />
      <div className="lobby-content">
        <h1>ROOM {roomId}</h1>
        <p className="lobby-sub">
          {roomState === 'joining' ? 'Connecting…' : 'Waiting for opponent'}
        </p>
        {roomState === 'joining' && (
          <div className="queue-spinner room-joining-spinner" aria-live="polite" aria-busy="true" />
        )}
        {error && <p className="lobby-error">{error}</p>}
        {roomState === 'waiting' && roomId && (
          <>
            <div className="room-code-wrap">
              <span className="room-code">{roomId}</span>
              {isHostUser && (
                <>
                  <button
                    type="button"
                    className="room-copy-btn"
                    onClick={copyLink}
                    aria-label="Copy link"
                  >
                    {copyFeedback === 'link' ? 'Copied!' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    className="room-copy-btn"
                    onClick={copyCode}
                    aria-label="Copy code"
                  >
                    {copyFeedback === 'code' ? 'Copied!' : 'Copy code'}
                  </button>
                  <span className="sr-only" aria-live="polite">
                    {copyFeedback === 'link' && 'Link copied to clipboard.'}
                    {copyFeedback === 'code' && 'Code copied to clipboard.'}
                  </span>
                </>
              )}
            </div>
            <p className="room-status" aria-live="polite">
              {isHostUser
                ? (peerCount >= 1 ? 'Opponent connected! Set rules and start.' : 'Share the code or link with your friend')
                : 'Waiting for host to start...'}
            </p>
            {isHostUser && (
              <>
                <div className="game-rules-wrap">
                  <GameRulesForm config={hostConfig} onChange={setHostConfig} showAiDifficulty={false} />
                </div>
                <SetupSummary config={matchConfig} mode="1v1" showAi={false} />
                <ValidationBanner validation={hostValidation} />
                <motion.button
                  className="mode-card"
                  onClick={handleStartMatch}
                  disabled={!hostValidation.valid || peerCount < 1 || startInProgress}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Start Match"
                >
                  <span className="mode-title">Start Match</span>
                  <span className="mode-desc">1v1</span>
                </motion.button>
              </>
            )}
            {!isHostUser && <SetupSummaryReadOnly config={receivedConfig} />}
          </>
        )}
        <motion.button
          className="lobby-back-btn"
          onClick={handleBack}
          style={{ marginTop: '2rem' }}
          aria-label="Leave room"
        >
          ← Leave Room
        </motion.button>
      </div>
    </motion.div>
  );
}
