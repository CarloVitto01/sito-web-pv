import React, { useState } from 'react';
import './PVsito.css';
import logo from './logo.png';
import logo_menu from './Logo_menu.png';
import logo_grafica from './Logo_grafica.jpg';
import Logo_macchina_fotografica from './Logo_macchina_fotografica.jpg';
import Logo_stampante from './Logo_stampante.jpg';
import Logo_video from './Logo_video.jpg';
import Logo_Whatsapp from './Logo_Whatsapp.png';
import Logo_Telegram from './Logo_Telegram.png';
import Logo_mail from './Logo_mail.png';
import Logo_Instagram from './Logo_Instagram.png';

function PVsito() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<number | null>(null); // Aggiunto il tipo number | null

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSubMenu = (index: number) => { // Aggiunto il tipo 'number' al parametro
    setActiveSubMenu(activeSubMenu === index ? null : index);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="sfondo">
      <div>


        <div className="header">{/*HEADER*/}
          <div className="header-section">
            <button className="menu-button" onClick={toggleMenu}>
              <img src={logo_menu} alt="logo_menu" className="logo_menu" />
            </button>
            {isMenuOpen && (
              <div className="sidebar-menu">
                <button className="close-menu-button" onClick={closeMenu}>
                  ✕
                </button>
                <ul className="menu-list">
                  <li><a href="#">Link 1</a></li>
                  <li><a href="#">Link 2</a></li>
                  <li>
                    <a href="#" onClick={() => toggleSubMenu(0)}>Link 3</a>
                    {activeSubMenu === 0 && (
                      <ul className="sub-menu-list">
                        <li><a href="#">Sublink 1</a></li>
                        <li><a href="#">Sublink 2</a></li>
                      </ul>
                    )}
                  </li>
                </ul>
              </div>
            )}
          </div>
          <div className="header-section">
            <img src={logo} alt="Logo" className="Logo" />
          </div>
          <div className="header-section"></div>
        </div>

        <div className="riquadroStudente">
          <div className="riquadroInternoStudente">
            <p className="textStudente">Se sei uno studente universitario hai il 10% di sconto!</p>
          </div>
        </div>


        <div className="containerRettangoli">
          <div className="rectangle">{/*GRAFICA*/}
            <div>
              <p className="titoloRiquadri">
                GRAFICA
              </p>
            </div>
            <div className="immagineRiquadri">
              <img src={logo_grafica} alt="logo_grafica" className="logoRiquadri" />
            </div>
            <div className="sottoTitoloRiquadro">
              <p className="sottoTitolo">
                Esprimi te stesso con stile.
              </p>
            </div>
            <div className="testoRiquadri">
              <p className="testo">
                Creiamo il tuo marchio unico: dall'arte dei <b>loghi personalizzati</b>, all'eleganza dei <b>biglietti da visita</b>, fino all'impatto delle <b>locandine</b> <br />su misura.
              </p>
            </div>
          </div>
          <div className="rectangle">{/*STAMPE*/}
            <div>
              <p className="titoloRiquadri">
                STAMPE
              </p>
            </div>
            <div className="immagineRiquadri">
              <img src={Logo_stampante} alt="logo_grafica" className="logoRiquadri" />
            </div>
            <div className="sottoTitoloRiquadro">
              <p className="sottoTitolo">
                Trasforma le tue idee <br />in realtà stampata.
              </p>
            </div>
            <div className="testoRiquadri">
              <p className="testo">
                Dai vita ai tuoi <b>documenti</b> e <b>foto</b> con qualità nitida. <br />Lascia un'impressione duratura con i nostri <b>biglietti da visita</b> su misura.
              </p>
            </div>
          </div>
          <div className="rectangle">{/*FOTO*/}
            <div>
              <p className="titoloRiquadri">
                FOTO
              </p>
            </div>
            <div className="immagineRiquadri">
              <img src={Logo_macchina_fotografica} alt="logo_grafica" className="logoRiquadri" />
            </div>
            <div className="sottoTitoloRiquadro">
              <p className="sottoTitolo">
                Impressione instantanea,<br /> stile duraturo.
              </p>
            </div>
            <div className="testoRiquadri">
              <p className="testo">
                Cattura il tuo lato migliore con <br />i nostri shooting per <b>fototessere</b><br /> o <b>foto ricordo</b>. Immagini perfette per un'identità unica.              </p>
            </div>
          </div>
          <div className="rectangle">{/*VIDEO*/}
            <div>
              <p className="titoloRiquadri">
                VIDEO
              </p>
            </div>
            <div className="immagineRiquadri">
              <img src={Logo_video} alt="logo_grafica" className="logoRiquadri" />
            </div>
            <div className="sottoTitoloRiquadro">
              <p className="sottoTitolo">
                Cattura l'emozione per sempre.
              </p>
            </div>
            <div className="testoRiquadri">
              <p className="testo">
                Preserva i tuoi momenti preziosi <br />in movimento. La magia dei ricordi prende vita nei nostri <b>video</b> fatti ad hoc.              </p>
            </div>
          </div>
        </div>
        <div className="footer">
          <div className="footer-section">
            <img src={Logo_mail} alt="Logo1" className="footer-logo" />
            <p className="footer-text">PV.PHOTOANDVISION@GMAIL.COM</p>
          </div>
          <div className="footer-section">
            <img src={Logo_Instagram} alt="Logo2" className="footer-logo" />
            <p className="footer-text">@PHOTOANDVISION</p>
          </div>
          <div className="footer-section">
            <img src={Logo_Telegram} alt="Logo3" className="footer-logo" />
            <img src={Logo_Whatsapp} alt="Logo3" className="footer-logo" />
            <p className="footer-text">CARLO: +39 389 285 7449</p>
          </div>
          <div className="footer-section">
            <img src={Logo_Telegram} alt="Logo4" className="footer-logo" />
            <img src={Logo_Whatsapp} alt="Logo4" className="footer-logo" />
            <p className="footer-text">ANDREA: +39 328 800 6210</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default PVsito;
