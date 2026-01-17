import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntroScreen from './components/IntroScreen';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Introduction from './pages/Introduction';
import Activities from './pages/Activities';
import Journal from './pages/Journal';
import Wall from './pages/Wall';
import Contact from './pages/Contact';
import MusicPlayer from './components/MusicPlayer'; // <-- Import MusicPlayer

function App() {
  const [showIntro, setShowIntro] = useState(true);

  const handleEnter = () => {
    // Add fade-out class and hide after animation
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

        {/* Render the Music Player here */}
        <MusicPlayer /> 
      </Router>
    </>
  );
}

export default App;
