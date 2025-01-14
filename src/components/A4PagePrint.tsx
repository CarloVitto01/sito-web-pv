// src/A4PagePrint.tsx
import "../App.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Intro from "../components/Intro";
import Form from "../components/Form";
import ContainerCards from "../components/ContainerCards";
import IntervalloPagine from "../components/IntervalloPagine";
import SingleDelimiter from "../components/SingleDelimiter";
import NumeroCopie from "../components/NumeroCopie";
import Modal from "../components/Modal";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../backend/firebase";
import { db } from "../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import FinalModal from "../components/FinalModal";
import { TOKEN, CHAT_ID } from "../backend/telegram";
import { FormData } from "../types/FormData";
import { FileHandler } from "../types/FileHandler";
import { RangePagesData } from "../types/RangePagesData";
import MultiInput from "./MultiInput";

//Constants


const foglio = 0.03;
const biancoNero: number = 0.015;
const colore: number = 0.075;
const anelli = 1.5;
const fascetta = 1;
const ciappatura = 0.1;

//Enum

const inchiostroEnum = {
  BIANCOENERO: 0,
  COLORE: 1,
};

const paginaEnum = {
  FRONTE_RETRO: 0,
  FRONTE: 1,
};

const layoutEnum = {
  VERTICALE: 0,
  ORIZZONTALE: 1,
  DUEPAGORIZZ: 2,
  DUEPAGVERT: 3,
};

const rilegaturaEnum = {
  ANELLI: 0,
  FASCETTA: 1,
  CIAPPATURA: 2,
  NESSUNA: 3,
};

const rilegaturaUnicaEnum = {
  SI: 0,
  NO: 1
}

const A4PagePrint = () => {
  const [data, setData] = useState<FormData>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
    corsoLaurea: "",
    annoAccademico: ""
  });
  const [file, setFile] = useState<File[]>([]);
  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [inchiostro, setInchiostro] = useState<number>(
    inchiostroEnum.BIANCOENERO
  );
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);
  const [layout, setLayout] = useState<number>(layoutEnum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
  const [rilegaturaUnica, setRilegaturaUnica] = useState<number>(rilegaturaUnicaEnum.NO);
  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [daA, setDaA] = useState<string>("Tutte");
  const [intervalloPagineIsValid, setIntervalloPagineIsValid] = useState<
    boolean | undefined
  >(true);
  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);
  const [numeroPDF, setNumeroPDF] = useState<number>(0); // Stato per il conteggio dei PDF
