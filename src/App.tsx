import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigationType,
  useLocation,
  Navigate,
} from 'react-router-dom';

import A4PagePrint from './components/A4/A4PagePrint';
import A3PagePrint from './components/A3/A3PagePrint';
import Home from './components/HomeComponents/Home';
import SplashScreen from './components/SplashScreenComponents/SplashScreen';
import './App.css';
import ComingSoon from './components/ComingSoon/ComingSoon';
import Login from './components/Login/pages/Login';
import Register from './components/Login/pages/Register';
import A4Gestionale from './gestionale/A4Gestionale';
import { auth } from './backend/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from './backend/firebase';
import A3Gestionale from './gestionale/A3Gestionale';
import AccountPage from './components/Login/pages/AccountPage';
import RecoverPassword from './components/Login/pages/RecoverPassword';
import ResetPassword from './components/Login/pages/ResetPassword';
import UtentiGestionale from './gestionale/UtentiGestionale';
import StoricoDati from './gestionale/StoricoDati';

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
          <Route path="/utentiGestionale" element={<AdminRoute element={<UtentiGestionale />} />} />
          <Route path="/storicoDati" element={<AdminRoute element={<StoricoDati />} />} />

          <Route path="/account" element={<AccountPage />} />
          <Route path="/recoverpassword" element={<RecoverPassword />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
        </Routes>
      )}
    </Router>
  );
};

export default App;