import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigationType,
  useLocation,
  Navigate,
} from 'react-router-dom';

import A4PagePrint from './components/A4PagePrint';
import A3PagePrint from './components/A3PagePrint';
import Home from './components/Home';
import SplashScreen from './components/SplashScreen';
import './App.css';
import ComingSoon from './components/ComingSoon/ComingSoon';
import Login from './components/Login/pages/Login';
import Register from './components/Login/pages/Register';
import A4Gestionale from './gestionale/A4Gestionale';
import { auth } from './backend/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './backend/firebase';
import A3Gestionale from './gestionale/A3Gestionale';

const ScrollToTop: React.FC = () => {
  const navigationType = useNavigationType();
  const location = useLocation();

  useEffect(() => {
    if (navigationType === 'POP') {
      window.scrollTo(0, 0);
    }
  }, [navigationType, location]);

  return null;
};

const AdminRoute: React.FC<{ element: JSX.Element }> = ({ element }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const data = snap.data();

      setIsAdmin(data?.ruolo === 'amministratore');
    };

    checkRole();
  }, []);

  if (isAdmin === null) return <div>Caricamento...</div>;
  return isAdmin ? element : <Navigate to="/" replace />;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000); // Mostra la splash per 5 secondi
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      {showSplash ? (
        <SplashScreen onEnd={() => setShowSplash(false)} />
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/printA4" element={<A4PagePrint />} />
          <Route path="/printA3" element={<A3PagePrint />} />
          <Route path="/comingSoon" element={<ComingSoon />} />
          <Route path="/gestionaleA4" element={<AdminRoute element={<A4Gestionale />} />} />
          <Route path="/gestionaleA3" element={<AdminRoute element={<A3Gestionale />} />} />
        </Routes>
      )}
    </Router>
  );
};

export default App;