console.log(numeroPDF, "numero pdf")

  //Debug
  // console.log(numeroPaginePDF);
  // console.log(inchiostro);
  // console.log(pagina);
  // console.log(layout);
  // console.log(rilegatura);
  // console.log(intervalloPagine);
  // console.log(numeroCopie);
  //

  //Prevent scrolling when modal is open

  useEffect(() => {
    if (formSubmitted || formSubmitting || formError) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [formSubmitted, formSubmitting, formError]);

  //Form Data Handling

  const setDataHandler = useCallback((data: FormData) => {
    setData({
      name: data.name,
      surname: data.surname,
      email: data.email,
      telephoneNumber: data.telephoneNumber,
      corsoLaurea: data.corsoLaurea,
      annoAccademico: data.annoAccademico,
      isValid: data.isValid,
    });
  }, []);

  const newValue = useCallback((value: string) => {
    switch (value) {
      case "Bianco e nero":
        setInchiostro(inchiostroEnum.BIANCOENERO);
        break;
      case "Colore":
        setInchiostro(inchiostroEnum.COLORE);
        break;
      case "Fronte-retro":
        setPagina(paginaEnum.FRONTE_RETRO);
        break;
      case "Fronte":
        setPagina(paginaEnum.FRONTE);
        break;
      case "Verticale":
        setLayout(layoutEnum.VERTICALE);
        break;
      case "Orizzontale":
        setLayout(layoutEnum.ORIZZONTALE);
        break;
      case "2 pagine in 1 orizzontale":
        setLayout(layoutEnum.DUEPAGORIZZ);
        break;
      case "2 pagine in 1 verticale":
        setLayout(layoutEnum.DUEPAGVERT);
        break;
      case "Anelli":
        setRilegatura(rilegaturaEnum.ANELLI);
        break;
      case "Fascetta":
        setRilegatura(rilegaturaEnum.FASCETTA);
        break;
      case "Ciappatura":
        setRilegatura(rilegaturaEnum.CIAPPATURA);
        break;
      case "Nessuna":
        setRilegatura(rilegaturaEnum.NESSUNA);
        break;
      case "Si":
        setRilegaturaUnica(rilegaturaUnicaEnum.SI);
        break;
      case "No":
        setRilegaturaUnica(rilegaturaUnicaEnum.NO);
        break;
    }
  }, []);

  const setPDFHandler = useCallback((files: FileHandler[], totalPages: number) => {
    const validFiles = files.map(fileHandler => fileHandler.file).filter((file): file is File => file !== null);
    
    setFile(validFiles); // Imposta i file validi
    setNumeroPDF(validFiles.length); // Aggiorna il conteggio dei PDF
    setNumeroPaginePDF(totalPages); // Imposta il numero totale di pagine
    console.log("Totale numero di pagine:", totalPages);
  }, []);

  const setRangePagesHandler = useCallback(
    (value: RangePagesData) => {
      if (value.all) {
        if (numeroPaginePDF) {
          setIntervalloPagine(numeroPaginePDF);
        } else {
          setIntervalloPagine(1);
        }
      } else {
        setIntervalloPagineIsValid(value.isValid);
        if (!value.isValid) {
          return;
        }
        let from = value.from;
        let to = value.to;
        setDaA("" + from + "-" + to);
        if (isNaN(from) || isNaN(to)) {
          return;
        }
        let range = to - from + 1;
        if (from === 0 && to === 0) {
          range = 0;
        }
        setIntervalloPagine(range);
      }
    },
    [numeroPaginePDF]
  );

  const setCopiesHandler = useCallback((value: number) => {
    setNumeroCopie(value);
  }, []);

  //Calculate total order

  useEffect(() => {
    const calcoloPreventivo = () => {
      let totale = 0;
      let pagine = intervalloPagine;
      let fogli;
      let inchiostroTotale;
      let prezzoInchiostro =
        inchiostro === inchiostroEnum.BIANCOENERO ? biancoNero : colore;
      if (pagina === paginaEnum.FRONTE_RETRO) {
        fogli = pagine / 2;
        inchiostroTotale = 2 * prezzoInchiostro;
      } else {
        fogli = pagine;
        inchiostroTotale = prezzoInchiostro;
      }
      if (
        layout === layoutEnum.DUEPAGORIZZ ||
        layout === layoutEnum.DUEPAGVERT
      ) {
        fogli = fogli / 2;
      }

      totale += fogli * (foglio + inchiostroTotale);
      totale = totale * numeroCopie;

      if (numeroPDF === 1 && rilegatura === rilegaturaEnum.ANELLI) {
        totale += anelli * numeroCopie;
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.ANELLI && rilegaturaUnica === rilegaturaUnicaEnum.SI) {
        totale += anelli * numeroCopie;
        totale = totale + rilegatura * 1;
        console.log(totale , "totale")
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.ANELLI && rilegaturaUnica === rilegaturaUnicaEnum.NO) {
        totale += (anelli * numeroPDF) * numeroCopie;
      } else if (numeroPDF === 1 && rilegatura === rilegaturaEnum.FASCETTA) {
        totale += fascetta * numeroCopie;
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.FASCETTA && rilegaturaUnica === rilegaturaUnicaEnum.SI) {
        totale += fascetta * numeroCopie;
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.FASCETTA && rilegaturaUnica === rilegaturaUnicaEnum.NO) {
        totale += fascetta * numeroPDF * numeroCopie;
      } else if (numeroPDF === 1 && rilegatura === rilegaturaEnum.CIAPPATURA) {
        totale += ciappatura * numeroCopie;
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.CIAPPATURA && rilegaturaUnica === rilegaturaUnicaEnum.SI) {
        totale += ciappatura * numeroCopie;
      } else if (numeroPDF > 1 && rilegatura === rilegaturaEnum.CIAPPATURA && rilegaturaUnica === rilegaturaUnicaEnum.NO) {
        totale += ciappatura * numeroPDF * numeroCopie;
      }
      if (numeroCopie === 0) {
        totale = 0;
      }
      return totale.toFixed(2);
    };
    if (numeroPaginePDF > 0) {
      let total = calcoloPreventivo();
      setPreventivo(total);
    }
    if (numeroPDF === 0) {
      setPreventivo("0.00")
    }
  }, [inchiostro, pagina, layout, rilegatura, intervalloPagine, numeroPaginePDF, numeroCopie, numeroPDF, rilegaturaUnica]);

  //Send data to the Firebase server

  const submitFormHandler = useCallback(async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    setFormSubmitting(true);
    if (file.length === 0 || !data.isValid) { // Controlla se ci sono file
        setFormSubmitting(false); // Assicurati di impostare formSubmitting su false se non ci sono file
        return;
    }

    const id = v4();
    const paths: string[] = []; // Array per memorizzare i percorsi dei file
    const urls: string[] = []; // Array per memorizzare gli URL dei file

    // Carica i file uno per uno
    for (const singleFile of file) {
        const path = `PDF/${data.surname + data.name + "|" + singleFile.name.trim().replace(".pdf", "").replace(/\s/g, "").replace(/\(/g, "[").replace(/\)/g, "]") + "|" + id}.pdf`;
        paths.push(path); // Aggiungi il percorso all'array

        const fileRef = ref(storage, path);
        const snapshot = await uploadBytes(fileRef, singleFile);
        const url = await getDownloadURL(snapshot.ref);
        urls.push(url); // Aggiungi l'URL all'array
    }

    // Crea il messaggio con i link dei file
    const fileLinks = urls.map((url, index) => `- [File ${index + 1}](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`).join("\n");

          const dataToUpload = {
            id: id,
            path: paths,
            nome: data.name,
            cognome: data.surname,
            email: data.email,
            telefono: data.telephoneNumber,
            corsoLaurea: data.corsoLaurea,
            annoAccademico: data.annoAccademico,
            file: urls,
            colore:
              inchiostro === inchiostroEnum.BIANCOENERO
                ? "Bianco e nero"
                : "Colore",
            pagina: pagina === 0 ? "Fronte-retro" : "Fronte",
            layout:
              layout === 0
                ? "Verticale"
                : layout === 1
                  ? "Orizzontale"
                  : layout === 2
                    ? "2 pagine in 1 orizzontale"
                    : "2 pagine in 1 verticale",
            rilegatura:
              rilegatura === 0
                ? "Anelli"
                : rilegatura === 1
                  ? "Fascetta"
                  : rilegatura === 2
                    ? "Ciappatura"
                    : "Nessuna",
            pagine: daA,
            rilegaturaUnica: rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO",
            numeroPDF: numeroPDF,
            copie: numeroCopie,
            prezzo: preventivo,
            timestamp: serverTimestamp(),
          };
          const collectionRef = collection(db, "StampePDF");
          const PDFref = doc(collectionRef, id);
          setDoc(PDFref, dataToUpload)
            .then(() => {
              setFormSubmitting(false);
              setFormSubmitted(true);
              //Send message to telegram channel
              const messageText = `
                *NUOVO ORDINE A4*

                📝 *Dettagli Ordine:*
                *Nome*: ${dataToUpload.nome}
                *Cognome*: ${dataToUpload.cognome}
                *Email*: ${dataToUpload.email}
                *Telefono*: ${dataToUpload.telefono}
                *Corso Laurea*: ${dataToUpload.corsoLaurea}
                *Anno Accademico*: ${dataToUpload.annoAccademico}
                 📁 *Link ai file:* 📄
                ${fileLinks}
                🎨 *Colore*: ${dataToUpload.colore}
                📄 *Pagina*: ${dataToUpload.pagina}
                📐 *Layout*: ${dataToUpload.layout}
                📒 *Rilegatura*: ${dataToUpload.rilegatura}
                📒 *Rilegatura unica*: ${dataToUpload.rilegaturaUnica}
                *Pagine*: ${dataToUpload.pagine}
                🔢 *Copie*: ${dataToUpload.copie}
                💰💰 *Prezzo*: ${preventivo}€ 💰💰
                
                `;
              const apiUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
              const data = {
                chat_id: CHAT_ID,
                text: messageText,
                parse_mode: "Markdown",
              };
              const requestOptions = {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              };
              fetch(apiUrl, requestOptions)
                .then((response) => {
                  if (response.ok) {
                    console.log("Messaggio inviato con successo");
                  } else {
                    console.log(
                      "Errore durante l'invio del messaggio:",
                      response.statusText
                    );
                  }
                })
                .catch((error) => {
                  console.error("Errore durante l'invio del messaggio:", error);
                });
            })
            .catch((error) => {
              console.log(error);
              setFormError(true);
              setFormSubmitting(false);
          });
  }, [daA, data.annoAccademico, data.corsoLaurea, data.email, data.isValid, data.name, data.surname, data.telephoneNumber, file, inchiostro, layout, numeroCopie, numeroPDF, pagina, preventivo, rilegatura, rilegaturaUnica]);    // Final modal handling
  
  const closeFinalModalHandler = useCallback(() => {
    setFormSubmitted(false);
    setFormSubmitting(false);
    setFormError(false);
    window.location.reload(); // Ricarica la pagina
  }, []);

  return (
    <div className="container">
      <Header />
      <Intro 
        title={"STAMPA I TUOI DOCUMENTI A4"} 
        text={"In questa pagina potrai ordinare la stampa del tuo documento, inserisci le caratteristiche disponibili nelle varie sezioni per poter avere dei documenti cartacei di qualità."} 
      />
      <SingleDelimiter />
      <Form onSendData={setDataHandler} />
      <SingleDelimiter />
      <MultiInput onSendData={setPDFHandler} />
      <SingleDelimiter />
      <ContainerCards
        title="Colore:"
        components={useMemo(
          () => [
            {
              title: "Bianco e nero",
              imageSrc: require("../assets/images/Bianco_e_nero.jpg"),
              disabled: false,
              errorMessage: "",
            },
            {
              title: "Colore",
              imageSrc: require("../assets/images/Colore.jpg"),
              disabled: false,
              errorMessage: "",
            },
          ],
          []
        )}
        defaultValue="Bianco e nero"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Layout:"
        components={useMemo(
          () => [
            {
              title: "Verticale",
              imageSrc: require("../assets/images/Verticale.jpg"),
              disabled: false,
              errorMessage: "",
            },
            {
              title: "Orizzontale",
              imageSrc: require("../assets/images/Orizzontale.jpg"),
              disabled: false,
              errorMessage: "",
            },
            {
              title: "2 pagine in 1 orizzontale",
              imageSrc: require("../assets/images/2in1Orizzontale.jpg"),
              disabled: false,
              errorMessage: "",
            },
            {
              title: "2 pagine in 1 verticale",
              imageSrc: require("../assets/images/2in1Verticale.jpg"),
              disabled: false,
              errorMessage: "",
            },
          ],
          []
        )}
        defaultValue="Verticale"
        onSendData={newValue}
      />

      <SingleDelimiter />
      <ContainerCards
        title="Gestione pagina:"
        components={useMemo(
          () => [
            {
              title: "Fronte-retro",
              imageSrc: require("../assets/images/Fronte_retro.png"),
              disabled: false,
              errorMessage: "",
            },
            {
              title: "Fronte",
              imageSrc: require("../assets/images/Fronte.png"),
              disabled: false,
              errorMessage: "",
            },
          ],
          []
        )}
        defaultValue="Fronte-retro"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Rilegatura unica:"
        components={useMemo(
          () => [
            {
              title: "Si",
              imageSrc: require("../assets/images/Fronte_retro.png"),
              disabled: numeroPDF === 1,
              errorMessage: "Disponibile Soltanto per 2 o più PDF",
            },
            {
              title: "No",
              imageSrc: require("../assets/images/Fronte.png"),
              disabled: numeroPDF === 1,
              errorMessage: "Disponibile Soltanto per 2 o più PDF",
            },
          ],
          [numeroPDF]
        )}
        defaultValue="No"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Rilegatura:"
        components={useMemo(
          () => [
            {
              title: "Anelli",
              imageSrc: require("../assets/images/Anelli.jpg"),
              disabled: false, // Aggiungi la proprietà disabled
              errorMessage: "",
            },
            {
              title: "Fascetta",
              imageSrc: require("../assets/images/Fascetta.jpg"),
              disabled: numeroPaginePDF > 80 && intervalloPagine > 80, // Aggiungi la proprietà disabled
              errorMessage: "Limite di 80 pagine",
            },
            {
              title: "Ciappatura",
              imageSrc: require("../assets/images/Ciappatura.jpg"),
              disabled: numeroPaginePDF > 40 && intervalloPagine > 40, // Mantieni la logica di disabilitazione
              errorMessage: "Limite di 40 pagine"
            },
            {
              title: "Nessuna",
              imageSrc: require("../assets/images/Nessuna.jpg"),
              disabled: false, // Aggiungi la proprietà disabled
              errorMessage: "",
            },
          ],
          [numeroPaginePDF, intervalloPagine] // Aggiungi numeroPaginePDF come dipendenza
        )}
        defaultValue="Anelli"
        onSendData={newValue} // Assicurati che newValue sia una funzione valida
      />
      <SingleDelimiter />
      <IntervalloPagine
        onSendData={setRangePagesHandler}
        maxValue={numeroPaginePDF}
        disable={numeroPDF >= 2}
        errorMessage="Disponibile soltanto per un singolo PDF"
      />
      <SingleDelimiter />
      <NumeroCopie onSendData={setCopiesHandler} />
      <SingleDelimiter />
      <Modal
  totalOrder={preventivo}
  onSubmit={submitFormHandler}
  disabled={!data.isValid || file.length === 0 || !intervalloPagineIsValid}
/>
      <Footer />
      {(formSubmitted || formSubmitting) && (
        <FinalModal
          onConfirm={closeFinalModalHandler}
          loading={formSubmitting ? "submitting" : "submitted"}
        />
      )}
      {formError && (
        <FinalModal onConfirm={closeFinalModalHandler} loading={"error"} />
      )}
    </div>
  );
};

export default A4PagePrint;