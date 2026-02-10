// src/pages/PdfPrintPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";

import { Box, Container, Grid, Stack, Modal, Text, Group, Button } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import Footer from "../FooterComponents/Footer";
import Header from "../HeaderComponents/Header";
import Intro from "../IntroComponents/Intro";
import SingleDelimiter from "../SingleDelimiterComponents/SingleDelimiter";
import MultiInput from "../MultiInputComponents/MultiInput";
import NumeroCopie from "../NumeroCopieComponents/NumeroCopie";
import IntervalloPagine from "../IntervalloPagineComponents/IntervalloPagine";
import RiepilogoOrdine from "../RiepilogoOrdineComponents/RiepilogoOrdine";
import RiepilogoOrdineA3 from "../RiepilogoOrdineComponents/RiepilogoOrdineA3";
import Banner from "../Banner/Banner";

import { auth, db, storage } from "../../backend/firebase";
import { TOKENA4, CHAT_IDA4, TOKENA3, CHAT_IDA3 } from "../../backend/telegram";
import { FileHandler } from "../../types/FileHandler";
import { RangePagesData } from "../../types/RangePagesData";

import FormatoPicker from "../CardComponents/FormatoPicker";
import CardGridPicker from "../CardComponents/CardGridPicker";
import RilegaturaUnicaPicker from "../CardComponents/RilegaturaUnicaPicker";
import { useNavigate } from "react-router-dom";
import { IconLock } from "@tabler/icons-react";


// Formatter €
const fmtEuro = (n?: number | string) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// --- ENUM condivisi ---
const formatoEnum = { A4: 0, A3: 1 };
const inchiostroEnum = { BIANCOENERO: 0, COLORE: 1 };
const paginaEnum = { FRONTE_RETRO: 0, FRONTE: 1 };

// A4
const layoutA4Enum = { VERTICALE: 0, ORIZZONTALE: 1, DUEPAGORIZZ: 2, DUEPAGVERT: 3 };
const rilegaturaEnum = { ANELLI: 0, FASCETTA: 1, CIAPPATURA: 2, NESSUNA: 3, SPIRALE: 4 };
const rilegaturaUnicaEnum = { SI: 0, NO: 1 };

// A3
const plastificazioneEnum = { SI: 0, NO: 1 };
const layoutA3Enum = { ORIZZONTALE: 0, VERTICALE: 1, AUTO: 2 };
const grammaturaEnum = { NORMALE: 0, CARTONCINO: 1 };

type UserMini = {
  name: string;
  surname: string;
  email: string;
  telephoneNumber: string;
  corsoLaurea: string;
  annoAccademico: string;
};

const sanitizeForPath = (s: string) =>
  (s || "")
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/\s/g, "")
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")
    .replace(/\|/g, "-");


