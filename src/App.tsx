import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigationType,
  useLocation,
  Navigate,
} from "react-router-dom";

import "./App.css";

import Login from "./components/Login/pages/Login";
import Register from "./components/Login/pages/Register";
import AccountPage from "./components/Login/pages/AccountPage";
import RecoverPassword from "./components/Login/pages/RecoverPassword";
import ResetPassword from "./components/Login/pages/ResetPassword";
import RecoverEmail from "./components/Login/pages/RecoverEmail";

import Privacy from "./components/Privacy/Privacy";
import Cookie from "./components/Privacy/Cookie";
import Terms from "./components/Privacy/Terms";
import CookieInfoBar from "./components/Privacy/CookieInfoBar";

import RichiestaStampa3D from "./components/3D/RichiestaStampa3D";
import PdfPrintPage from "./components/StampaPdf/PdfPrintPage";

import A4Gestionale from "./gestionale/GestionaleA4/A4Gestionale";
import A3Gestionale from "./gestionale/GestionaleA3/A3Gestionale";
import UtentiGestionale from "./gestionale/GestionaleUtenti/UtentiGestionale";
import StoricoDati from "./gestionale/GestionaleDati/StoricoDati";
import GestioneAccessi from "./gestionale/GestionaleAccessi/GestioneAccessi";
import QRCodeGenerator from "./gestionale/GestionaleQR/QRCodeGenerator";
import BobinePLAGestionale from "./gestionale/GestionaleBobine/BobineGestionale";
import TasseGestionale from "./gestionale/GestionaleTasse/TasseGestionale";
import BannerGestionale from "./gestionale/GestionaleBanner/BannerGestionale";
import ConsegneGestionale from "./gestionale/GestionaleConsegne/ConsegneGestionale";
import ScontiGestionale from "./gestionale/GestioneFestivita/ScontiGestionale";

import { auth, db } from "./backend/firebase";
import { getDoc, doc } from "firebase/firestore";

// Se hai già un Header/Footer globali, importali qui.
// import Header from "./components/Header/Header";
// import Footer from "./components/Footer/Footer";

const ScrollToTop: React.FC = () => {
  const navigationType = useNavigationType();
  const location = useLocation();

  useEffect(() => {
    if (navigationType === "POP") window.scrollTo(0, 0);
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

/**
 * Wrapper che applica lo sfondo SOLO al contenuto.
 * Header/Footer devono stare FUORI da questo wrapper.
 */
const PageBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="pageBg">
      <div className="pageContent">{children}</div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />

      {/* Header FUORI dal wrapper (così non ha pattern sotto) */}
      {/* <Header /> */}

      <PageBackground>
        <Routes>
          <Route path="/" element={<PdfPrintPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/recoveremail" element={<RecoverEmail />} />
          <Route path="/recoverpassword" element={<RecoverPassword />} />
          <Route path="/resetpassword" element={<ResetPassword />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<Cookie />} />
          <Route path="/termini" element={<Terms />} />

          <Route path="/3d" element={<RichiestaStampa3D />} />

          <Route
            path="/gestionaleA4"
            element={<ProtectedRoute page="gestionaleA4" element={<A4Gestionale />} />}
          />
          <Route
            path="/gestionaleA3"
            element={<ProtectedRoute page="gestionaleA3" element={<A3Gestionale />} />}
          />
          <Route
            path="/utentiGestionale"
            element={<ProtectedRoute page="utentiGestionale" element={<UtentiGestionale />} />}
          />
          <Route
            path="/storicoDati"
            element={<ProtectedRoute page="storicoDati" element={<StoricoDati />} />}
          />
          <Route
            path="/gestione-accessi"
            element={<ProtectedRoute page="gestione-accessi" element={<GestioneAccessi />} />}
          />
          <Route
            path="/qr-generator"
            element={<ProtectedRoute page="qr-generator" element={<QRCodeGenerator />} />}
          />
          <Route path="/bobine" element={<ProtectedRoute page="bobine" element={<BobinePLAGestionale />} />} />
          <Route path="/tasse" element={<ProtectedRoute page="tasse" element={<TasseGestionale />} />} />
          <Route path="/banner" element={<ProtectedRoute page="banner" element={<BannerGestionale />} />} />
          <Route path="/consegna" element={<ProtectedRoute page="consegna" element={<ConsegneGestionale />} />} />
          <Route path="/sconti" element={<ProtectedRoute page="sconti" element={<ScontiGestionale />} />} />
        </Routes>
      </PageBackground>

      {/* Footer FUORI dal wrapper */}
      {/* <Footer /> */}

      <CookieInfoBar policyUrl="/cookie-policy" />
    </Router>
  );
};

export default App;
