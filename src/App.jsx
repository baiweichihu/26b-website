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
import Lobby from './pages/static/Lobby';
import Home from './pages/static/Home';
import Introduction from './pages/static/Introduction';
import Activities from './pages/static/Activities';
import Journal from './pages/journal/Journal';
import AlumniJournalAccess from './pages/journal/AlumniJournalAccess';
import Wall from './pages/post/Wall';
import Contact from './pages/static/Contact';
import CreatePost from './pages/post/CreatePost';
import PostDetail from './pages/post/PostDetail';
import Login from './pages/user/Login';
import Register from './pages/user/Register';
import GuestUpdateIdentity from './pages/user/GuestUpdateIdentity';
import UserManagement from './pages/user/UserManagement';
import ResetPassword from './pages/user/ResetPassword';
import EditProfile from './pages/user/EditProfile';
import Notifications from './pages/notifications/Notifications';
import ReportDetail from './pages/report/ReportDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserPermissions from './pages/admin/UserPermissions';
import ContentReports from './pages/admin/ContentReports';
import JournalApproval from './pages/admin/JournalApproval';
import PermissionRequest from './pages/admin/PermissionRequest';
import PermissionApprovals from './pages/admin/PermissionApprovals';
import SuperuserPanel from './pages/admin/SuperuserPanel';
import Announcement from './pages/admin/Announcement';
import MusicPlayer from './components/features/media/MusicPlayer';
import EasterEgg from './components/features/media/EasterEgg';

const AppLayout = () => {
  const location = useLocation();
  const isLobby = location.pathname === '/lobby';

  return (
    <>
      {!isLobby && <CornerNav />}
      {!isLobby && <Header />}
      <main className={isLobby ? 'lobby-main' : 'scene-main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/access-request" element={<AlumniJournalAccess />} />
          <Route path="/wall" element={<Wall />} />
          <Route path="/posts/new" element={<CreatePost />} />
          <Route path="/posts/:postId" element={<PostDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports/:reportId" element={<ReportDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guest-update-identity" element={<GuestUpdateIdentity />} />
          <Route path="/user/reset-password" element={<ResetPassword />} />
          <Route path="/user/manage" element={<UserManagement />} />
          <Route path="/user/edit-profile" element={<EditProfile />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/user-permissions" element={<UserPermissions />} />
          <Route path="/admin/content-reports" element={<ContentReports />} />
          <Route path="/admin/permission-request" element={<PermissionRequest />} />
          <Route path="/admin/permission-approvals" element={<PermissionApprovals />} />
          <Route path="/admin/superuser-panel" element={<SuperuserPanel />} />
          <Route path="/admin/announcement" element={<Announcement />} />
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
      <Router basename={import.meta.env.BASE_URL}>
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
