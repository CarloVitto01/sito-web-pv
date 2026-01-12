// src/A4PagePrint.tsx
import "../../App.css";
import classes from "../A4/A4PagePrint.module.css";
import Footer from "../FooterComponents/Footer";
import Header from "../HeaderComponents/Header";
import Intro from "../IntroComponents/Intro";
import Form from "../FormComponents/Form";
import ContainerCards from "../../components/CardComponents/ContainerCards";
import IntervalloPagine from "../IntervalloPagineComponents/IntervalloPagine";
import SingleDelimiter from "../SingleDelimiterComponents/SingleDelimiter";
import NumeroCopie from "../NumeroCopieComponents/NumeroCopie";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { auth, storage } from "../../backend/firebase";
import { db } from "../../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
//import FinalModal from "../components/FinalModal";
import { TOKENA4, CHAT_IDA4 } from "../../backend/telegram";
import { FormData } from "../../types/FormData";
import { FileHandler } from "../../types/FileHandler";
import { RangePagesData } from "../../types/RangePagesData";
import MultiInput from "../MultiInputComponents/MultiInput";
import RiepilogoOrdine from "../RiepilogoOrdineComponents/RiepilogoOrdine";
import { onAuthStateChanged } from "firebase/auth";
import Banner from "../Banner/Banner";

