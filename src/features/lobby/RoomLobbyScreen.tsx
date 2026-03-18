import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createRoom, joinRoom, broadcastAction, disconnect, getConnections } from '../../shared/network/matchService';
import { useGameStore, createPlayer } from '../../store/gameStore';
import type { PlayerState } from '../../domain/types';

type RoomState = 'create' | 'join' | 'waiting' | 'joining' | 'error';

export function RoomLobbyScreen() {
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const [roomState, setRoomState] = useState<RoomState>(() => (paramRoomId ? 'join' : 'create'));
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState(() => (paramRoomId?.toUpperCase() ?? ''));
  const [error, setError] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [isHostUser, setIsHostUser] = useState(false);

  const startMultiplayerMatch = useGameStore((s) => s.startMultiplayerMatch);

  useEffect(() => {
    return () => disconnect();
  }, []);

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
              action.localPlayerIndex
            );
            navigate('/match');
          } else {
            useGameStore.getState().applyRemoteAction(action);
          }
        },
        onPeerJoined: () => setPeerCount(getConnections().length),
        onPeerLeft: () => setPeerCount(getConnections().length),
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
    joinRoom(code, {
      onAction: (action) => {
        if (action.type === 'start') {
          startMultiplayerMatch(
            action.players as PlayerState[],
            action.matchStartTime,
            action.localPlayerIndex
          );
          navigate('/match');
        } else {
          useGameStore.getState().applyRemoteAction(action);
        }
      },
      onPeerJoined: () => {},
      onPeerLeft: () => {},
      onError: (err) => {
        setError(err.message);
        setRoomState('join');
      },
    })
      .then(() => setRoomState('waiting'))
      .catch(() => setRoomState('join'));
  };

  const handleStartMatch = () => {
    const players: PlayerState[] = [
      createPlayer('player-0', 0),
      createPlayer('player-1', 1),
    ];
    players[0].name = 'You';
    players[1].name = 'Opponent';
    const matchStartTime = Date.now();
    startMultiplayerMatch(players, matchStartTime, 0);
    broadcastAction({
      type: 'start',
      matchStartTime,
      players,
      localPlayerIndex: 0,
      senderId: 'player-0',
    });
    navigate('/match');
  };

  const handleBack = () => {
    disconnect();
    navigate('/lobby');
  };

  const copyLink = () => {
    const url = `${window.location.origin}/#/room/${roomId}`;
    navigator.clipboard.writeText(url);
  };

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
          {roomState === 'joining' ? 'Connecting...' : 'Waiting for opponent'}
        </p>
        {error && <p className="lobby-error">{error}</p>}
        {roomState === 'waiting' && roomId && (
          <>
            <div className="room-code-wrap">
              <span className="room-code">{roomId}</span>
              {isHostUser && (
                <button className="room-copy-btn" onClick={copyLink}>
                  Copy link
                </button>
              )}
            </div>
            <p className="room-status">
              {isHostUser
                ? (peerCount >= 1 ? 'Opponent connected! Ready to start.' : 'Share the code or link with your friend')
                : 'Waiting for host to start...'}
            </p>
            {isHostUser && (
              <motion.button
                className="mode-card"
                onClick={handleStartMatch}
                disabled={peerCount < 1}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="mode-title">Start Match</span>
                <span className="mode-desc">1v1</span>
              </motion.button>
            )}
          </>
        )}
        <motion.button
          className="lobby-back-btn"
          onClick={handleBack}
          style={{ marginTop: '2rem' }}
        >
          ← Leave Room
        </motion.button>
      </div>
    </motion.div>
  );
}
