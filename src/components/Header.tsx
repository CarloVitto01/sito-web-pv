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
      {/* Pulsante Home */}
      <div className={classes["menu-section"]}>
        {location.pathname !== "/" && (
          <button
            className={classes["menu-button-home"]}
            onClick={goHome}
            aria-label="Torna alla Home"
          >
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

      {/* Login / Logout */}
      <div className={classes["placeholder-section"]}>
        {user ? (
          <>
            <span className={classes["user-name"]}>{displayName}</span>
            <button
              onClick={() => {
                signOut(auth).then(() => {
                  setUser(null);
                  setDisplayName("");
                  window.location.href = "/"; // 🔁 Reload forzato alla root per mostrare di nuovo lo SplashScreen
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
    </div>
  );
};

export default React.memo(Header);