// Formatter € (aggiunta)
const fmtEuro = (n?: number | string) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [costi, setCosti] = useState({
    foglio: 0.03,
    biancoNero: 0.015,
    colore: 0.075,
    anelli: 1.5,
    fascetta: 1,
    ciappatura: 0.1,
    spirale: 2,
  });

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

  // Pagine da usare per i limiti rilegatura:
  // - 1 PDF: usa l'intervallo selezionato (intervalloPagine)
  // - 2+ PDF + rilegatura unica SI: usa il totale pagine complessive (numeroPaginePDF)
  // - 2+ PDF + rilegatura unica NO: usa il massimo numero pagine tra i PDF (max per-PDF)
  const pagesForBindingLimit = useMemo(() => {
    if (numeroPDF <= 1) return intervalloPagine;

    const isUnica = rilegaturaUnica === rilegaturaUnicaEnum.SI;
    if (isUnica) return numeroPaginePDF || 0;

    // rilegatura unica NO => controllo sul singolo PDF (prendiamo il massimo)
    const maxSingle = fileData.reduce((acc, f) => Math.max(acc, f.pages || 0), 0);
    return maxSingle;
  }, [numeroPDF, rilegaturaUnica, intervalloPagine, numeroPaginePDF, fileData]);


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

  //Intervallo Pagine Handling
  const setRangePagesHandler = useCallback(
    (value: RangePagesData) => {
      if (value.all) {
        setDaA("Tutte");
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

        if (isNaN(from) || isNaN(to)) {
          return;
        }

        setDaA(`${from}-${to}`);

        let range = to - from + 1;
        if (from === 0 && to === 0) {
          range = 0;
        }
        setIntervalloPagine(range);
      }
    },
    [numeroPaginePDF]
  );

  useEffect(() => {
    if (numeroPDF >= 2) {
      setIntervalloPagine(numeroPaginePDF || 1);
      setDaA("Tutte");
    }
  }, [numeroPDF, numeroPaginePDF]);

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

  // --- Helpers per quantità interne ---
  const computeNFogliPerCopia = (pagineSelezionate: number, paginaMode: number, layoutMode: number) => {
    let fogli = paginaMode === paginaEnum.FRONTE_RETRO ? Math.ceil(pagineSelezionate / 2) : pagineSelezionate;
    if (layoutMode === layoutEnum.DUEPAGORIZZ || layoutMode === layoutEnum.DUEPAGVERT) {
      fogli = Math.ceil(fogli / 2);
    }
    return Math.max(0, fogli);
  };

  const computeFascicoli = (copie: number, rilegaturaUnicaVal: number) => {
    const isUnica = rilegaturaUnicaVal === rilegaturaUnicaEnum.SI;
    return isUnica ? 1 : Math.max(1, copie);
  };

  // 🆕 accetta sia (event) sia (paymentPayload, event)
  const submitFormHandler = useCallback(async (arg1?: any, arg2?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const isPaymentPayload = (o: any) => o && typeof o === "object" && ("method" in o);
    const payment = isPaymentPayload(arg1)
      ? (arg1 as {
        method: "CASH" | "PAYPAL";
        confirmed: boolean;
        amount?: number;
        orderId?: string;
        captureId?: string;
        payerEmail?: string;
        breakdown?: {
          imponibile: number;
          iva: number;
          trasporto: number;
          feePayPal: number;
        };
        // 🆕 consegna
        delivery?: {
          dateISO: string;
          dayLabel: string;
          timeRange: string;
          weekday: number; // 1..7
        };
      })
      : undefined;
    const event = isPaymentPayload(arg1) ? arg2 : (arg1 as React.MouseEvent<HTMLButtonElement, MouseEvent> | undefined);

    event?.preventDefault();

    if (!auth.currentUser) {
      alert("Per effettuare un ordine è necessario effettuare il login.");
      window.location.href = "/login";
      return;
    }
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

    // 🆕 calcolo descrizioni pagamento (fallback se non passato)
    const metodoPagamento =
      payment?.method === "PAYPAL"
        ? "PayPal"
        : payment?.method === "CASH"
          ? "Contanti"
          : "n/d";

    const statoPagamento =
      payment?.method === "PAYPAL"
        ? (payment.confirmed ? "Pagato (conferma utente)" : "Non verificato")
        : payment?.method === "CASH"
          ? "Da saldare alla consegna"
          : "Non specificato";

    // 🧮 quantità interne (per StoricoDati)
    const nFogliPerCopia = computeNFogliPerCopia(intervalloPagine, pagina, layout);
    const nFogli = nFogliPerCopia * Math.max(1, numeroCopie);
    const fascicoli = computeFascicoli(numeroCopie, rilegaturaUnica);
    const isColore = inchiostro === inchiostroEnum.COLORE;

    // 🆕 consegna
    const delivery = payment?.delivery;
    const deliveryDayLabel = delivery?.dayLabel ?? undefined;
    const deliveryTimeRange = delivery?.timeRange ?? undefined;
    const deliveryDateISO = delivery?.dateISO ?? undefined;
    const deliveryWeekday = delivery?.weekday ?? undefined;

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
      tipo: "A4",
      uid: auth.currentUser?.uid,
      nFogli,
      nFogliPerCopia,
      fascicoli,
      inchiostro: isColore ? "colore" : "biancoenero",
      // 🆕 consegna: salvo anche sull'ordine principale
      deliveryDayLabel,
      deliveryTimeRange,
      deliveryDateISO,
      deliveryWeekday,
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

        // 🆕 Totale finale: usa payment.amount (IVA+trasporto+fee) con fallback al preventivo
        const totaleFinale =
          typeof payment?.amount === "number" ? payment.amount : Number(preventivo);

        // ✅ CREA versione ridotta dell'ordine senza file PDF
        const { file, path, ...rest } = dataToUpload;
        const datiSnelliti = {
          ...rest,
          totaleFinale,
          metodoPagamento,
          trasporto: payment?.breakdown?.trasporto ?? 0,
          imponibile: payment?.breakdown?.imponibile ?? undefined,
          iva: payment?.breakdown?.iva ?? undefined,
          paypalFee: payment?.breakdown?.feePayPal ?? 0,
          timestamp: serverTimestamp(),
          nFogli,
          nFogliPerCopia,
          fascicoli,
          inchiostro: isColore ? "colore" : "biancoenero",
          // 🆕 consegna anche nell'archivio
          deliveryDayLabel,
          deliveryTimeRange,
          deliveryDateISO,
          deliveryWeekday,
        };

        await setDoc(doc(db, "ArchivioOrdini", id), datiSnelliti);

        // 🧾 Dettagli PayPal facoltativi
        const extraPP =
          payment?.method === "PAYPAL"
            ? `\n🧾 *PayPal OrderID*: ${payment.orderId ?? "-"}\n🧾 *CaptureID*: ${payment.captureId ?? "-"}\n👤 *Payer*: ${payment.payerEmail ?? "-"}\n`
            : "";

        // 🆕 Blocchetto consegna per Telegram
        const deliveryBlock = delivery
          ? `\n🚚 *Consegna*: ${deliveryDayLabel} • ${deliveryTimeRange}\n`
          : "";

        // 🆕 Messaggio Telegram aggiornato con Consegna + Totale finale
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
${deliveryBlock}
💳 *Metodo di pagamento*: ${metodoPagamento}
✅ *Stato pagamento*: ${statoPagamento}
💰 *Totale finale*: ${fmtEuro(totaleFinale)} €
${extraPP}`.trim();

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
  }, [
    data,
    fileData,
    numeroPDF,
    preventivo,
    pagina,
    layout,
    intervalloPagine,
    inchiostro,
    numeroCopie,
    rilegatura,
    rilegaturaUnica,
    daA
  ]);

  useEffect(() => {
    if (formSubmitted) {
      const timeout = setTimeout(() => {
        window.location.reload();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [formSubmitted]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
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
            isValid: false
          });
        }
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="">
      <Header />
      <Banner />
      <Intro
        title={"STAMPA I TUOI DOCUMENTI A4"}
        text={"In questa pagina potrai ordinare la stampa del tuo documento, inserisci le caratteristiche disponibili nelle varie sezioni per poter avere dei documenti cartacei di qualità."}
      />
      <SingleDelimiter />
      <Form
        onSendData={setDataHandler}
        defaultValues={data}
        disabled={!isLoggedIn}
        readOnlyFields={isLoggedIn}
      />

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
                    imageSrc: require("../../assets/images/Bianco_nero.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "Colore",
                    imageSrc: require("../../assets/images/Colore.png"),
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
                    imageSrc: require("../../assets/images/Verticale.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "Orizzontale",
                    imageSrc: require("../../assets/images/Orizzontale.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "2 in 1 orizzontale",
                    imageSrc: require("../../assets/images/2in1_orizzontale.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "2 in 1 verticale",
                    imageSrc: require("../../assets/images/2in1_verticale.png"),
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
                    imageSrc: require("../../assets/images/Fronte_retro.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                  {
                    title: "Fronte",
                    imageSrc: require("../../assets/images/Fronte.png"),
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
                    imageSrc: require("../../assets/images/SI.png"),
                    disabled: numeroPDF === 1,
                    errorMessage: "Disponibile Soltanto per 2 o più PDF",
                  },
                  {
                    title: "No",
                    imageSrc: require("../../assets/images/NO.png"),
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
                    imageSrc: require("../../assets/images/Anelli.png"),
                    disabled: pagesForBindingLimit > 670,
                    errorMessage: "Limite di 670 pagine",
                  },
                  {
                    title: "Spirale",
                    imageSrc: require("../../assets/images/Spirale.png"),
                    disabled: pagesForBindingLimit > 500,
                    errorMessage: "Limite di 500 pagine",
                  },
                  {
                    title: "Fascetta",
                    imageSrc: require("../../assets/images/Fascetta.png"),
                    disabled: pagesForBindingLimit > 80,
                    errorMessage: "Limite di 80 pagine",
                  },
                  {
                    title: "Ciappatura",
                    imageSrc: require("../../assets/images/Ciappatura.png"),
                    disabled: pagesForBindingLimit > 35,
                    errorMessage: "Limite di 40 pagine"
                  },
                  {
                    title: "Nessuna",
                    imageSrc: require("../../assets/images/No_rilegatura.png"),
                    disabled: false,
                    errorMessage: "",
                  },
                ],
                [pagesForBindingLimit]
              )}
              defaultValue="Anelli"
              onSendData={newValue}
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
      <Footer />
    </div>
  );
};

export default A4PagePrint;
