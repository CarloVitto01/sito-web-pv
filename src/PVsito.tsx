import React, { useState } from 'react';
import './PVsito.css';
import logo from './logo.png';
import rotateIcon from './Freccetta.png'; // Immagine per l'icona ruotante

function PVsito() {
  // Stati per gestire la visibilità dei riquadri e la rotazione delle icone
  const [riquadriAperti, setRiquadriAperti] = useState([false, false, false, false]);
  const [copertinaPDF, setCopertinaPDF] = useState<string | null>(null); // Modifica il tipo di dato

  // Funzione per aprire o chiudere il riquadro e ruotare l'icona
  const toggleRiquadro = (index: number) => {
    setRiquadriAperti((prevRiquadriAperti) => {
      const newRiquadriAperti = [...prevRiquadriAperti];
      newRiquadriAperti[index] = !newRiquadriAperti[index];
      return newRiquadriAperti;
    });
  };

  // Funzione per gestire il caricamento del file PDF
  const handleCaricaPDF = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; // Utilizza il safe navigation operator per accedere a event.target.files
    if (file) {
      // Leggi l'immagine della copertina del PDF utilizzando URL.createObjectURL
      const copertina = URL.createObjectURL(file);
      setCopertinaPDF(copertina);
    }
  };

  // Stato per gestire la visibilità dell'intervallo personalizzato
  const [showIntervalloPersonalizzato, setShowIntervalloPersonalizzato] = useState(false);

  // Funzione per gestire il cambiamento della scelta dell'intervallo
  const handleSceltaIntervalloChange = (event: { target: { value: string; }; }) => {
    setShowIntervalloPersonalizzato(event.target.value === "opzione2");
  };

  return (
    <div className="sfondo">
      <div>
        <div className="header">
          <div className="header-section">
            <p className="dettagliScritte">GRAFICA</p>
          </div>
          <div className="header-section">
            <p className="dettagliScritte">STAMPE</p>
          </div>
          <div className="header-section">
            <img src={logo} alt="Logo" className='Logo' />
          </div>
          <div className="header-section">
            <p className="dettagliScritte">FOTO</p>
          </div>
          <div className="header-section">
            <p className="dettagliScritte">VIDEO</p>
          </div>
        </div>
        <div className="container">
          <div className="col">
          </div>
          <div className="col central">
            <div className="containerDiv">
              <div className="box1">
                <div style={{ padding: "2.5px" }}>
                  <img
                    src={rotateIcon}
                    alt="Rotate Icon"
                    className={riquadriAperti[0] ? "rotate-icon rotate-icon-ruotata" : "rotate-icon"}
                    onClick={() => toggleRiquadro(0)}
                  />
                  <span className="scrittaIcona">CHI SIAMO?</span>
                </div>
                {riquadriAperti[0] && (
                  <div className="riquadro">
                    numeri e descrizioni varie
                  </div>
                )}
              </div>
              <div className="box2">
                <div style={{ padding: "2.5px" }}>
                  <img
                    src={rotateIcon}
                    alt="Rotate Icon"
                    className={riquadriAperti[1] ? "rotate-icon rotate-icon-ruotata" : "rotate-icon"}
                    onClick={() => toggleRiquadro(1)}
                  />
                  <text className="scrittaIcona">STAMPA IL TUO PDF</text>
                </div>
                {riquadriAperti[1] && (
                  <div className="riquadro">
                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima colonna */}
                      </div>
                      <div className="colonna">
                        <div className="inputRowDivS">
                          <label htmlFor="nome">Nome:</label>
                          <input type="text" id="nome" name="nome" />
                        </div>
                      </div>
                      <div className="colonna">
                        <div className="inputRowDivD">
                          <label htmlFor="cognome">Cognome:</label>
                          <input type="text" id="cognome" name="cognome" />
                        </div>
                      </div>

                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>
                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima
                         colonna */}
                      </div>
                      <div className="colonna">
                        <div className="inputRowDivS">
                          <label htmlFor="email">Email:</label>
                          <input type="email" id="email" name="email" />
                        </div>
                      </div>
                      <div className="colonna">
                        <div className="inputRowDivD">
                          <label htmlFor="cellulare">Cellulare:</label>
                          <input type="tel" id="cellulare" name="cellulare" />
                        </div>
                      </div>
                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>
                    <div className='PdfRiquadro'>
                      <p className="richiestaPDF testoPiccolo">Carica il tuo PDF:</p>
                      <div className="uploadRiquadro">
                        <input type="file" id="pdf" name="pdf" onChange={handleCaricaPDF} />
                        {copertinaPDF && (
                          <div className="copertinaPDFContainer">
                            <img src={copertinaPDF} alt="Copertina PDF" className="copertinaPDF" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima colonna */}
                      </div>
                      <div className="inputRowDivS">
                        <div className="colonna">
                          <p className="testoPiccolo">Dimensione:</p>
                          <div className="opzioni">
                            <div className="opzione">
                              <input type="radio" name="sceltaDimensione" value="opzione1" id="opzione1SDimensione" />
                              <label htmlFor="opzione1SDimensione">
                                <span className="pallino"></span>
                                A4
                              </label>
                            </div>
                            <div className="opzione">
                              <input type="radio" name="sceltaDimensione" value="opzione2" id="opzione2SDimensione" />
                              <label htmlFor="opzione2SDimensione">
                                <span className="pallino"></span>
                                A3
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="colonna">
                        <div className="inputRowDivD">
                          <p className="testoPiccolo">Colore:</p>
                          <div className="opzioni">
                            <div className="opzione">
                              <input type="radio" name="sceltaColore" value="opzione1" id="opzione1DColore" />
                              <label htmlFor="opzione1DColore">
                                <span className="pallino"></span>
                                Colore
                              </label>
                            </div>
                            <div className="opzione">
                              <input type="radio" name="sceltaColore" value="opzione2" id="opzione2DColore" />
                              <label htmlFor="opzione2DColore">
                                <span className="pallino"></span>
                                Bianco e nero
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>

                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima colonna */}
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Layout:</p>
                        <div className="opzioni">
                          <div className="opzione">
                            <input type="radio" name="sceltaLayout" value="opzione1" id="opzione1SLayout" />
                            <label htmlFor="opzione1SLayout">
                              <span className="pallino"></span>
                              Verticale
                            </label>
                          </div>
                          <div className="opzione">
                            <input type="radio" name="sceltaLayout" value="opzione2" id="opzione2SLayout" />
                            <label htmlFor="opzione2SLayout">
                              <span className="pallino"></span>
                              Orizzontale
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Imposta Formato:</p>
                        <div className="opzioni">
                          <div className="opzione">
                            <input type="radio" name="sceltaFormato" value="opzione1" id="opzione1DImpostaFormato" />
                            <label htmlFor="opzione1DImpostaFormato">
                              <span className="pallino"></span>
                              Fronte
                            </label>
                          </div>
                          <div className="opzione">
                            <input type="radio" name="sceltaFormato" value="opzione2" id="opzione2DImpostaFormato" />
                            <label htmlFor="opzione2DImpostaFormato">
                              <span className="pallino"></span>
                              Fronte-retro
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>
                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima colonna */}
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Rilegatura:</p>
                        <div className="opzioni">
                          <div className="opzione">
                            <input type="radio" name="sceltaRilegatura" value="opzione1" id="opzione1SRilegatura" />
                            <label htmlFor="opzione1SRilegatura">
                              <span className="pallino"></span>
                              Si
                            </label>
                          </div>
                          <div className="opzione">
                            <input type="radio" name="sceltaRilegatura" value="opzione2" id="opzione2SRilegatura" />
                            <label htmlFor="opzione2SRilegatura">
                              <span className="pallino"></span>
                              No
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Formato pagina:</p>
                        <div className="opzioni">
                          <div className="opzione">
                            <input type="radio" name="sceltaPagina" value="opzione1" id="opzione1DImpostaPagina" />
                            <label htmlFor="opzione1DImpostaPagina">
                              <span className="pallino"></span>
                              Default
                            </label>
                          </div>
                          <div className="opzione">
                            <input type="radio" name="sceltaPagina" value="opzione2" id="opzione2DImpostaPagina" />
                            <label htmlFor="opzione2DImpostaPagina">
                              <span className="pallino"></span>
                              2 in 1
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>
                    <div className="inputRow">
                      <div className="colonna">
                        {/* Contenuto per la prima colonna */}
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Intervallo pagine:</p>
                        <div className="opzioni">
                          <div className="opzione">
                            <input
                              type="radio"
                              name="sceltaIntervallo"
                              value="opzione1"
                              id="opzione1SIntervallo"
                              onChange={handleSceltaIntervalloChange}
                            />
                            <label htmlFor="opzione1SIntervallo">
                              <span className="pallino"></span>
                              Tutte
                            </label>
                          </div>
                          <div className="opzione">
                            <input
                              type="radio"
                              name="sceltaIntervallo"
                              value="opzione2"
                              id="opzione2SIntervallo"
                              onChange={handleSceltaIntervalloChange}
                            />
                            <label htmlFor="opzione2SIntervallo">
                              <span className="pallino"></span>
                              Personalizzate
                            </label>
                          </div>
                          {showIntervalloPersonalizzato && (
                            <>
                              <div className="inputRowDivS">
                                <p className="testoPiccolo">Da:
                                  <input type="number" id="numeriDa" name="numeriDa" style={{ width: "40px" }} inputMode="numeric" /></p>
                              </div>

                              <div className="inputRowDivD">
                                <p className="testoPiccoloA">a:
                                  <input type="number" id="numeriA" name="numeriA" style={{ width: "40px" }} inputMode="numeric" /></p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="colonna">
                        <p className="testoPiccolo">Numero copie:</p>
                        <div className="inputRowDivS">
                          <input type="number" id="numeriCopie" name="numeriCopie" style={{ width: "40px" }} inputMode="numeric" />
                        </div>
                      </div>
                      <div className="colonna">
                        {/* Contenuto per la quarta colonna */}
                      </div>
                    </div>

                    <a href="#" className='pulsantePerContinuareLaStampa'>CLICCA QUI PER CONTINUARE CON LA STAMPA</a>


                  </div>

                )}
              </div>
              <div className="box3">
                <div style={{ padding: "2.5px" }}>
                  <img
                    src={rotateIcon}
                    alt="Rotate Icon"
                    className={riquadriAperti[2] ? "rotate-icon rotate-icon-ruotata" : "rotate-icon"}
                    onClick={() => toggleRiquadro(2)}
                  />
                  <span className="scrittaIcona">STAMPA LE TUE FOTO</span>
                </div>
                {riquadriAperti[2] && (
                  <div className="riquadro">
                    {/* Contenuto per il riquadro 3 */}
                  </div>
                )}
              </div>
              <div className="box4">
                <div style={{ padding: "2.5px" }}>
                  <img
                    src={rotateIcon}
                    alt="Rotate Icon"
                    className={riquadriAperti[3] ? "rotate-icon rotate-icon-ruotata" : "rotate-icon"}
                    onClick={() => toggleRiquadro(3)}
                  />
                  <span className="scrittaIcona">STAMPA I TUI BIGLIETTI DA VISITA</span>
                </div>
                {riquadriAperti[3] && (
                  <div className="riquadro">
                    {/* Contenuto per il riquadro 4 */}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col">
          </div>
        </div>
      </div>
    </div >
  );
}

export default PVsito;
