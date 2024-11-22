// src/A4PagePrint.tsx
import "../App.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Intro from "../components/Intro";
import Form from "../components/Form";
import Input from "../components/Input";
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
import { Link } from "react-router-dom";
import classes from "./A4PagePrint.module.css";
import { FaArrowLeftLong } from "react-icons/fa6";

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

const A4PagePrint = () => {
  const [data, setData] = useState<FormData>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [inchiostro, setInchiostro] = useState<number>(
    inchiostroEnum.BIANCOENERO
  );
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);
  const [layout, setLayout] = useState<number>(layoutEnum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
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
    }
  }, []);

  const setPDFHandler = useCallback((value: FileHandler) => {
    setNumeroPaginePDF(value.numPages);
    setFile(value.file);
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

      if (rilegatura === rilegaturaEnum.ANELLI) {
        totale += anelli * numeroCopie;
      } else if (rilegatura === rilegaturaEnum.FASCETTA) {
        totale += fascetta * numeroCopie;
      } else if (rilegatura === rilegaturaEnum.CIAPPATURA) {
        totale += ciappatura * numeroCopie;
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
  }, [
    inchiostro,
    pagina,
    layout,
    rilegatura,
    intervalloPagine,
    numeroPaginePDF,
    numeroCopie,
  ]);

  //Send data to the Firebase server

  const submitFormHandler = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.preventDefault();
      setFormSubmitting(true);
      if (!file || !data.isValid) {
        return;
      }
      const id = v4();
      const path = `PDF/${data.surname +
        data.name +
        "|" +
        file.name
          .trim()
          .replace(".pdf", "")
          .replace(/\s/g, "")
          .replace(/\(/g, "[")
          .replace(/\)/g, "]") +
        "|" +
        id
        }.pdf`;
      const fileRef = ref(storage, path);
      uploadBytes(fileRef, file).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          const dataToUpload = {
            id: id,
            path: path,
            nome: data.name,
            cognome: data.surname,
            email: data.email,
            telefono: data.telephoneNumber,
            file: url,
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
                
                *Nome*: ${dataToUpload.nome}
                *Cognome*: ${dataToUpload.cognome}
                *Email*: ${dataToUpload.email}
                *Telefono*: ${dataToUpload.telefono}
                *File*: [Link al file](${dataToUpload.file
                  .replace(/\(/g, "[")
                  .replace(/\)/g, "]")})
                *Colore*: ${dataToUpload.colore}
                *Pagina*: ${dataToUpload.pagina}
                *Layout*: ${dataToUpload.layout}
                *Rilegatura*: ${dataToUpload.rilegatura}
                *Pagine*: ${dataToUpload.pagine}
                *Copie*: ${dataToUpload.copie}
                *Prezzo*: ${preventivo}€
                
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
        });
      });
    },
    [
      daA,
      data,
      file,
      inchiostro,
      layout,
      numeroCopie,
      pagina,
      rilegatura,
      preventivo,
    ]
  );

  //Final modal handling

  const closeFinalModalHandler = useCallback(() => {
    setFormSubmitted(false);
    setFormSubmitting(false);
    setFormError(false);
    window.location.reload(); // Ricarica la pagina
  }, []);

  return (
    <div className="container">
      <div style={{ margin: "20px", backgroundColor: "none" }}>
        <Link to="/">
          <button className={classes["back-button-A4"]}>
            <FaArrowLeftLong />
          </button>
        </Link>
      </div>
      <Header />
      <Intro />
      <SingleDelimiter />
      <Form onSendData={setDataHandler} />
      <SingleDelimiter />
      <Input onSendData={setPDFHandler} />
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
      />
      <SingleDelimiter />
      <NumeroCopie onSendData={setCopiesHandler} />
      <SingleDelimiter />
      <Modal
        totalOrder={preventivo}
        onSubmit={submitFormHandler}
        disabled={!data.isValid || !file || !intervalloPagineIsValid}
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