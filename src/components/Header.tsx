import logo from "../assets/images/logo.png";
import classes from "./Header.module.css";
import React from "react";
import { Link } from "react-router-dom"; // Importa Link

const Header = () => {
  return (
    <div className={classes["header"]}>
      <div className={classes["header-section"]}>
        <Link to="/"> {/* Aggiungi il Link qui */}
          <img src={logo} alt="Logo" className={classes["Logo"]} />
        </Link>
      </div>
    </div>
  );
};

export default React.memo(Header);