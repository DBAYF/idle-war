import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

/** Vite `base` (e.g. subpath deploy). Root is `/` → no basename. */
function routerBasename(): string | undefined {
  const base = import.meta.env.BASE_URL;
  if (base === '/' || base === '') return undefined;
  return base.replace(/\/$/, '') || undefined;
}
import { LandingScreen } from './features/landing/LandingScreen';
import { LobbyScreen } from './features/lobby/LobbyScreen';
import { CustomGameSetup } from './features/lobby/CustomGameSetup';
import { RoomLobbyScreen } from './features/lobby/RoomLobbyScreen';
import { MatchScreen } from './features/game/MatchScreen';
import { MatchEndScreen } from './features/game/MatchEndScreen';
import './shared/theme/theme.css';
import './App.css';

function App() {
  return (
    <BrowserRouter basename={routerBasename()}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/custom" element={<CustomGameSetup />} />
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
