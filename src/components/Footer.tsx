import Logo_Whatsapp from '../assets/Logo_Whatsapp.png';
import Logo_Telegram from '../assets/Logo_Telegram.png';
import Logo_mail from '../assets/Logo_mail.png';
import Logo_Instagram from '../assets/Logo_Instagram.png';
import classes from './Footer.module.css'

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
          <img src={Logo_Instagram} alt="Logo2" className={classes["footer-logo"]} />
          <p className={classes["footer-text"]}>@PHOTOANDVISION</p>
        </div>
        <div className={classes["section"]}>
          <img src={Logo_Telegram} alt="Logo3" className={classes["footer-logo"]} />
          <img src={Logo_Whatsapp} alt="Logo3" className={classes["footer-logo"]} />
          <p className={classes["footer-text"]}>CARLO: +39 389 285 7449</p>
        </div>
        <div className={classes["section"]}>
          <img src={Logo_Telegram} alt="Logo4" className={classes["footer-logo"]} />
          <img src={Logo_Whatsapp} alt="Logo4" className={classes["footer-logo"]} />
          <p className={classes["footer-text"]}>ANDREA: +39 328 800 6210</p>
        </div>
      </div>
    </div>
  );
};

export default Footer;
