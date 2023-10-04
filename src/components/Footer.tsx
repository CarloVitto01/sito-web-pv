import Logo_Whatsapp from "../assets/images/Logo_Whatsapp.png";
import Logo_Telegram from "../assets/images/Logo_Telegram.png";
import Logo_mail from "../assets/images/Logo_mail.png";
import Logo_Instagram from "../assets/images/Logo_Instagram.png";
import classes from "./Footer.module.css";
import React from "react";

const Footer = () => {
  return (
    <div className={classes["footer"]}>
      <div className={classes["title-Footer"]}>
        <h2>Per maggiori informazioni contattaci:</h2>
      </div>
      <div className={classes["container-info"]}>
        <div className={classes["section"]}>
          <img src={Logo_mail} alt="Logo1" className={classes["footer-logo"]} />
          <p className={classes["footer-text"]}>PV.PHOTOANDVISION@GMAIL.COM</p>
        </div>
        <div className={classes["section"]}>
          <img
            src={Logo_Instagram}
            alt="Logo2"
            className={classes["footer-logo"]}
          />
          <p className={classes["footer-text"]}>@PHOTOANDVISION</p>
        </div>
        <div className={classes["section"]}>
          <img
            src={Logo_Telegram}
            alt="Logo3"
            className={classes["footer-logo"]}
          />
          <img
            src={Logo_Whatsapp}
            alt="Logo3"
            className={classes["footer-logo"]}
          />
          <p className={classes["footer-text"]}>CELLULARE: +39 379 178 0539</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Footer);
