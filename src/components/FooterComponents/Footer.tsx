import React from "react";
import { Link } from "react-router-dom";
import Logo_Whatsapp from "../../assets/images/Logo_Whatsapp.png";
import Logo_Telegram from "../../assets/images/Logo_Telegram.png";
import Logo_mail from "../../assets/images/Logo_mail.png";
import Logo_Instagram from "../../assets/images/Logo_Instagram.png";
import classes from "./Footer.module.css";
import { motion } from "framer-motion";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <motion.footer
      className={classes["footer"]}
      role="contentinfo"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className={classes["title-Footer"]}>
        <h2>Per maggiori informazioni contattaci:</h2>
      </div>

      <div className={classes["container-info"]}>
        {/* Email */}
        <div className={classes["section"]}>
          <a
            href="mailto:pv.photoandvision@gmail.com"
            className={classes.contactLink}
            aria-label="Invia una email a Photo and Vision"
          >
            <img src={Logo_mail} alt="Email" className={classes["footer-logo"]} />
            <p className={classes["footer-text"]}>pv.photoandvision@gmail.com</p>
          </a>
        </div>

        {/* Instagram */}
        <div className={classes["section"]}>
          <a
            href="https://instagram.com/photoandvision"
            target="_blank"
            rel="noopener noreferrer"
            className={classes.contactLink}
            aria-label="Profilo Instagram Photo and Vision"
          >
            <img src={Logo_Instagram} alt="Instagram" className={classes["footer-logo"]} />
            <p className={classes["footer-text"]}>@photoandvision</p>
          </a>
        </div>

        {/* Telegram + WhatsApp + telefono */}
        <div className={classes["section"]}>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            className={classes.iconOnly}
            aria-label="Apri Telegram"
            title="Telegram"
          >
            <img src={Logo_Telegram} alt="Telegram" className={classes["footer-logo"]} />
          </a>

          <a
            href="https://wa.me/393791780539"
            target="_blank"
            rel="noopener noreferrer"
            className={classes.iconOnly}
            aria-label="Chatta su WhatsApp"
            title="WhatsApp"
          >
            <img src={Logo_Whatsapp} alt="WhatsApp" className={classes["footer-logo"]} />
          </a>

          <a
            href="tel:+393791780539"
            className={`${classes.contactLink} ${classes.inlineTel}`}
            aria-label="Chiama il numero +39 379 178 0539"
          >
            <p className={classes["footer-text"]}>Cellulare: +39&nbsp;379&nbsp;178&nbsp;0539</p>
          </a>
        </div>
      </div>

      {/* Riga legale */}
      <nav className={classes.legalRow} aria-label="Link legali">
        <Link to="/privacy" className={classes.legalLink}>Privacy</Link>
        <span className={classes.dot}>•</span>
        <Link to="/cookie-policy" className={classes.legalLink}>Cookie</Link>
        <span className={classes.dot}>•</span>
        <Link to="/termini" className={classes.legalLink}>Termini</Link>

        {/* >>> Aggiunta Partita IVA <<< */}
        <span className={classes.dot}>•</span>
        <span className={classes.piva} aria-label="Partita IVA">P. IVA 05433670758</span>

        <span className={classes.copy}>© {year} Photo &amp; Vision</span>
      </nav>
    </motion.footer>
  );
};

export default React.memo(Footer);
