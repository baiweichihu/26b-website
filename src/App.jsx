import { lazy, Suspense, useRef, useState } from 'react';
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

const Lobby = lazy(() => import('./pages/static/Lobby'));
const Home = lazy(() => import('./pages/static/Home'));
const Handbook = lazy(() => import('./pages/static/Handbook'));
const PeopleCenter = lazy(() => import('./pages/people/PeopleCenter'));
const PeopleProfileEdit = lazy(() => import('./pages/people/PeopleProfileEdit'));
const PeopleOwnershipLogs = lazy(() => import('./pages/people/PeopleOwnershipLogs'));
const Activities = lazy(() => import('./pages/static/Activities'));
const Journal = lazy(() => import('./pages/static/Journal'));
const Wall = lazy(() => import('./pages/post/Wall'));
const Album = lazy(() => import('./pages/album/Album'));
const Contact = lazy(() => import('./pages/static/Contact'));
const CreatePost = lazy(() => import('./pages/post/CreatePost'));
const PostDetail = lazy(() => import('./pages/post/PostDetail'));
const Login = lazy(() => import('./pages/user/Login'));
const Register = lazy(() => import('./pages/user/Register'));
const UserManagement = lazy(() => import('./pages/user/UserManagement'));
const ResetPassword = lazy(() => import('./pages/user/ResetPassword'));
const EditProfile = lazy(() => import('./pages/user/EditProfile'));
const Notifications = lazy(() => import('./pages/notifications/Notifications'));
const ReportDetail = lazy(() => import('./pages/report/ReportDetail'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const BanUsers = lazy(() => import('./pages/admin/BanUsers'));
const ContentReports = lazy(() => import('./pages/admin/ContentReports'));
const PermissionRequest = lazy(() => import('./pages/admin/PermissionRequest'));
const PermissionApprovals = lazy(() => import('./pages/admin/PermissionApprovals'));
const SuperuserPanel = lazy(() => import('./pages/admin/SuperuserPanel'));
const Announcement = lazy(() => import('./pages/admin/Announcement'));
const RegisterApprovals = lazy(() => import('./pages/admin/RegisterApprovals'));
const MusicPlayer = lazy(() => import('./components/features/media/MusicPlayer'));

const AppLayout = () => {
  const location = useLocation();
  const isLobby = location.pathname === '/lobby';
  const isAlbum = location.pathname === '/album' || location.pathname.startsWith('/album/');

  return (
    <>
      {!isLobby && <CornerNav />}
      {!isLobby && <Header />}
      <main className={isLobby ? 'lobby-main' : `scene-main${isAlbum ? ' album-main' : ''}`}>
        <Suspense
          fallback={
            <section className="scene-panel" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">加载中...</span>
              </div>
            </section>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/introduction" element={<Navigate to="/introduction/students" replace />} />
            <Route path="/introduction/students" element={<PeopleCenter />} />
            <Route path="/introduction/teachers" element={<PeopleCenter />} />
            <Route path="/introduction/ownership-logs" element={<PeopleOwnershipLogs />} />
            <Route path="/people/edit" element={<PeopleProfileEdit />} />
            <Route path="/people/edit/:profileId" element={<PeopleProfileEdit />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/wall" element={<Wall />} />
            <Route path="/album" element={<Album />} />
            <Route path="/album/:folderId" element={<Album />} />
            <Route path="/posts/new" element={<CreatePost />} />
            <Route path="/posts/:postId" element={<PostDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports/:reportId" element={<ReportDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/user/reset-password" element={<ResetPassword />} />
            <Route path="/user/manage" element={<UserManagement />} />
            <Route path="/user/edit-profile" element={<EditProfile />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/ban-users" element={<BanUsers />} />
            <Route path="/admin/content-reports" element={<ContentReports />} />
            <Route path="/admin/register-approvals" element={<RegisterApprovals />} />
            <Route path="/admin/permission-request" element={<PermissionRequest />} />
            <Route path="/admin/permission-approvals" element={<PermissionApprovals />} />
            <Route path="/admin/superuser-panel" element={<SuperuserPanel />} />
            <Route path="/admin/announcement" element={<Announcement />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
            <Suspense fallback={null}>
              <MusicPlayer />
            </Suspense>
          </IrisTransition>
        </div>
      </Router>
    </>
  );
}

export default App;
