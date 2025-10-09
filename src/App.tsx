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
import ContattiServiziFotoVideo from './components/Foto_e_Video/ContattiServiziFotoVideo';
import FotoVideoGestionale from './gestionale/FotoVideoGestionale';
import GestioneAccessi from './gestionale/GestioneAccessi';
import RecoverEmail from './components/Login/pages/RecoverEmail';
import QRCodeGenerator from './gestionale/QRCodeGenerator';
import RichiestaSitoWeb from './components/Siti/RichiestaSitoWeb';
import QRgen from './components/QR/QRgen';
import BobinePLAGestionale from './gestionale/BobineGestionale';
import Privacy from './components/Privacy/Privacy';
import LinkGestionale from './gestionale/LinkGestionale';
import CookieInfoBar from './components/Privacy/CookieInfoBar';
import Terms from './components/Privacy/Terms';
import Cookie from './components/Privacy/Cookie';
import WebGestionale from './gestionale/WebGestionale';
import RichiestaStampa3D from './components/3D/RichiestaStampa3D';


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

const ProtectedRoute: React.FC<{ element: JSX.Element; page: string }> = ({ element, page }) => {
  const [canAccess, setCanAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) {
        setCanAccess(false);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const ruolo = userSnap.data()?.ruolo || "PublicUser";

      const { checkAccess } = await import("./utils/checkAccess");
      const allowed = await checkAccess(ruolo, page);
      setCanAccess(allowed);
    };

    check();
  }, [page]);

  if (canAccess === null) return <div>Controllo accessi...</div>;
  return canAccess ? element : <Navigate to="/" replace />;
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
        <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/printA4" element={<A4PagePrint />} />
          <Route path="/printA3" element={<A3PagePrint />} />
          <Route path="/comingSoon" element={<ComingSoon />} />
          <Route path="/contatti-servizi-foto-video" element={<ContattiServiziFotoVideo />} />
          <Route path="/gestionaleA4" element={<ProtectedRoute page="gestionaleA4" element={<A4Gestionale />} />} />
          <Route path="/gestionaleA3" element={<ProtectedRoute page="gestionaleA3" element={<A3Gestionale />} />} />
          <Route path="/utentiGestionale" element={<ProtectedRoute page="utentiGestionale" element={<UtentiGestionale />} />} />
          <Route path="/storicoDati" element={<ProtectedRoute page="storicoDati" element={<StoricoDati />} />} />
          <Route path="/foto-video-gestionale" element={<ProtectedRoute page="foto-video-gestionale" element={<FotoVideoGestionale />} />} />
          <Route path="/gestione-accessi" element={<ProtectedRoute page="gestione-accessi" element={<GestioneAccessi />} />} />
          <Route path="/qr-generator" element={<ProtectedRoute page="qr-generator" element={<QRCodeGenerator />} />} />
          <Route path="/bobine" element={<ProtectedRoute page="bobine" element={<BobinePLAGestionale />} />} />
          <Route path="/link" element={<ProtectedRoute page="link" element={<LinkGestionale />} />} />
          <Route path="/gestionale-web" element={<ProtectedRoute page="gestionale-web" element={<WebGestionale />} />} />
  


          <Route path="/qrgen" element={<QRgen />} />
          <Route path="/privacy" element={<Privacy/>} />
          <Route path="/termini" element={<Terms />} />
          <Route path="/cookie-policy" element={<Cookie />} />
         

          <Route path="/recoveremail" element={<RecoverEmail />} />
          <Route path="/web" element={<RichiestaSitoWeb />} />
          {/* ⬇️ Alias più chiaro per la pagina richieste */}
          <Route path="/richiesta-sito-web" element={<RichiestaSitoWeb />} />
          <Route path="/3d" element={<RichiestaStampa3D />} />


          <Route path="/account" element={<AccountPage />} />
          <Route path="/recoverpassword" element={<RecoverPassword />} />
          <Route path="/resetpassword" element={<ResetPassword />} />

          {/* ⬇️ NUOVE ROTTE di anteprima template */}
        </Routes>
          <CookieInfoBar policyUrl="/cookie-policy" />
        </> 
      )}
    </Router>
    
  );
};

export default App;
