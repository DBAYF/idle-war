import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LandingScreen } from './features/landing/LandingScreen';
import { LobbyScreen } from './features/lobby/LobbyScreen';
import { RoomLobbyScreen } from './features/lobby/RoomLobbyScreen';
import { MatchScreen } from './features/game/MatchScreen';
import { MatchEndScreen } from './features/game/MatchEndScreen';
import './shared/theme/theme.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/room" element={<RoomLobbyScreen />} />
          <Route path="/room/:roomId" element={<RoomLobbyScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/match-end" element={<MatchEndScreen />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

export default App;
