import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import logo from "../assets/images/Firma_Bianca_oro_PV.png";
import classes from "./Header.module.css";

const Header: React.FC = () => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  const goHome = () => {
    navigate("/");
  };

  return (
    <div className={classes.header}>
      {/* Pulsante Home sulla sinistra, nascosto su “/” */}
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

      {/* Logo centrale */}
      <div className={classes["logo-section"]}>
        <Link to="/">
          <img src={logo} alt="Logo" className={classes.Logo} />
        </Link>
      </div>

      {/* Sezione di destra (placeholder, eventualmente menu laterale) */}
      <div className={classes["placeholder-section"]}>
        {/* Qui puoi riattivare il tuo menu con FiMenu e side-menu */}
      </div>
    </div>
  );
};

export default React.memo(Header);
