import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  NavigationType,
  Location,
  useNavigationType,
  useLocation,
} from 'react-router-dom';

import A4PagePrint from './components/A4PagePrint';
import A3PagePrint from './components/A3PagePrint';
import Home from './components/Home'; // corretto il path
import SplashScreen from './components/SplashScreen'; // aggiunto
import './App.css'; // per stile splash
import ComingSoon from './components/ComingSoon/ComingSoon';
import Login from './components/Login/pages/Login';
import Register from './components/Login/pages/Register';


const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000); // mostra per 5 secondi
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) return <SplashScreen onEnd={() => setShowSplash(false)} />;

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/printA4" element={<A4PagePrint />} />
        <Route path="/printA3" element={<A3PagePrint />} />
        <Route path="/comingSoon" element={<ComingSoon />} />
        {/* Aggiungi altre rotte se necessario */}
      </Routes>
    </Router>
  );
};

const ScrollToTop: React.FC = () => {
  const navigationType: NavigationType = useNavigationType();
  const location: Location = useLocation();

  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, 0);
    }
  }, [navigationType, location]);

  return null;
};

export default App;
