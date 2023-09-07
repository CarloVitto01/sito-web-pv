import logo from "../assets/logo.png";
import classes from "./Header.module.css";
import React from "react";

const Header = () => {

  return (
    <div className={classes["header"]}>
      <div className={classes["header-section"]}>
        <img src={logo} alt="Logo" className={classes["Logo"]} />
      </div>
    </div>
  );
};

export default React.memo(Header);
