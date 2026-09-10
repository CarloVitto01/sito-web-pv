import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigationType,
  useLocation,
  Navigate,
} from "react-router-dom";

import "./App.css";
const Login = lazy(() => import("./components/Login/pages/Login"));
const Register = lazy(() => import("./components/Login/pages/Register"));
const AccountPage = lazy(() => import("./components/Login/pages/AccountPage"));
const RecoverPassword = lazy(() => import("./components/Login/pages/RecoverPassword"));
const ResetPassword = lazy(() => import("./components/Login/pages/ResetPassword"));
const RecoverEmail = lazy(() => import("./components/Login/pages/RecoverEmail"));
const Privacy = lazy(() => import("./components/Privacy/Privacy"));
const Cookie = lazy(() => import("./components/Privacy/Cookie"));
const Terms = lazy(() => import("./components/Privacy/Terms"));
import CookieInfoBar from "./components/Privacy/CookieInfoBar";
const PdfPrintPage = lazy(() => import("./components/StampaPdf/PdfPrintPage"));
const A4Gestionale = lazy(() => import("./gestionale/GestionaleA4/A4Gestionale"));
const A3Gestionale = lazy(() => import("./gestionale/GestionaleA3/A3Gestionale"));
const UtentiGestionale = lazy(() => import("./gestionale/GestionaleUtenti/UtentiGestionale"));
const StoricoDati = lazy(() => import("./gestionale/GestionaleDati/StoricoDati"));
const GestioneAccessi = lazy(() => import("./gestionale/GestionaleAccessi/GestioneAccessi"));
const QRCodeGenerator = lazy(() => import("./gestionale/GestionaleQR/QRCodeGenerator"));
const TasseGestionale = lazy(() => import("./gestionale/GestionaleTasse/TasseGestionale"));
const BannerGestionale = lazy(() => import("./gestionale/GestionaleBanner/BannerGestionale"));
const ConsegneGestionale = lazy(() => import("./gestionale/GestionaleConsegne/ConsegneGestionale"));
const ScontiGestionale = lazy(() => import("./gestionale/GestioneFestivita/ScontiGestionale"));

import { auth, refreshCurrentUser } from "./backend/auth";
const PlasticheGestionale = lazy(() => import("./gestionale/GestionalePlastiche/PlasticheGestionale"));


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
      if (!auth.currentUser) {
        setCanAccess(false);
        return;
      }

      // ricarica il profilo dal server: i permessi del ruolo potrebbero essere cambiati da un admin
      // dopo l'ultimo login, e la verifica va comunque rifatta lato server ad ogni navigazione protetta.
      const fresh = await refreshCurrentUser();
      setCanAccess(!!fresh?.pageAccess.includes(page));
    };

    check();
  }, [page]);

  if (canAccess === null) return <div>Controllo accessi...</div>;
  return canAccess ? element : <Navigate to="/" replace />;
};


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
        <Suspense fallback={<div role="status">Caricamento...</div>}>
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
          <Route path="/tasse" element={<ProtectedRoute page="tasse" element={<TasseGestionale />} />} />
          <Route path="/plastiche" element={<ProtectedRoute page="plastiche" element={<PlasticheGestionale />} />} />
          <Route path="/banner" element={<ProtectedRoute page="banner" element={<BannerGestionale />} />} />
          <Route path="/consegna" element={<ProtectedRoute page="consegna" element={<ConsegneGestionale />} />} />
          <Route path="/sconti" element={<ProtectedRoute page="sconti" element={<ScontiGestionale />} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </PageBackground>

      {/* Footer FUORI dal wrapper */}
      {/* <Footer /> */}

      <CookieInfoBar policyUrl="/cookie-policy" />
    </Router>
  );
};

export default App;
