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
import logo_carrello from './logo_carrello.jpg';
import Freccetta_Nera from './Freccetta_Nera.png';

function PVsito() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<number | null>(null); // Aggiunto il tipo number | null

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleSubMenu = (index: number) => {
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
                  <li><a href="#">Home page</a></li>
                  <li>
                  <a href="#" onClick={() => toggleSubMenu(0)}>
                      <img src={Freccetta_Nera} alt="" className={`frecciaNeraRotante ${activeSubMenu === 0 ? 'rotated' : ''}`} />
                      <span className="fontScritteTitoliMenu">Grafiche</span>
                    </a>
                    {activeSubMenu === 0 && (
                      <ul className="sub-menu-list">
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Crea il tuo logo</text></a></li>
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Biglietti da visita</text></a></li>
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">La tua locandina</text></a></li>
                      </ul>
                    )}
                  </li>
                  <li>
                    <a href="#" onClick={() => toggleSubMenu(1)}>
                      <img src={Freccetta_Nera} alt="" className={`frecciaNeraRotante ${activeSubMenu === 1 ? 'rotated' : ''}`} />
                      <span className="fontScritteTitoliMenu">Stampe</span>
                    </a>
                    {activeSubMenu === 1 && (
                      <ul className="sub-menu-list">
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Stampa il tuo documento</text></a></li>
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Stampa le tue foto</text></a></li>
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Stampa i tuoi biglietti da visita</text></a></li>
                      </ul>
                    )}
                  </li>
                  <li>
                  <a href="#" onClick={() => toggleSubMenu(2)}>
                      <img src={Freccetta_Nera} alt="" className={`frecciaNeraRotante ${activeSubMenu === 2 ? 'rotated' : ''}`} />
                      <span className="fontScritteTitoliMenu">Foto</span>
                    </a>
                    {activeSubMenu === 2 && (
                      <ul className="sub-menu-list">
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Fototessere</text></a></li>
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Foto ricordo</text></a></li>
                      </ul>
                    )}
                  </li>
                  <li>
                  <a href="#" onClick={() => toggleSubMenu(3)}>
                      <img src={Freccetta_Nera} alt="" className={`frecciaNeraRotante ${activeSubMenu === 3 ? 'rotated' : ''}`} />
                      <span className="fontScritteTitoliMenu">Video</span>
                    </a>
                    {activeSubMenu === 3 && (
                      <ul className="sub-menu-list">
                        <li><a href="#"><img src={Freccetta_Nera} alt="" className="frecciaNera" /> <text className="fontScritteSottoMenu">Realizza il tuo video</text></a></li>
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
          <div className="header-section header-section-right">
            <img src={logo_carrello} alt="Logo_Carrello" className="Logo_Carrello" />
          </div>
        </div>
        <div className="riquadroStudente">{/*RIQUADRO STUDENTE SULLO SCONTO DEL 10%*/}
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
        <div className="chiSiamoRiquadro">
          <div className="chiSiamoTitolo">
            Chi siamo?
          </div>
          <div className="chiSiamoDescrizione">
            Benvenuto in Photo and Vision, un'azienda formata da due ragazzi che hanno unito le loro passioni per dare vita a un'esperienza unica
            nel campo della grafica, stampe, foto e video.<br />
            Fondata da Carlo e Andrea, la nostra azienda è nata dalla voglia di trasformare le idee in realtà visive straordinarie.<br />
            La nostra missione è semplice ma ambiziosa: soddisfare appieno le esigenze dei nostri clienti attraverso soluzioni visive personalizzate e di alta qualità.<br />
            <br />
            Sappiamo quanto sia importante per te comunicare il tuo messaggio in modo efficace e memorabile, ed è proprio qui che entriamo in gioco.<br />
            Con anni di esperienza combinata nel settore della grafica e della produzione multimediale, siamo pronti ad affrontare qualsiasi sfida tu possa presentarci.<br />
            Creiamo progetti che non solo rispondono alle tue esigenze, ma che anche catturano l'essenza della tua identità o del tuo marchio.<br />
            Che tu stia cercando un logo distintivo, materiale promozionale accattivante o un video coinvolgente, il nostro team lavora in sinergia con te
            per comprendere appieno le tue idee e trasformarle in opere d'arte visive che supereranno le tue aspettative.<br />
            <br />
            La qualità è al centro di tutto ciò che facciamo. Utilizziamo le ultime tecnologie e software di design per garantire che ogni dettaglio sia impeccabile.<br />
            Dalla progettazione all'esecuzione, lavoriamo con dedizione per offrirti risultati che parlano da soli.<br />
            <br />
            E se c'è una cosa che ci spinge costantemente avanti, è il sorriso soddisfatto dei nostri clienti quando vedono il loro progetto prendere vita.<br />
            Non si tratta solo di servizi, ma di relazioni. Vogliamo costruire connessioni durature con i nostri clienti, diventando i tuoi partner creativi di fiducia.<br />
            La tua visione è la nostra priorità e lavoriamo instancabilmente per garantire che sia realizzata con cura e precisione.<br />
            <br />
            Unisciti a noi in questo viaggio creativo. Photo and Vision è qui per trasformare le tue idee in capolavori visivi, superando le aspettative e
            creando risultati che durano nel tempo. Siamo pronti a mettere il nostro talento al tuo servizio e a realizzare insieme qualcosa di straordinario.<br />
          </div>
        </div>
        <div className="footer">{/*FOOTER*/}
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
