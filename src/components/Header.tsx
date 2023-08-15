import logo_menu from "../assets/Logo_menu.png";
import logo from "../assets/logo.png";
import logo_carrello from "../assets/logo_carrello.jpg";
import classes from "./Header.module.css";
import { useState } from "react";
import SideBarMenu from "./SideBarMenu";
import {NavLink} from 'react-router-dom'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenuHandler = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={classes["header"]}>
      {/*HEADER*/}
      <div className={classes["header-section"]}>
        <button className={classes["menu-button"]} onClick={toggleMenu}>
          <img
            src={logo_menu}
            alt="logo_menu"
            className={classes["logo_menu"]}
          />
        </button>
        {isMenuOpen && <SideBarMenu closeMenu={closeMenuHandler} />}
      </div>
      <div className={classes["header-section"]}>
        <NavLink to="/">
        <img src={logo} alt="Logo" className={classes["Logo"]} />
        </NavLink>
      </div>
      <div className={classes["header-section"]}>
        <button className={classes["carrello-button"]}>
          <NavLink to="/carrello">
          <img
            src={logo_carrello}
            alt="Logo_Carrello"
            className={classes["Logo_Carrello"]}
          />
          </NavLink>
        </button>
      </div>
    </div>
  );
};

export default Header;
