import logo from "../assets/images/logo.png";
import classes from "./Header.module.css";
import React from "react";
import { Link } from "react-router-dom";
import { useState } from 'react';
import { FiMenu } from "react-icons/fi";

const Header = () => {

  const [isMenuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    <div className={classes["header"]}>
      <div className={classes["menu-section"]}>
        <button className={classes["menu-button-home"]} onClick={toggleMenu}>
          <FiMenu />
        </button>
        <nav className={`${classes["side-menu"]} ${!isMenuOpen ? classes["hidden"] : ""}`}>
            <button className={classes["close-button"]} onClick={toggleMenu}>✖</button>
            <ul>
              <Link to="/" className={classes['link-menu']}><li>Home</li></Link>
              <Link to="/printA4" className={classes['link-menu']}><li>Print A4</li></Link>
              <Link to="/printA3" className={classes['link-menu']}><li>Print A3</li></Link>
            </ul>
          </nav>
      </div>
      <div className={classes["logo-section"]}>
        <Link to="/">
          <img src={logo} alt="Logo" className={classes["Logo"]} />
        </Link>
      </div>
      <div className={classes["placeholder-section"]}></div>
    </div>
  );
};

export default React.memo(Header);
