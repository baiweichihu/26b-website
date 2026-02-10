import { useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import IntroScreen from './components/landing/IntroScreen';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CornerNav from './components/layout/CornerNav';
import UserDock from './components/layout/UserDock';
import BackgroundParticles from './components/layout/BackgroundParticles';
import IrisTransition from './components/ui/IrisTransition';
import Lobby from './pages/Lobby';
import Home from './pages/Home';
import Introduction from './pages/Introduction';
import Activities from './pages/Activities';
import Journal from './pages/Journal';
import Wall from './pages/Wall';
import Contact from './pages/Contact';
import TicketCenter from './pages/TicketCenter';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import GuestUpdateIdentity from './pages/GuestUpdateIdentity';
import UserManagement from './pages/UserManagement';
import MusicPlayer from './components/features/media/MusicPlayer';
import EasterEgg from './components/features/media/EasterEgg'; // already imported

const AppLayout = () => {
  const location = useLocation();
  const isLobby = location.pathname === '/lobby';

  return (
    <>
      {!isLobby && <CornerNav />}
      {!isLobby && <Header />}
      {!isLobby && <UserDock />}
      <main className={isLobby ? 'lobby-main' : 'scene-main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/wall" element={<Wall />} />
          <Route path="/posts/new" element={<CreatePost />} />
          <Route path="/posts/:postId" element={<PostDetail />} />
          <Route path="/tickets/new/:targetType/:targetId" element={<TicketCenter />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guest-update-identity" element={<GuestUpdateIdentity />} />
          <Route path="/user/manage" element={<UserManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isLobby && <Footer />}
    </>
  );
};

const IntroGate = () => {
  const [showIntro, setShowIntro] = useState(true);
  const hasRedirected = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleEnter = () => {
    setShowIntro(false);
    if (!hasRedirected.current && location.pathname === '/') {
      hasRedirected.current = true;
      navigate('/', { replace: true });
    }
  };

  return showIntro ? <IntroScreen onEnter={handleEnter} /> : null;
};

function App() {
  return (
    <>
      <Router>
        <BackgroundParticles />
        <div className="app-shell">
          <IrisTransition>
            <IntroGate />
            <AppLayout />

            {/* Floating Music Player */}
            <MusicPlayer />

            {/* Easter Egg glitch functionality */}
            <EasterEgg />
          </IrisTransition>
        </div>
      </Router>
    </>
  );
}

export default App;