const PdfPrintPage = () => {
  const isNarrow = useMediaQuery("(max-width: 900px)");

  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // --- stato base condiviso ---
  const [formato, setFormato] = useState<number>(formatoEnum.A4);

  // ✅ dati “silenziosi” (non c’è Form UI): servono solo per Firestore/Telegram
  const [userMini, setUserMini] = useState<UserMini>({
    name: "",
    surname: "",
    email: "",
    telephoneNumber: "",
    corsoLaurea: "",
    annoAccademico: "",
  });

  const [fileData, setFileData] = useState<{ file: File; pages: number }[]>([]);
  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [numeroPDF, setNumeroPDF] = useState<number>(0);

  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");

  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);
  const [, setIsLoggedIn] = useState(false);

  // --- opzioni comuni (inchiostro/pagina) ---
  const [inchiostro, setInchiostro] = useState<number>(inchiostroEnum.BIANCOENERO);
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);

  // --- A4 specific ---
  const [layoutA4, setLayoutA4] = useState<number>(layoutA4Enum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
  const [rilegaturaUnica, setRilegaturaUnica] = useState<number>(rilegaturaUnicaEnum.NO);

  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [daA, setDaA] = useState<string>("Tutte");
  const [intervalloPagineIsValid, setIntervalloPagineIsValid] = useState<boolean | undefined>(true);

  // --- A3 specific ---
  const [layoutA3, setLayoutA3] = useState<number>(layoutA3Enum.AUTO);
  const [grammatura, setGrammatura] = useState<number>(grammaturaEnum.NORMALE);
  const [plastificazione, setPlastificazione] = useState<number>(plastificazioneEnum.SI);

  // --- costi A4 ---
  const [costiA4, setCostiA4] = useState({
    foglio: 0.03,
    biancoNero: 0.015,
    colore: 0.075,
    anelli: 1.5,
    fascetta: 1,
    ciappatura: 0.1,
    spirale: 2,
  });

  // --- costi A3 ---
  const [costiA3, setCostiA3] = useState({
    grammaturaNormale: 0.12,
    grammaturaCartoncino: 0.17,
    biancoNero: 0.03,
    colore: 0.13,
    plastificazione: 0.3,
  });

  const coloreCards = useMemo(
    () => [
      { title: "Bianco e nero", imageSrc: require("../../assets/images/Bianco_nero.png"), disabled: false, errorMessage: "" },
      { title: "Colore", imageSrc: require("../../assets/images/Colore.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const paginaCards = useMemo(
    () => [
      { title: "Fronte-retro", imageSrc: require("../../assets/images/Fronte_retro.png"), disabled: false, errorMessage: "" },
      { title: "Fronte", imageSrc: require("../../assets/images/Fronte.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const layoutA4Cards = useMemo(
    () => [
      { title: "Verticale (A4)", imageSrc: require("../../assets/images/Verticale.png"), disabled: false, errorMessage: "" },
      { title: "Orizzontale (A4)", imageSrc: require("../../assets/images/Orizzontale.png"), disabled: false, errorMessage: "" },
      { title: "2 in 1 orizzontale", imageSrc: require("../../assets/images/2in1_orizzontale.png"), disabled: false, errorMessage: "" },
      { title: "2 in 1 verticale", imageSrc: require("../../assets/images/2in1_verticale.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const grammaturaCards = useMemo(
    () => [
      { title: "Normale", imageSrc: require("../../assets/images/Grammatura_normale_A3.png"), disabled: false, errorMessage: "" },
      { title: "Cartoncino", imageSrc: require("../../assets/images/Grammatura_Cartoncino_A3.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const plastificazioneCards = useMemo(
    () => [
      { title: "Si (plastificazione)", imageSrc: require("../../assets/images/Plastificatrice_si.png"), disabled: false, errorMessage: "" },
      { title: "No (plastificazione)", imageSrc: require("../../assets/images/Plastificatrice_no.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const layoutA3Cards = useMemo(
    () => [
      { title: "Auto", imageSrc: require("../../assets/images/Layout_auto.png"), disabled: false, errorMessage: "" },
      { title: "Orizzontale (A3)", imageSrc: require("../../assets/images/Orizzontale.png"), disabled: false, errorMessage: "" },
      { title: "Verticale (A3)", imageSrc: require("../../assets/images/Verticale.png"), disabled: false, errorMessage: "" },
    ],
    []
  );

  const rilegaturaCards = useMemo(
    () => [
      { title: "Anelli", imageSrc: require("../../assets/images/Anelli.png"), disabled: numeroPaginePDF > 670 && intervalloPagine > 670, errorMessage: "Limite di 670 pagine" },
      { title: "Spirale", imageSrc: require("../../assets/images/Spirale.png"), disabled: numeroPaginePDF > 500 && intervalloPagine > 500, errorMessage: "Limite di 500 pagine" },
      { title: "Fascetta", imageSrc: require("../../assets/images/Fascetta.png"), disabled: numeroPaginePDF > 80 && intervalloPagine > 80, errorMessage: "Limite di 80 pagine" },
      { title: "Ciappatura", imageSrc: require("../../assets/images/Ciappatura.png"), disabled: numeroPaginePDF > 35 && intervalloPagine > 35, errorMessage: "Limite di 40 pagine" },
      { title: "Nessuna", imageSrc: require("../../assets/images/No_rilegatura.png"), disabled: false, errorMessage: "" },
    ],
    [numeroPaginePDF, intervalloPagine]
  );

  // ---- carico costi da Firestore (entrambi) ----
  useEffect(() => {
    const refA4 = doc(db, "configA4", "costi");
    const unsubA4 = onSnapshot(refA4, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (
        typeof d.foglio === "number" &&
        typeof d.biancoNero === "number" &&
        typeof d.colore === "number" &&
        typeof d.anelli === "number" &&
        typeof d.fascetta === "number" &&
        typeof d.ciappatura === "number" &&
        typeof d.spirale === "number"
      ) {
        setCostiA4({
          foglio: d.foglio,
          biancoNero: d.biancoNero,
          colore: d.colore,
          anelli: d.anelli,
          fascetta: d.fascetta,
          ciappatura: d.ciappatura,
          spirale: d.spirale,
        });
      }
    });

    const refA3 = doc(db, "configA3", "costi");
    const unsubA3 = onSnapshot(refA3, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (
        typeof d.grammaturaNormale === "number" &&
        typeof d.grammaturaCartoncino === "number" &&
        typeof d.biancoNero === "number" &&
        typeof d.colore === "number" &&
        typeof d.plastificazione === "number"
      ) {
        setCostiA3({
          grammaturaNormale: d.grammaturaNormale,
          grammaturaCartoncino: d.grammaturaCartoncino,
          biancoNero: d.biancoNero,
          colore: d.colore,
          plastificazione: d.plastificazione,
        });
      }
    });

    return () => {
      unsubA4();
      unsubA3();
    };
  }, []);

  // ---- blocco scroll su modali ----
  useEffect(() => {
    if (formSubmitted || formSubmitting || formError) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
  }, [formSubmitted, formSubmitting, formError]);

  // ---- login + preload user data ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);

        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const u = snap.data();
          setUserMini({
            name: u.displayName || "",
            surname: u.cognome || "",
            email: u.email || "",
            telephoneNumber: u.telefono || "",
            corsoLaurea: u.corsoLaurea || "",
            annoAccademico: u.annoAccademico || "",
          });
        } else {
          setUserMini({ name: "", surname: "", email: "", telephoneNumber: "", corsoLaurea: "", annoAccademico: "" });
        }
      } else {
        setIsLoggedIn(false);
        setUserMini({ name: "", surname: "", email: "", telephoneNumber: "", corsoLaurea: "", annoAccademico: "" });
      }
    });
    return () => unsubscribe();
  }, []);

  const setPDFHandler = useCallback((files: FileHandler[], totalPages: number) => {
    const validFiles = files.filter((f) => f.file !== null).map((f) => ({ file: f.file as File, pages: f.numPages || 0 }));
    setFileData(validFiles);
    setNumeroPDF(validFiles.length);
    setNumeroPaginePDF(totalPages);
  }, []);

  const setCopiesHandler = useCallback((value: number) => setNumeroCopie(value), []);

  const setRangePagesHandler = useCallback(
    (value: RangePagesData) => {
      if (value.all) {
        setDaA("Tutte");
        setIntervalloPagine(numeroPaginePDF ? numeroPaginePDF : 1);
        return;
      }

      setIntervalloPagineIsValid(value.isValid);
      if (!value.isValid) return;

      const from = value.from;
      const to = value.to;

      if (isNaN(from) || isNaN(to)) return;
      setDaA(`${from}-${to}`);

      let range = to - from + 1;
      if (from === 0 && to === 0) range = 0;
      setIntervalloPagine(range);
    },
    [numeroPaginePDF]
  );

  useEffect(() => {
    if (formato === formatoEnum.A4 && numeroPDF >= 2) {
      setIntervalloPagine(numeroPaginePDF || 1);
      setDaA("Tutte");
    }
  }, [formato, numeroPDF, numeroPaginePDF]);

  const handleFormatoChange = useCallback(
    (value: string) => {
      if (value === "A4") {
        setFormato(formatoEnum.A4);
        setInchiostro(inchiostroEnum.BIANCOENERO);
        setPagina(paginaEnum.FRONTE_RETRO);
        setLayoutA4(layoutA4Enum.VERTICALE);
        setRilegatura(rilegaturaEnum.ANELLI);
        setRilegaturaUnica(rilegaturaUnicaEnum.NO);
        setDaA("Tutte");
        setIntervalloPagine(numeroPaginePDF || 1);
        setIntervalloPagineIsValid(true);
      } else if (value === "A3") {
        setFormato(formatoEnum.A3);
        setInchiostro(inchiostroEnum.COLORE);
        setPagina(paginaEnum.FRONTE);
        setLayoutA3(layoutA3Enum.AUTO);
        setGrammatura(grammaturaEnum.NORMALE);
        setPlastificazione(plastificazioneEnum.SI);
      }
    },
    [numeroPaginePDF]
  );

  const newValue = useCallback(
    (value: string) => {
      switch (value) {
        case "A4":
        case "A3":
          handleFormatoChange(value);
          break;

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

        case "Verticale (A4)":
          setLayoutA4(layoutA4Enum.VERTICALE);
          break;
        case "Orizzontale (A4)":
          setLayoutA4(layoutA4Enum.ORIZZONTALE);
          break;
        case "2 in 1 orizzontale":
          setLayoutA4(layoutA4Enum.DUEPAGORIZZ);
          break;
        case "2 in 1 verticale":
          setLayoutA4(layoutA4Enum.DUEPAGVERT);
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
        case "Spirale":
          setRilegatura(rilegaturaEnum.SPIRALE);
          break;

        case "Si (rilegatura unica)":
          setRilegaturaUnica(rilegaturaUnicaEnum.SI);
          break;
        case "No (rilegatura unica)":
          setRilegaturaUnica(rilegaturaUnicaEnum.NO);
          break;

        case "Auto":
          setLayoutA3(layoutA3Enum.AUTO);
          break;
        case "Orizzontale (A3)":
          setLayoutA3(layoutA3Enum.ORIZZONTALE);
          break;
        case "Verticale (A3)":
          setLayoutA3(layoutA3Enum.VERTICALE);
          break;

        case "Normale":
          setGrammatura(grammaturaEnum.NORMALE);
          break;
        case "Cartoncino":
          setGrammatura(grammaturaEnum.CARTONCINO);
          break;

        case "Si (plastificazione)":
          setPlastificazione(plastificazioneEnum.SI);
          break;
        case "No (plastificazione)":
          setPlastificazione(plastificazioneEnum.NO);
          break;
      }
    },
    [handleFormatoChange]
  );

  const computeNFogliPerCopiaA4 = (pagineSel: number, paginaMode: number, layoutMode: number) => {
    let fogli = paginaMode === paginaEnum.FRONTE_RETRO ? Math.ceil(pagineSel / 2) : pagineSel;
    if (layoutMode === layoutA4Enum.DUEPAGORIZZ || layoutMode === layoutA4Enum.DUEPAGVERT) {
      fogli = Math.ceil(fogli / 2);
    }
    return Math.max(0, fogli);
  };

  const computeFascicoliA4 = (copie: number, rilegaturaUnicaVal: number) => {
    const isUnica = rilegaturaUnicaVal === rilegaturaUnicaEnum.SI;
    return isUnica ? 1 : Math.max(1, copie);
  };

  const computeNFogliPerCopiaA3 = (pagineTot: number, paginaMode: number) => {
    const fogli = paginaMode === paginaEnum.FRONTE_RETRO ? Math.ceil(pagineTot / 2) : pagineTot;
    return Math.max(0, fogli);
  };

  useEffect(() => {
    const calcoloPreventivoA4 = () => {
      let totale = 0;
      const pagineSel = intervalloPagine;

      const prezzoInchiostro = inchiostro === inchiostroEnum.BIANCOENERO ? costiA4.biancoNero : costiA4.colore;

      // ✅ fogli reali (interi) coerenti con computeNFogliPerCopiaA4
      const fogliPerCopia = computeNFogliPerCopiaA4(pagineSel, pagina, layoutA4);

      // ✅ costo inchiostro per *foglio*
      const costoInchiostroPerFoglio =
        pagina === paginaEnum.FRONTE_RETRO ? 2 * prezzoInchiostro : prezzoInchiostro;

      totale += fogliPerCopia * (costiA4.foglio + costoInchiostroPerFoglio);
      totale *= numeroCopie;

      const addRilegatura = (prezzo: number) => (totale += prezzo * numeroCopie);
      const addRilegaturaMultipla = (prezzo: number) => (totale += prezzo * numeroPDF * numeroCopie);

      switch (rilegatura) {
        case rilegaturaEnum.ANELLI:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? addRilegatura(costiA4.anelli)
            : addRilegaturaMultipla(costiA4.anelli);
          break;
        case rilegaturaEnum.FASCETTA:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? addRilegatura(costiA4.fascetta)
            : addRilegaturaMultipla(costiA4.fascetta);
          break;
        case rilegaturaEnum.CIAPPATURA:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? addRilegatura(costiA4.ciappatura)
            : addRilegaturaMultipla(costiA4.ciappatura);
          break;
        case rilegaturaEnum.SPIRALE:
          numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI
            ? addRilegatura(costiA4.spirale)
            : addRilegaturaMultipla(costiA4.spirale);
          break;
      }

      if (numeroCopie === 0) totale = 0;
      return totale.toFixed(2);
    };

    const calcoloPreventivoA3 = () => {
      let totale = 0;
      const pagine = numeroPaginePDF;

      const fogli = pagina === paginaEnum.FRONTE_RETRO ? Math.ceil(pagine / 2) : pagine;

      const costoFoglio = grammatura === grammaturaEnum.CARTONCINO ? costiA3.grammaturaCartoncino : costiA3.grammaturaNormale;

      const costoInchiostro = inchiostro === inchiostroEnum.COLORE ? costiA3.colore : costiA3.biancoNero;
      const inchiostroTotale = pagina === paginaEnum.FRONTE_RETRO ? 2 * costoInchiostro : costoInchiostro;

      totale += fogli * (costoFoglio + inchiostroTotale);
      totale *= numeroCopie;

      if (plastificazione === plastificazioneEnum.SI) {
        totale += costiA3.plastificazione * pagine * numeroCopie;
      }

      if (numeroCopie === 0) totale = 0;
      return totale.toFixed(2);
    };

    if (numeroPaginePDF > 0) setPreventivo(formato === formatoEnum.A4 ? calcoloPreventivoA4() : calcoloPreventivoA3());
    if (numeroPDF === 0) setPreventivo("0.00");
  }, [
    formato,
    numeroPaginePDF,
    numeroPDF,
    numeroCopie,
    inchiostro,
    pagina,
    intervalloPagine,
    layoutA4,
    rilegatura,
    rilegaturaUnica,
    costiA4,
    grammatura,
    plastificazione,
    costiA3,
  ]);

  const submitFormHandler = useCallback(
    async (arg1?: any, arg2?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      const isPaymentPayload = (o: any) => o && typeof o === "object" && "method" in o;
      const payment = isPaymentPayload(arg1) ? arg1 : undefined;
      const event = isPaymentPayload(arg1) ? arg2 : arg1;
      event?.preventDefault();

      if (!auth.currentUser) {
        setLoginModalOpen(true);
        setFormSubmitting(false);
        return;
      }

      setFormSubmitting(true);

      const isValidA4 = formato === formatoEnum.A4 ? !!intervalloPagineIsValid : true;

      if (fileData.length === 0 || !isValidA4) {
        setFormSubmitting(false);
        return;
      }

      const id = v4();

      // ✅ upload PARALLELO (molto più veloce con 2+ PDF)
      const uid = auth.currentUser.uid;
      const userLabel = sanitizeForPath(`${userMini.surname}${userMini.name}`) || uid;

      try {
        const uploadResults = await Promise.all(
          fileData.map(async ({ file }) => {
            const safeName = sanitizeForPath(file.name);
            const path = `PDF/${userLabel}|${safeName}|${id}.pdf`;

            const fileRef = ref(storage, path);
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);

            return { path, url };
          })
        );

        const paths = uploadResults.map((r) => r.path);
        const urls = uploadResults.map((r) => r.url);

        const fileLinks = urls
          .map((url, index) => {
            const pages = fileData[index].pages;
            return `- [File ${index + 1} - ${pages} pagine](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`;
          })
          .join("\n");

        const metodoPagamento = payment?.method === "PAYPAL" ? "PayPal" : payment?.method === "CASH" ? "Contanti" : "n/d";
        const statoPagamento =
          payment?.method === "PAYPAL"
            ? payment.confirmed
              ? "Pagato"
              : "Non verificato"
            : payment?.method === "CASH"
              ? "Da saldare alla consegna"
              : "Non specificato";

        const delivery = payment?.delivery;
        const totaleFinale = typeof payment?.amount === "number" ? payment.amount : Number(preventivo);

        const baseToUpload: any = {
          id,
          path: paths,
          nome: userMini.name || "",
          cognome: userMini.surname || "",
          email: userMini.email || "",
          telefono: userMini.telephoneNumber || "",
          corsoLaurea: userMini.corsoLaurea || "",
          annoAccademico: userMini.annoAccademico || "",
          file: urls,
          numeroPDF,
          copie: numeroCopie,
          prezzo: preventivo,
          timestamp: serverTimestamp(),
          uid,
          deliveryDayLabel: delivery?.dayLabel ?? undefined,
          deliveryTimeRange: delivery?.timeRange ?? undefined,
          deliveryDateISO: delivery?.dateISO ?? undefined,
          deliveryWeekday: delivery?.weekday ?? undefined,
        };

        const isA4 = formato === formatoEnum.A4;

        let nFogliPerCopia = 0;
        let nFogli = 0;
        let fascicoli: number | undefined;

        if (isA4) {
          nFogliPerCopia = computeNFogliPerCopiaA4(intervalloPagine, pagina, layoutA4);
          nFogli = nFogliPerCopia * Math.max(1, numeroCopie);
          fascicoli = computeFascicoliA4(numeroCopie, rilegaturaUnica);
        } else {
          nFogliPerCopia = computeNFogliPerCopiaA3(numeroPaginePDF, pagina);
          nFogli = nFogliPerCopia * Math.max(1, numeroCopie);
        }

        const dataToUpload = isA4
          ? {
            ...baseToUpload,
            tipo: "A4",
            colore: inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore",
            pagina: pagina === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte",
            layout:
              layoutA4 === layoutA4Enum.VERTICALE
                ? "Verticale"
                : layoutA4 === layoutA4Enum.ORIZZONTALE
                  ? "Orizzontale"
                  : layoutA4 === layoutA4Enum.DUEPAGORIZZ
                    ? "2 pagine in 1 orizzontale"
                    : "2 pagine in 1 verticale",
            rilegatura:
              rilegatura === rilegaturaEnum.ANELLI
                ? "Anelli"
                : rilegatura === rilegaturaEnum.FASCETTA
                  ? "Fascetta"
                  : rilegatura === rilegaturaEnum.CIAPPATURA
                    ? "Ciappatura"
                    : rilegatura === rilegaturaEnum.NESSUNA
                      ? "Nessuna"
                      : "Spirale",
            pagine: daA,
            rilegaturaUnica: rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO",
            nFogli,
            nFogliPerCopia,
            fascicoli,
            inchiostro: inchiostro === inchiostroEnum.COLORE ? "colore" : "biancoenero",
          }
          : {
            ...baseToUpload,
            tipo: "A3",
            grammatura: grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale",
            colore: inchiostro === inchiostroEnum.COLORE ? "Colore" : "Bianco e nero",
            pagina: pagina === paginaEnum.FRONTE ? "Fronte" : "Fronte-retro",
            layout: layoutA3 === layoutA3Enum.ORIZZONTALE ? "Orizzontale" : layoutA3 === layoutA3Enum.VERTICALE ? "Verticale" : "Auto",
            plastificazione: plastificazione === plastificazioneEnum.SI ? "Si" : "No",
            pagine: numeroPaginePDF,
            nFogli,
            nFogliPerCopia,
            inchiostro: inchiostro === inchiostroEnum.COLORE ? "colore" : "biancoenero",
            grammaturaKey: grammatura === grammaturaEnum.CARTONCINO ? "cartoncino" : "normale",
            plastificazioneKey: plastificazione === plastificazioneEnum.SI ? "si" : "no",
          };

        const targetCollection = isA4 ? "StampePDFA4" : "StampePDFA3";
        const PDFref = doc(collection(db, targetCollection), id);

        await setDoc(PDFref, dataToUpload);

        // opzionale: update users
        if (auth.currentUser) {
          await updateDoc(doc(db, "users", uid), {
            displayName: baseToUpload.nome,
            cognome: baseToUpload.cognome,
            email: baseToUpload.email,
            telefono: baseToUpload.telefono,
            corsoLaurea: baseToUpload.corsoLaurea,
            annoAccademico: baseToUpload.annoAccademico,
          });
        }

        setFormSubmitting(false);
        setFormSubmitted(true);

        const { file, path, ...rest } = dataToUpload;
        await setDoc(doc(db, "ArchivioOrdini", id), {
          ...rest,
          totaleFinale,
          metodoPagamento,
          trasporto: payment?.breakdown?.trasporto ?? 0,
          imponibile: payment?.breakdown?.imponibile ?? undefined,
          iva: payment?.breakdown?.iva ?? undefined,
          paypalFee: payment?.breakdown?.feePayPal ?? 0,
          timestamp: serverTimestamp(),
        });

        const deliveryBlock = delivery ? `\n🚚 *Consegna*: ${delivery.dayLabel} • ${delivery.timeRange}\n` : "";
        const titolo = isA4 ? "*NUOVO ORDINE A4*" : "*NUOVO ORDINE A3*";

        const dettagliSpecifici = isA4
          ? `🎨 *Colore*: ${dataToUpload.colore}
📄 *Pagina*: ${dataToUpload.pagina}
📐 *Layout*: ${dataToUpload.layout}
📒 *Rilegatura*: ${dataToUpload.rilegatura}
📒 *Rilegatura unica*: ${dataToUpload.rilegaturaUnica}
*Pagine*: ${dataToUpload.pagine}
🔢 *Copie*: ${dataToUpload.copie}`
          : `⚖ *Grammatura*: ${dataToUpload.grammatura}
🎨 *Colore*: ${dataToUpload.colore}
📄 *Pagina*: ${dataToUpload.pagina}
📐 *Layout*: ${dataToUpload.layout}
*Plastificazione*: ${dataToUpload.plastificazione}
🔢 *Copie*: ${dataToUpload.copie}`;

        const messageText = `
=====================
  ${titolo}
=====================

📝 *Dettagli Ordine:*
*Nome*: ${baseToUpload.nome || "-"}
*Cognome*: ${baseToUpload.cognome || "-"}
*Email*: ${baseToUpload.email || "-"}
*Telefono*: ${baseToUpload.telefono || "-"}
*Corso Laurea*: ${baseToUpload.corsoLaurea || "-"}
*Anno Accademico*: ${baseToUpload.annoAccademico || "-"}

📁 *Link ai file:* 📄
${fileLinks}

${dettagliSpecifici}
${deliveryBlock}
💳 *Metodo di pagamento*: ${metodoPagamento}
✅ *Stato pagamento*: ${statoPagamento}
💰 *Totale finale*: ${fmtEuro(totaleFinale)} €
`.trim();

        const safeMessageText = messageText.length > 3900 ? messageText.slice(0, 3900) + "\n\n...(troncato)" : messageText;

        const apiUrl = `https://api.telegram.org/bot${isA4 ? TOKENA4 : TOKENA3}/sendMessage`;
        const payload = { chat_id: isA4 ? CHAT_IDA4 : CHAT_IDA3, text: safeMessageText, parse_mode: "Markdown" };

        fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => { });
      } catch (e) {
        console.log(e);
        setFormError(true);
        setFormSubmitting(false);
      }
    },
    [
      formato,
      userMini,
      fileData,
      numeroPDF,
      numeroCopie,
      preventivo,
      numeroPaginePDF,
      inchiostro,
      pagina,
      layoutA4,
      rilegatura,
      rilegaturaUnica,
      intervalloPagine,
      daA,
      intervalloPagineIsValid,
      layoutA3,
      grammatura,
      plastificazione,
    ]
  );

  useEffect(() => {
    if (formSubmitted) {
      const t = setTimeout(() => window.location.reload(), 3000);
      return () => clearTimeout(t);
    }
  }, [formSubmitted]);

  const introTitle = formato === formatoEnum.A4 ? "STAMPA I TUOI DOCUMENTI A4" : "STAMPA I TUOI DOCUMENTI A3";

  const canConfirmA4 = formato === formatoEnum.A4 ? !!intervalloPagineIsValid : true;

  return (

      <Box style={{ position: "relative", zIndex: 1 }}>
        <Header />
        <Banner />

        <Modal
          opened={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
          centered
          radius="lg"
          title={
            <Group gap={10}>
              <IconLock size={18} />
              <Text fw={700}>Accesso richiesto</Text>
            </Group>
          }
        >
          <Text c="dimmed" style={{ lineHeight: 1.6 }}>
            Per inviare l’ordine devi effettuare il login.
          </Text>

          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={() => setLoginModalOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                setLoginModalOpen(false);
                navigate("/login");
              }}
            >
              Vai al login
            </Button>
          </Group>
        </Modal>

        <Intro title={introTitle} />

        <Container fluid px="xl" py="md">
          <Grid gutter="xl" align="start">
            <Grid.Col span={{ base: 12, md: 3 }}>
              <Stack gap="md">
                <MultiInput onSendData={setPDFHandler} />
                <SingleDelimiter />
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Stack gap="md">
                <FormatoPicker value={formato === formatoEnum.A4 ? "A4" : "A3"} onChange={(v) => newValue(v)} />

                <CardGridPicker
                  title="Colore:"
                  value={inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore"}
                  onChange={newValue}
                  options={coloreCards}
                />

                <CardGridPicker
                  title="Gestione pagina:"
                  value={pagina === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte"}
                  onChange={newValue}
                  options={paginaCards}
                />

                {formato === formatoEnum.A4 && (
                  <>
                    <CardGridPicker
                      title="Layout:"
                      value={
                        layoutA4 === layoutA4Enum.VERTICALE
                          ? "Verticale (A4)"
                          : layoutA4 === layoutA4Enum.ORIZZONTALE
                            ? "Orizzontale (A4)"
                            : layoutA4 === layoutA4Enum.DUEPAGORIZZ
                              ? "2 in 1 orizzontale"
                              : "2 in 1 verticale"
                      }
                      onChange={newValue}
                      options={layoutA4Cards}
                      cols={{ base: 2, md: 2, xl: 2 }}
                    />

                    <RilegaturaUnicaPicker
                      value={rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO"}
                      disabled={numeroPDF === 1}
                      disabledHint="Disponibile soltanto per 2 o più PDF"
                      onChange={(v) => newValue(v === "SI" ? "Si (rilegatura unica)" : "No (rilegatura unica)")}
                    />

                    <CardGridPicker
                      title="Rilegatura:"
                      value={
                        rilegatura === rilegaturaEnum.ANELLI
                          ? "Anelli"
                          : rilegatura === rilegaturaEnum.SPIRALE
                            ? "Spirale"
                            : rilegatura === rilegaturaEnum.FASCETTA
                              ? "Fascetta"
                              : rilegatura === rilegaturaEnum.CIAPPATURA
                                ? "Ciappatura"
                                : "Nessuna"
                      }
                      onChange={newValue}
                      options={rilegaturaCards}
                      cols={{ base: 2, md: 3, xl: 3 }}
                    />

                    <IntervalloPagine
                      onSendData={setRangePagesHandler}
                      maxValue={numeroPaginePDF}
                      disable={numeroPDF >= 2}
                      errorMessage="Disponibile soltanto per un singolo PDF"
                    />
                  </>
                )}

                {formato === formatoEnum.A3 && (
                  <>
                    <CardGridPicker
                      title="Grammatura:"
                      value={grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale"}
                      onChange={newValue}
                      options={grammaturaCards}
                      cols={{ base: 2, md: 2, xl: 2 }}
                    />

                    <CardGridPicker
                      title="Plastificazione:"
                      value={plastificazione === plastificazioneEnum.SI ? "Si (plastificazione)" : "No (plastificazione)"}
                      onChange={newValue}
                      options={plastificazioneCards}
                      cols={{ base: 2, md: 2, xl: 2 }}
                    />

                    <CardGridPicker
                      title="Layout:"
                      value={layoutA3 === layoutA3Enum.AUTO ? "Auto" : layoutA3 === layoutA3Enum.ORIZZONTALE ? "Orizzontale (A3)" : "Verticale (A3)"}
                      onChange={newValue}
                      options={layoutA3Cards}
                      cols={{ base: 2, md: 3, xl: 3 }}
                    />
                  </>
                )}

                <NumeroCopie onSendData={setCopiesHandler} />
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Box
                style={
                  isNarrow
                    ? undefined
                    : {
                      position: "sticky",
                      top: 96,
                      alignSelf: "flex-start",
                    }
                }
              >
                {formato === formatoEnum.A4 ? (
                  <RiepilogoOrdine
                    numeroPDF={numeroPDF}
                    inchiostro={inchiostro === 0 ? "Bianco e nero" : "Colore"}
                    pagina={pagina === 0 ? "Fronte-retro" : "Fronte"}
                    layout={
                      layoutA4 === 0
                        ? "Verticale"
                        : layoutA4 === 1
                          ? "Orizzontale"
                          : layoutA4 === 2
                            ? "2 pagine in 1 orizzontale"
                            : "2 pagine in 1 verticale"
                    }
                    rilegatura={rilegatura === 0 ? "Anelli" : rilegatura === 1 ? "Fascetta" : rilegatura === 2 ? "Ciappatura" : rilegatura === 3 ? "Nessuna" : "Spirale"}
                    rilegaturaUnica={rilegaturaUnica === 0 ? "Si" : "No"}
                    intervalloPagine={daA}
                    numeroCopie={numeroCopie}
                    prezzo={preventivo}
                    onConfirmOrder={submitFormHandler}
                    disabled={fileData.length === 0 || !canConfirmA4 || formSubmitting}
                    loading={formSubmitting}
                    submitted={formSubmitted}
                  />
                ) : (
                  <RiepilogoOrdineA3
                    numeroPDF={numeroPDF}
                    numeroPagine={numeroPaginePDF}
                    numeroCopie={numeroCopie}
                    grammatura={grammatura === 1 ? "Cartoncino" : "Normale"}
                    inchiostro={inchiostro === 1 ? "Colore" : "Bianco e nero"}
                    pagina={pagina === 1 ? "Fronte" : "Fronte-retro"}
                    layout={layoutA3 === 0 ? "Orizzontale" : layoutA3 === 1 ? "Verticale" : "Auto"}
                    plastificazione={plastificazione === 0 ? "Si" : "No"}
                    prezzo={preventivo}
                    onConfirmOrder={submitFormHandler}
                    disabled={fileData.length === 0 || formSubmitting}
                    loading={formSubmitting}
                    submitted={formSubmitted}
                  />
                )}
              </Box>
            </Grid.Col>
          </Grid>
        </Container>

        <Footer />
      </Box>
  );
};

export default PdfPrintPage;
