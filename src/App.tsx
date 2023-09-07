import "./App.css";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Intro from "./components/Intro";
import Form from "./components/Form";
import Input from "./components/Input";
import ContainerCards from "./components/ContainerCards";
import IntervalloPagine from "./components/IntervalloPagine";
import SingleDelimiter from "./components/SingleDelimiter";
import NumeroCopie from "./components/NumeroCopie";
import Modal from "./components/Modal";
import React, { useState, useEffect, useCallback } from "react";
import { storage } from "./backend/firebase";
import { db } from "./backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import FinalModal from "./components/FinalModal";
import { TOKEN, CHAT_ID } from "./backend/telegram";

const foglio = 0.019;
const biancoNero: number = 0.009;
const colore: number = 0.028;
const anelli = 1.5;
const fascetta = 1;
const ciappatura = 0.1;

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

const App = () => {
  const [data, setData] = useState<any>({});
  const [file, setFile] = useState<any>();
  const [inchiostro, setInchiostro] = useState<number>(
    inchiostroEnum.BIANCOENERO
  );
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);
  const [layout, setLayout] = useState<number>(layoutEnum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);
  const [daA, setDaA] = useState<string>("Tutte");

  //Debug
  // console.log(numeroPaginePDF);
  // console.log(inchiostro);
  // console.log(pagina);
  // console.log(layout);
  // console.log(rilegatura);
  // console.log(intervalloPagine);
  // console.log(numeroCopie);
  //

  useEffect(() => {
    if (formSubmitted || formSubmitting || formError) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto"; 
    }
  }, [formSubmitted, formSubmitting, formError]);

  const setDataHandler = useCallback((data: any) => {
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

  const setPDFHandler = useCallback((value: any) => {
    setNumeroPaginePDF(value.numPages);
    setFile(value.file);
  }, []);

  const setRangePagesHandler = useCallback(
    (value: any) => {
      if (value.all) {
        if (numeroPaginePDF) {
          setIntervalloPagine(numeroPaginePDF);
        } else {
          setIntervalloPagine(1);
        }
      } else {
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

  useEffect(() => {
    const calcoloPreventivo = () => {
      let totale = 0;
      let fogli = intervalloPagine;
      let prezzoInchiostro =
        inchiostro === inchiostroEnum.BIANCOENERO ? biancoNero : colore;
      if (pagina === paginaEnum.FRONTE_RETRO) {
        fogli = intervalloPagine;
        totale += foglio + 2 * prezzoInchiostro;
      } else {
        totale += foglio + prezzoInchiostro;
      }

      if (
        layout === layoutEnum.DUEPAGORIZZ ||
        layout === layoutEnum.DUEPAGVERT
      ) {
        totale = 0.5 * totale;
      }

      totale = totale * fogli * numeroCopie;

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

  const submitFormHandler = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSubmitting(true);
    if (!file || !data.isValid) {
      return;
    }
    const id = v4();
    const path = `PDF/${
      data.surname +
      data.name +
      "|" +
      file.name.trim().replace(".pdf", "").replace(/\s/g, "") +
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
            *NUOVO ORDINE*
            
            *Nome*: ${dataToUpload.nome}
            *Cognome*: ${dataToUpload.cognome}
            *Email*: ${dataToUpload.email}
            *Telefono*: ${dataToUpload.telefono}
            *File*: [Link al file](${dataToUpload.file})
            *Colore*: ${dataToUpload.colore}
            *Pagina*: ${dataToUpload.pagina}
            *Layout*: ${dataToUpload.layout}
            *Rilegatura*: ${dataToUpload.rilegatura}
            *Pagine*: ${dataToUpload.pagine}
            *Copie*: ${dataToUpload.copie}
            
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
  };

  const closeFinalModalHandler = () => {
    setFormSubmitted(false);
    setFormSubmitting(false);
    setFormError(false);
  };

  return (
    <div className="container">
      <Header />
      <Intro />
      <SingleDelimiter />
      <Form onSendData={setDataHandler} />
      <SingleDelimiter />
      <Input onSendData={setPDFHandler} />
      <SingleDelimiter />
      <ContainerCards
        title="Colore:"
        components={[
          {
            title: "Bianco e nero",
            imageSrc: require("./assets/Bianco_e_nero.jpg"),
          },
          { title: "Colore", imageSrc: require("./assets/Colore.jpg") },
        ]}
        defaultValue="Bianco e nero"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Gestione pagina:"
        components={[
          {
            title: "Fronte-retro",
            imageSrc: require("./assets/Fronte_retro.png"),
          },
          { title: "Fronte", imageSrc: require("./assets/Fronte.png") },
        ]}
        defaultValue="Fronte-retro"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Layout:"
        components={[
          { title: "Verticale", imageSrc: require("./assets/Verticale.jpg") },
          {
            title: "Orizzontale",
            imageSrc: require("./assets/Orizzontale.jpg"),
          },
          {
            title: "2 pagine in 1 orizzontale",
            imageSrc: require("./assets/2in1Orizzontale.jpg"),
          },
          {
            title: "2 pagine in 1 verticale",
            imageSrc: require("./assets/2in1Verticale.jpg"),
          },
        ]}
        defaultValue="Verticale"
        onSendData={newValue}
      />
      <SingleDelimiter />
      <ContainerCards
        title="Rilegatura:"
        components={[
          { title: "Anelli", imageSrc: require("./assets/Anelli.jpg") },
          { title: "Fascetta", imageSrc: require("./assets/Fascetta.jpg") },
          {
            title: "Ciappatura",
            imageSrc: require("./assets/Ciappatura.jpg"),
          },
          { title: "Nessuna", imageSrc: require("./assets/Nessuna.jpg") },
        ]}
        defaultValue="Anelli"
        onSendData={newValue}
      />

      <SingleDelimiter />
      <IntervalloPagine onSendData={setRangePagesHandler} />
      <SingleDelimiter />
      <NumeroCopie onSendData={setCopiesHandler} />
      <SingleDelimiter />
      <Modal
        totalOrder={preventivo}
        onSubmit={submitFormHandler}
        disabled={!data.isValid || !file}
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

export default App;
