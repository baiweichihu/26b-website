import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntroScreen from './components/landing/IntroScreen';
import Header from './components/layout/Header';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Introduction from './pages/Introduction';
import Activities from './pages/Activities';
import Journal from './pages/Journal';
import Wall from './pages/Wall';
import Contact from './pages/Contact';
import MusicPlayer from './components/features/media/MusicPlayer';
import EasterEgg from './components/features/media/EasterEgg'; // already imported

function App() {
  const [showIntro, setShowIntro] = useState(true);

  const handleEnter = () => {
    setTimeout(() => setShowIntro(false), 600);
  };

  return (
    <>
      {showIntro && <IntroScreen onEnter={handleEnter} />}
      <Router>
        <Header />
        <Navbar />
        <main className="container my-5">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/introduction" element={<Introduction />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/wall" element={<Wall />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />

        {/* Floating Music Player */}
        <MusicPlayer />

        {/* Easter Egg glitch functionality */}
        <EasterEgg />
      </Router>
    </>
  );
}

export default App;
