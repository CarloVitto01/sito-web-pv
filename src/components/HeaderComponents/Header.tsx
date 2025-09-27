import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import logo from "../../assets/images/Firma_Bianca_oro_PV.png";
import classes from "./Header.module.css";
import { auth, db } from "../../backend/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Header: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [accessiblePages, setAccessiblePages] = useState<string[]>([]);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleSideMenu = () => setSideMenuOpen((prev) => !prev);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setDisplayName(data.displayName || "");

          const ruolo = data.ruolo || "PublicUser";
          const accessSnap = await getDoc(doc(db, "ruoliPagineAccesso", ruolo));
          const accessData = accessSnap.data();
          setAccessiblePages(accessData?.accessoPagine || []);
        }
      } else {
        setDisplayName("");
        setAccessiblePages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sideMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSideMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sideMenuOpen]);


  const linkAccessibili = [
    { path: "/gestionaleA4", label: "Gestionale A4" },
    { path: "/gestionaleA3", label: "Gestionale A3" },
    { path: "/foto-video-gestionale", label: "Foto & Video Gestionale" },
    { path: "/utentiGestionale", label: "Gestione Utenti" },
    { path: "/gestione-accessi", label: "Gestione Accessi Ruoli" },
    { path: "/storicoDati", label: "Storico Dati" },
    { path: "/qr-generator", label: "QR Gestionale" },
    { path: "/bobine", label: "Bobine Gestionale" },

  ];

  return (
    <div className={classes.header}>
      <div className={classes["burger-section"]}>
        <FiMenu className={classes["burger-icon"]} onClick={toggleSideMenu} aria-label="Apri menu" />
      </div>

      <div className={classes["left-spacer"]} /> {/* 👈 colonna sinistra vuota */}

      <div className={classes["logo-section"]}>
        <Link to="/">
          <img src={logo} alt="Logo" className={classes.Logo} />
        </Link>
      </div>

      <div className={classes["placeholder-section"]}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className={classes["menu-button-gold"]}
              onClick={() => {
                signOut(auth).then(() => {
                  setUser(null);
                  setDisplayName("");
                  navigate("/");
                });
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className={classes["menu-button-gold"]}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        )}

      </div>

      {sideMenuOpen && (
        <div ref={menuRef} className={classes["side-menu"]}>
          <button onClick={toggleSideMenu} className={classes["close-button"]}>✕</button>
          <nav className={classes["side-nav"]}>
            {user && (
              <div className={classes["welcome-user"]}>
                👋 Benvenuto/a, <strong>{displayName}</strong>
              </div>
            )}

            <ul>
              {location.pathname !== "/" && (
                <li>
                  <Link to="/" onClick={toggleSideMenu} className={classes["link-menu"]}>
                    Torna Alla Home
                  </Link>
                </li>
              )}

              <li>
                <Link to="/richiesta-sito-web" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  🖥️ Sviluppo Siti Web
                </Link>
              </li>

              <li>
                <Link to="/printA4" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  🖨️ Stampa in A4
                </Link>
              </li>
              <li>
                <Link to="/printA3" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  🖨️ Stampa in A3
                </Link>
              </li>

              <li>
                <Link to="/3d" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  🖨️ Stampa 3D
                </Link>
              </li>

              <li>
                <Link to="/qrgen" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  📱 Generatore di QR Code
                </Link>
              </li>

              <li>
                <Link to="/contatti-servizi-foto-video" onClick={toggleSideMenu} className={classes["link-menu"]}>
                  📸 Contatti Servizi Foto/Video
                </Link>
              </li>



              {linkAccessibili
                .filter(({ path }) => accessiblePages.includes(path.replace("/", "")))
                .map(({ path, label }) => (
                  <li key={path}>
                    <Link to={path} onClick={toggleSideMenu} className={classes["link-menu"]}>
                      {label}
                    </Link>
                  </li>
                ))}
            </ul>

            {user ? (
              <>
                <button
                  onClick={() => {
                    toggleSideMenu();
                    navigate("/account");
                  }}
                  className={classes["account-button"]}
                >
                  👤 Il mio Account
                </button>

                <button
                  onClick={() => {
                    signOut(auth).then(() => {
                      setUser(null);
                      setDisplayName("");
                      window.location.href = "/";
                    });
                  }}
                  className={classes["logout-button"]}
                >
                  Esci
                </button>
              </>
            ) : (
              <div className={classes["auth-links"]}>
                <button onClick={() => { toggleSideMenu(); navigate("/login"); }}>
                  Accedi
                </button>
                <span style={{ color: "white" }}>/</span>
                <button onClick={() => { toggleSideMenu(); navigate("/register"); }}>
                  Registrati
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
};

export default React.memo(Header);
