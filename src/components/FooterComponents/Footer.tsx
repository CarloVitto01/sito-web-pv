import React from "react";
import Logo_Whatsapp from "../../assets/images/Logo_Whatsapp.png";
import Logo_Telegram from "../../assets/images/Logo_Telegram.png";
import Logo_mail from "../../assets/images/Logo_mail.png";
import Logo_Instagram from "../../assets/images/Logo_Instagram.png";
import classes from "./Footer.module.css";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <motion.div
      className={classes["footer"]}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className={classes["title-Footer"]}>
        <h2>Per maggiori informazioni contattaci:</h2>
      </div>
      <div className={classes["container-info"]}>
        <div className={classes["section"]}>
          <img src={Logo_mail} alt="Logo mail" className={classes["footer-logo"]} />
          <p className={classes["footer-text"]}>PV.PHOTOANDVISION@GMAIL.COM</p>
        </div>
        <div className={classes["section"]}>
          <img
            src={Logo_Instagram}
            alt="Logo Instagram"
            className={classes["footer-logo"]}
          />
          <p className={classes["footer-text"]}>@PHOTOANDVISION</p>
        </div>
        <div className={classes["section"]}>
          <img
            src={Logo_Telegram}
            alt="Logo Telegram"
            className={classes["footer-logo"]}
          />
          <img
            src={Logo_Whatsapp}
            alt="Logo Whatsapp"
            className={classes["footer-logo"]}
          />
          <p className={classes["footer-text"]}>CELLULARE: +39 379 178 0539</p>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(Footer);
