import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import logo from "../assets/images/Firma_Bianca_oro_PV.png";
import classes from "./Header.module.css";
import { auth, db } from "../backend/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Header: React.FC = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");

  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const toggleSideMenu = () => setSideMenuOpen((prev) => !prev);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setDisplayName(data.displayName);
        }
      } else {
        setDisplayName("");
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleMenu = () => setMenuOpen(!isMenuOpen);
  const goHome = () => navigate("/");

  return (
    <div className={classes.header}>
      {/* Menu burger solo mobile */}
      <div className={classes["burger-section"]}>
        <FiMenu
          className={classes["burger-icon"]}
          onClick={toggleSideMenu}
          aria-label="Apri menu"
        />
      </div>

      {/* Pulsante Home desktop */}
      <div className={classes["menu-section"]}>
        {location.pathname !== "/" && (
          <button className={classes["menu-button-home"]} onClick={goHome}>
            HOME
          </button>
        )}
      </div>

      {/* Logo */}
      <div className={classes["logo-section"]}>
        <Link to="/">
          <img src={logo} alt="Logo" className={classes.Logo} />
        </Link>
      </div>

      {/* Login / Logout solo desktop */}
      <div className={classes["placeholder-section"]}>
        {user ? (
          <>
            <span className={classes["user-name"]}>{displayName}</span>
            <button
              onClick={() => {
                signOut(auth).then(() => {
                  setUser(null);
                  setDisplayName("");
                  window.location.href = "/";
                });
              }}
              className={classes["menu-button-gold"]}
            >
              Esci
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className={classes["menu-button-gold"]}
          >
            Accedi
          </button>
        )}
      </div>

      {/* Side Menu Mobile */}
      {sideMenuOpen && (
        <div className={classes["side-menu"]}>
          <button onClick={toggleSideMenu} className={classes["close-button"]}>✕</button>
          <nav className={classes["side-nav"]}>
            {/* Benvenuto utente */}
            {user && (
              <div className={classes["welcome-user"]}>
                👋 Benvenuto, <strong>{displayName}</strong>
              </div>
            )}

            {/* Collegamenti principali */}
            <ul>
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
            </ul>

            {/* Login / Logout o Registrazione */}
            {user ? (
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
            ) : (
              <div className={classes["auth-links"]}>
                <button onClick={() => {
                  toggleSideMenu();
                  navigate("/login");
                }}>
                  Accedi
                </button>
                <span style={{color:"white"}}>/</span>
                <button onClick={() => {
                  toggleSideMenu();
                  navigate("/register");
                }}>
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
