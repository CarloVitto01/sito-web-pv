// src/A4PagePrint.tsx
import "../App.css";
import classes from "../components/A4PagePrint.module.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Intro from "../components/Intro";
import Form from "../components/Form";
import ContainerCards from "../components/ContainerCards";
import IntervalloPagine from "../components/IntervalloPagine";
import SingleDelimiter from "../components/SingleDelimiter";
import NumeroCopie from "../components/NumeroCopie";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { auth, storage } from "../backend/firebase";
import { db } from "../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
//import FinalModal from "../components/FinalModal";
import { TOKENA4, CHAT_IDA4 } from "../backend/telegram";
import { FormData } from "../types/FormData";
import { FileHandler } from "../types/FileHandler";
import { RangePagesData } from "../types/RangePagesData";
import MultiInput from "./MultiInput";
import RiepilogoOrdine from "../components/RiepilogoOrdine";
import { onAuthStateChanged } from "firebase/auth";

//Constants


//const foglio = 0.03;
//const biancoNero: number = 0.015;
//const colore: number = 0.075;
//const anelli = 1.5;
//const fascetta = 1;
//const ciappatura = 0.1;
//const spirale = 2;

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
  SPIRALE: 4
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
  const [fileData, setFileData] = useState<{ file: File; pages: number }[]>([]);
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
  const [costi, setCosti] = useState({
    foglio: 0.03,
    biancoNero: 0.015,
    colore: 0.075,
    anelli: 1.5,
    fascetta: 1,
    ciappatura: 0.1,
    spirale: 2,
  });


  //Prevent scrolling when modal is open
  useEffect(() => {
    const costiRef = doc(db, "configA4", "costi");
    const unsub = onSnapshot(costiRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (
          typeof data.foglio === "number" &&
          typeof data.biancoNero === "number" &&
          typeof data.colore === "number" &&
          typeof data.anelli === "number" &&
          typeof data.fascetta === "number" &&
          typeof data.ciappatura === "number" &&
          typeof data.spirale === "number"
        ) {
          setCosti(data as {
            foglio: number;
            biancoNero: number;
            colore: number;
            anelli: number;
            fascetta: number;
            ciappatura: number;
            spirale: number;
          });
        }
      }
    });
    return () => unsub();
  }, []);

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
      case "Bianco e nero": setInchiostro(inchiostroEnum.BIANCOENERO); break;
      case "Colore": setInchiostro(inchiostroEnum.COLORE); break;
      case "Fronte-retro": setPagina(paginaEnum.FRONTE_RETRO); break;
      case "Fronte": setPagina(paginaEnum.FRONTE); break;
      case "Verticale": setLayout(layoutEnum.VERTICALE); break;
      case "Orizzontale": setLayout(layoutEnum.ORIZZONTALE); break;
      case "2 in 1 orizzontale": setLayout(layoutEnum.DUEPAGORIZZ); break;
      case "2 in 1 verticale": setLayout(layoutEnum.DUEPAGVERT); break;
      case "Anelli": setRilegatura(rilegaturaEnum.ANELLI); break;
      case "Fascetta": setRilegatura(rilegaturaEnum.FASCETTA); break;
      case "Ciappatura": setRilegatura(rilegaturaEnum.CIAPPATURA); break;
      case "Nessuna": setRilegatura(rilegaturaEnum.NESSUNA); break;
      case "Spirale": setRilegatura(rilegaturaEnum.SPIRALE); break;
      case "Si": setRilegaturaUnica(rilegaturaUnicaEnum.SI); break;
      case "No": setRilegaturaUnica(rilegaturaUnicaEnum.NO); break;
    }
  }, []);

  const setPDFHandler = useCallback((files: FileHandler[], totalPages: number) => {
    const validFiles = files
      .filter((f) => f.file !== null)
      .map((f) => ({
        file: f.file as File,
        pages: f.numPages || 0,
      }));

    setFileData(validFiles);
    setNumeroPDF(validFiles.length);
    setNumeroPaginePDF(totalPages);
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

      const prezzoInchiostro =
        inchiostro === inchiostroEnum.BIANCOENERO ? costi.biancoNero : costi.colore;

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

      totale += fogli * (costi.foglio + inchiostroTotale);
      totale *= numeroCopie;

      const aggiungiRilegatura = (prezzo: number) => {
        totale += prezzo * numeroCopie;
      };

      const aggiungiRilegaturaMultipla = (prezzo: number) => {
        totale += prezzo * numeroPDF * numeroCopie;
      };

      switch (rilegatura) {
        case rilegaturaEnum.ANELLI:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? aggiungiRilegatura(costi.anelli)
            : aggiungiRilegaturaMultipla(costi.anelli);
          break;
        case rilegaturaEnum.FASCETTA:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? aggiungiRilegatura(costi.fascetta)
            : aggiungiRilegaturaMultipla(costi.fascetta);
          break;
        case rilegaturaEnum.CIAPPATURA:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? aggiungiRilegatura(costi.ciappatura)
            : aggiungiRilegaturaMultipla(costi.ciappatura);
          break;
        case rilegaturaEnum.SPIRALE:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? aggiungiRilegatura(costi.spirale)
            : aggiungiRilegaturaMultipla(costi.spirale);
          break;
        default:
          break;
      }

      if (numeroCopie === 0) totale = 0;

      return totale.toFixed(2);
    };

    if (numeroPaginePDF > 0) {
      const total = calcoloPreventivo();
      setPreventivo(total);
    }

    if (numeroPDF === 0) {
      setPreventivo("0.00");
    }
  }, [inchiostro, pagina, layout, rilegatura, intervalloPagine, numeroPaginePDF, numeroCopie, numeroPDF, rilegaturaUnica, costi]);

  //Send data to the Firebase server

  const submitFormHandler = useCallback(async (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event?.preventDefault();
    setFormSubmitting(true);

    if (fileData.length === 0 || !data.isValid) {
      setFormSubmitting(false);
      return;
    }

    const id = v4();
    const paths: string[] = [];
    const urls: string[] = [];

    for (const { file } of fileData) {
      const path = `PDF/${data.surname + data.name + "|" + file.name.trim().replace(".pdf", "").replace(/\s/g, "").replace(/\(/g, "[").replace(/\)/g, "]") + "|" + id}.pdf`;
      paths.push(path);

      const fileRef = ref(storage, path);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      urls.push(url);
    }

    // ✅ Messaggio con numero di pagine accanto al link
    const fileLinks = urls.map((url, index) => {
      const pages = fileData[index].pages;
      return `- [File ${index + 1} - ${pages} pagine](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`;
    }).join("\n");

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
      colore: inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore",
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
              : rilegatura === 3
                ? "Nessuna"
                : "Spirale",
      pagine: daA,
      rilegaturaUnica: rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO",
      numeroPDF: numeroPDF,
      copie: numeroCopie,
      prezzo: preventivo,
      timestamp: serverTimestamp(),
      tipo: "A4", // ✅ aggiunto per filtro gestionale
    };

    const collectionRef = collection(db, "StampePDFA4");
    const PDFref = doc(collectionRef, id);

    setDoc(PDFref, dataToUpload)
      .then(async () => {
        // 🔄 AGGIORNA I DATI UTENTE SU RACCOLTA "users"
        if (auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, {
            displayName: dataToUpload.nome,
            cognome: dataToUpload.cognome,
            email: dataToUpload.email,
            telefono: dataToUpload.telefono,
            corsoLaurea: dataToUpload.corsoLaurea,
            annoAccademico: dataToUpload.annoAccademico,
          });
        }

        setFormSubmitting(false);
        setFormSubmitted(true);


        const messageText = `
=====================
  *NUOVO ORDINE A4*
=====================

📝 *Dettagli Ordine:*
*Nome*: ${dataToUpload.nome}
*Cognome*: ${dataToUpload.cognome}
*Email*: ${dataToUpload.email}
*Telefono*: ${dataToUpload.telefono}
*Corso Laurea*: ${dataToUpload.corsoLaurea}
*Anno Accademico*: ${dataToUpload.annoAccademico}

📁 *Link ai file:* 📃
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

        const apiUrl = `https://api.telegram.org/bot${TOKENA4}/sendMessage`;
        const payload = {
          chat_id: CHAT_IDA4,
          text: messageText,
          parse_mode: "Markdown",
        };

        fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then((response) => {
            if (!response.ok) {
              console.log("Errore durante l'invio del messaggio:", response.statusText);
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
  }, [data, fileData, numeroPDF, preventivo, pagina, layout, inchiostro, numeroCopie, rilegatura, rilegaturaUnica, daA]);

  // const closeFinalModalHandler = useCallback(() => {
  //   setFormSubmitted(false);
  //   setFormSubmitting(false);
  //   setFormError(false);
  //   window.location.reload(); // Ricarica la pagina
  // }, []);

  useEffect(() => {
    if (formSubmitted) {
      const timeout = setTimeout(() => {
        window.location.reload(); // 🔄 ricarica la pagina
      }, 3000); // ⏱️ attende 3 secondi prima del refresh
      return () => clearTimeout(timeout);
    }
  }, [formSubmitted]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(docRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();

          setData({
            name: userData.displayName || "",
            surname: userData.cognome || "",
            email: userData.email || "",
            telephoneNumber: userData.telefono || "",
            corsoLaurea: userData.corsoLaurea || "",
            annoAccademico: userData.annoAccademico || "",
            isValid: false // Validazione verrà fatta normalmente da Form
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);


  return (
    <div className="">
      <Header />
      <Intro
        title={"STAMPA I TUOI DOCUMENTI A4"}
        text={"In questa pagina potrai ordinare la stampa del tuo documento, inserisci le caratteristiche disponibili nelle varie sezioni per poter avere dei documenti cartacei di qualità."}
      />
      <SingleDelimiter />
      <Form onSendData={setDataHandler} defaultValues={data} />

      <SingleDelimiter />
      <MultiInput onSendData={setPDFHandler} />
      <SingleDelimiter />
      <div className={classes["subContainerA4"]}>
        <div className={classes["subContainerA4Left"]}>
          <div className="container-containerCards">
            <ContainerCards
              title="Colore:"
              components={useMemo(
                () => [
                  {
                    title: "Bianco e nero",
                    imageSrc: require("../assets/images/Bianco_Nero_Ruota.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "Colore",
                    imageSrc: require("../assets/images/Colori_ruota.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                ],
                []
              )}
              defaultValue="Bianco e nero"
              onSendData={newValue}
            />
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
                    title: "2 in 1 orizzontale",
                    imageSrc: require("../assets/images/2in1Orizzontale.jpg"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "2 in 1 verticale",
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
            <ContainerCards
              title="Rilegatura:"
              components={useMemo(
                () => [
                  {
                    title: "Anelli",
                    imageSrc: require("../assets/images/Anelli.jpg"),
                    disabled: numeroPaginePDF > 670 && intervalloPagine > 670, // Aggiungi la proprietà disabled
                    errorMessage: "Limite di 670 pagine",
                  },
                  {
                    title: "Spirale",
                    imageSrc: require("../assets/images/Spirale.png"),
                    disabled: numeroPaginePDF > 500 && intervalloPagine > 500, // Aggiungi la proprietà disabled
                    errorMessage: "Limite di 500 pagine",
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
                    disabled: numeroPaginePDF > 35 && intervalloPagine > 35, // Mantieni la logica di disabilitazione
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

          </div>

          <IntervalloPagine
            onSendData={setRangePagesHandler}
            maxValue={numeroPaginePDF}
            disable={numeroPDF >= 2}
            errorMessage="Disponibile soltanto per un singolo PDF"
          />
          <br />
          <NumeroCopie onSendData={setCopiesHandler} />
        </div>

        <div className={classes["subContainerA4Right"]}>
          <RiepilogoOrdine
            numeroPDF={numeroPDF}
            inchiostro={inchiostro === 0 ? "Bianco e nero" : "Colore"}
            pagina={pagina === 0 ? "Fronte-retro" : "Fronte"}
            layout={
              layout === 0
                ? "Verticale"
                : layout === 1
                  ? "Orizzontale"
                  : layout === 2
                    ? "2 pagine in 1 orizzontale"
                    : "2 pagine in 1 verticale"
            }
            rilegatura={
              rilegatura === 0
                ? "Anelli"
                : rilegatura === 1
                  ? "Fascetta"
                  : rilegatura === 2
                    ? "Ciappatura"
                    : rilegatura === 3
                      ? "Nessuna"
                      : "Spirale"
            }
            rilegaturaUnica={rilegaturaUnica === 0 ? "Si" : "No"}
            intervalloPagine={daA}
            numeroCopie={numeroCopie}
            prezzo={preventivo}
            onConfirmOrder={submitFormHandler}
            disabled={!data.isValid || fileData.length === 0 || !intervalloPagineIsValid || formSubmitting}
            loading={formSubmitting}
            submitted={formSubmitted}
          />
        </div>
      </div>

      {/*<Modal
       totalOrder={preventivo}
       onSubmit={submitFormHandler}
       disabled={!data.isValid || file.length === 0 || !intervalloPagineIsValid}
     />*/}

      <Footer />
      {/*(formSubmitted || formSubmitting) && (
        <FinalModal
          onConfirm={closeFinalModalHandler}
          loading={formSubmitting ? "submitting" : "submitted"}
        />
      )}
      {formError && (
        <FinalModal onConfirm={closeFinalModalHandler} loading={"error"} />
      )*/}
    </div>
  );
};

export default A4PagePrint;