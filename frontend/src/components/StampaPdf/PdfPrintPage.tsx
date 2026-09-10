// src/pages/PdfPrintPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Accordion, Box, Card, Container, Divider, Grid, Stack, Modal, Text, Group, Button } from "@mantine/core";

import Footer from "../FooterComponents/Footer";
import Header from "../HeaderComponents/Header";
import MultiInput, { type MultiInputHandle } from "../MultiInputComponents/MultiInput";
import NumeroCopie from "../NumeroCopieComponents/NumeroCopie";
import IntervalloPagine from "../IntervalloPagineComponents/IntervalloPagine";
import RiepilogoOrdine from "../RiepilogoOrdineComponents/RiepilogoOrdine";
import RiepilogoOrdineA3 from "../RiepilogoOrdineComponents/RiepilogoOrdineA3";
import Banner from "../Banner/Banner";

import { auth, onAuthStateChanged } from "../../backend/auth";
import { api, ApiError } from "../../backend/apiClient";
import { uploadFileInChunks } from "../../utils/chunkedUpload";
import { FileHandler } from "../../types/FileHandler";
import { RangePagesData } from "../../types/RangePagesData";

import FormatoPicker from "../CardComponents/FormatoPicker";
import CardGridPicker from "../CardComponents/CardGridPicker";
import RilegaturaUnicaPicker from "../CardComponents/RilegaturaUnicaPicker";
import PlasticaColorePicker, { type PlasticaColor } from "../CardComponents/PlasticaColorePicker";

import { useNavigate } from "react-router-dom";
import { IconLock, IconAlertTriangle } from "@tabler/icons-react";

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

const rilegaturaEnumToToken = (r: number): string =>
  r === rilegaturaEnum.ANELLI
    ? "Anelli"
    : r === rilegaturaEnum.SPIRALE
      ? "Spirale"
      : r === rilegaturaEnum.FASCETTA
        ? "Fascetta"
        : r === rilegaturaEnum.CIAPPATURA
          ? "Ciappatura"
          : "Nessuna";

const rilegaturaTokenToEnum = (token: string): number => {
  switch (token) {
    case "Anelli": return rilegaturaEnum.ANELLI;
    case "Spirale": return rilegaturaEnum.SPIRALE;
    case "Fascetta": return rilegaturaEnum.FASCETTA;
    case "Ciappatura": return rilegaturaEnum.CIAPPATURA;
    default: return rilegaturaEnum.NESSUNA;
  }
};

const layoutA4TokenToEnum = (token: string): number => {
  switch (token) {
    case "Verticale (A4)": return layoutA4Enum.VERTICALE;
    case "Orizzontale (A4)": return layoutA4Enum.ORIZZONTALE;
    case "2 in 1 orizzontale": return layoutA4Enum.DUEPAGORIZZ;
    case "2 in 1 verticale": return layoutA4Enum.DUEPAGVERT;
    default: return layoutA4Enum.VERTICALE;
  }
};

const inchiostroToToken = (v: number): string => (v === inchiostroEnum.COLORE ? "colore" : "biancoenero");
const paginaToToken = (v: number): string => (v === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte");
const layoutA4ToToken = (v: number): string =>
  v === layoutA4Enum.VERTICALE
    ? "Verticale"
    : v === layoutA4Enum.ORIZZONTALE
      ? "Orizzontale"
      : v === layoutA4Enum.DUEPAGORIZZ
        ? "2 pagine in 1 orizzontale"
        : "2 pagine in 1 verticale";

const RILEGATURA_LIMITI: { enumVal: number; max: number; label: string }[] = [
  { enumVal: rilegaturaEnum.ANELLI, max: 670, label: "Limite di 670 pagine" },
  { enumVal: rilegaturaEnum.SPIRALE, max: 500, label: "Limite di 500 pagine" },
  { enumVal: rilegaturaEnum.FASCETTA, max: 80, label: "Limite di 80 pagine" },
  { enumVal: rilegaturaEnum.CIAPPATURA, max: 35, label: "Limite di 40 pagine" },
];

// A3
const plastificazioneEnum = { SI: 0, NO: 1 };
const layoutA3Enum = { ORIZZONTALE: 0, VERTICALE: 1, AUTO: 2 };
const grammaturaEnum = { NORMALE: 0, CARTONCINO: 1 };

// ---- Plastiche (da gestionale) ----
type PlasticaDocItem = {
  id: string;
  name: string;
  hex: string;
  priceEuro: number;
  enabled: boolean;
  order: number;
};

const isValidHex = (hex: string) => /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test((hex || "").trim());

/** Impostazioni di stampa di un singolo file: usate solo quando la rilegatura e' separata (2+ PDF). */
type FileSettings = {
  inchiostro: number;
  pagina: number;
  layoutA4: number;
  rilegatura: number;
  plastica: PlasticaColor | null;
  rangeAll: boolean;
  rangeFrom?: number;
  rangeTo?: number;
  rangeValid: boolean;
  numeroCopie: number;
};

const FONT_DISPLAY = "'Oswald', sans-serif";

/**
 * Icone delle opzioni di stampa: SVG in linea al posto delle vecchie PNG (alcune erano immagini
 * vuote/rotte). Stile coerente con le icone Tabler già usate nel resto dell'app: tratto sottile,
 * colore oro chiaro su sfondo scuro.
 */
const OPT_ICON_STROKE = "#f0d9a8";

const IconOptBiancoNero = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={OPT_ICON_STROKE} strokeWidth="1.6" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill={OPT_ICON_STROKE} />
  </svg>
);

const IconOptColore = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <circle cx="9.5" cy="10" r="2" fill="#e0574f" stroke="none" />
    <circle cx="14.5" cy="10" r="2" fill="#4f8fe0" stroke="none" />
    <circle cx="12" cy="14.5" r="2" fill="#e0c93f" stroke="none" />
  </svg>
);

const IconOptFronte = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.5" />
  </svg>
);

const IconOptFronteRetro = () => (
  <svg width="24" height="22" viewBox="0 0 24 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="8" y="1" width="14" height="20" rx="1.5" opacity=".45" />
    <rect x="2" y="5" width="14" height="16" rx="1.5" />
  </svg>
);

const IconOptLayoutVert = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.8" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.5" />
  </svg>
);

const IconOptLayoutOrizz = () => (
  <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.8" strokeLinejoin="round">
    <rect x="1" y="2" width="20" height="14" rx="1.5" />
  </svg>
);

const IconOpt2UpOrizz = () => (
  <svg width="24" height="16" viewBox="0 0 24 16" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="1" y="1" width="10" height="14" rx="1.2" />
    <rect x="13" y="1" width="10" height="14" rx="1.2" />
  </svg>
);

const IconOpt2UpVert = () => (
  <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="1" y="1" width="14" height="10" rx="1.2" />
    <rect x="1" y="13" width="14" height="10" rx="1.2" />
  </svg>
);

const IconOptAnelli = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="6" y="1" width="13" height="20" rx="1.5" />
    <circle cx="2" cy="5" r="1.3" fill={OPT_ICON_STROKE} stroke="none" />
    <circle cx="2" cy="11" r="1.3" fill={OPT_ICON_STROKE} stroke="none" />
    <circle cx="2" cy="17" r="1.3" fill={OPT_ICON_STROKE} stroke="none" />
  </svg>
);

const IconOptSpirale = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.5" strokeLinejoin="round">
    <rect x="7" y="1" width="12" height="20" rx="1.5" />
    <path d="M3 1.5c2 1 2 2.2 0 3.2s-2 2.2 0 3.2s2 2.2 0 3.2s-2 2.2 0 3.2s2 2.2 0 3.2s-2 2.2 0 3.2" strokeLinecap="round" />
  </svg>
);

const IconOptFascetta = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="16" height="20" rx="1.5" />
    <rect x="0" y="9.5" width="20" height="3.5" rx="1" fill={OPT_ICON_STROKE} stroke="none" opacity=".9" />
  </svg>
);

const IconOptCiappatura = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="16" height="20" rx="1.5" />
    <path d="M4.5 3.5h4.5M6.75 1.25v4.5" strokeLinecap="round" />
  </svg>
);

const IconOptNessuna = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.5" />
  </svg>
);

const IconOptGrammaturaNormale = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.2" />
  </svg>
);

const IconOptGrammaturaCartoncino = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="4" y="3" width="14" height="18" rx="1.2" opacity=".4" />
    <rect x="2" y="1" width="14" height="18" rx="1.2" />
  </svg>
);

const IconOptPlastificaSi = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.2" />
    <path d="M5 15l3-10M9.5 17l3-13" strokeWidth="1.2" opacity=".7" strokeLinecap="round" />
  </svg>
);

const IconOptPlastificaNo = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.6" strokeLinejoin="round">
    <rect x="2" y="1" width="14" height="20" rx="1.2" />
  </svg>
);

const IconOptAuto = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={OPT_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
  </svg>
);

/** Un blocco del percorso guidato: cerchio numerato + titolo + contenuto. */
const StepSection: React.FC<{ number: number; title: string; description?: string; children: React.ReactNode }> = ({
  number,
  title,
  description,
  children,
}) => (
  <Box style={{ display: "flex", gap: 24 }}>
    <Box
      style={{
        position: "relative",
        zIndex: 1,
        width: 40,
        height: 40,
        borderRadius: 999,
        background: "#10141c",
        border: "2px solid #d4af6a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: FONT_DISPLAY,
        fontWeight: 700,
        fontSize: 15,
        color: "#f0d9a8",
      }}
    >
      {number}
    </Box>
    <Box style={{ flex: 1, paddingTop: 6, minWidth: 0 }}>
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: 20,
          color: "#ffffff",
          textTransform: "uppercase",
          letterSpacing: ".02em",
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 13.5, color: "rgba(255,255,255,.55)", marginBottom: 20 }}>{description}</Text>
      )}
      <Card
        withBorder
        radius="lg"
        p="lg"
        style={{ background: "#ffffff", borderColor: "rgba(16,20,28,.10)", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}
      >
        <Stack gap="lg">{children}</Stack>
      </Card>
    </Box>
  </Box>
);

/** Una sotto-sezione dentro il pannello di uno step: etichetta discreta + controllo, separate da un divider. */
const OptionGroup: React.FC<{ label?: string; hint?: string; children: React.ReactNode; first?: boolean }> = ({
  label,
  hint,
  children,
  first = false,
}) => (
  <>
    {!first && <Divider color="rgba(16,20,28,.08)" />}
    <Box>
      {label && (
        <Group justify="space-between" align="baseline" mb={10}>
          <Text fw={800} tt="uppercase" style={{ letterSpacing: ".03em", fontSize: 12.5, color: "#10141c" }}>
            {label}
          </Text>
          {hint && (
            <Text size="xs" fw={600} style={{ color: "rgba(16,20,28,.45)" }}>
              {hint}
            </Text>
          )}
        </Group>
      )}
      {children}
    </Box>
  </>
);

const PdfPrintPage = () => {

  const navigate = useNavigate();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // --- drag&drop dei PDF su tutta la pagina, non solo sul riquadro di upload ---
  const multiInputRef = useRef<MultiInputHandle>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  const handlePageDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  }, []);

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault(); // necessario per permettere il drop
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFile(false);
  }, []);

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length) multiInputRef.current?.addFiles(dropped);
  }, []);

  // --- stato base condiviso ---
  const [formato, setFormato] = useState<number>(formatoEnum.A4);

  const [fileData, setFileData] = useState<{ file: File; pages: number }[]>([]);
  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [numeroPDF, setNumeroPDF] = useState<number>(0);

  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");

  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string>("");
  const [, setIsLoggedIn] = useState(false);

  // --- opzioni comuni (inchiostro/pagina) ---
  const [inchiostro, setInchiostro] = useState<number>(inchiostroEnum.BIANCOENERO);
  const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE_RETRO);

  // --- A4 specific ---
  const [layoutA4, setLayoutA4] = useState<number>(layoutA4Enum.VERTICALE);
  const [rilegatura, setRilegatura] = useState<number>(rilegaturaEnum.ANELLI);
  const [rilegaturaUnica, setRilegaturaUnica] = useState<number>(rilegaturaUnicaEnum.NO);

  // impostazioni per singolo file: usate solo quando rilegaturaUnica = NO e ci sono 2+ PDF.
  // ogni file e' un fascicolo a se' stante: colore, gestione pagina, layout, rilegatura, plastica,
  // intervallo pagine e copie possono essere tutte diverse da un file all'altro.
  const [fileSettings, setFileSettings] = useState<Record<number, FileSettings>>({});

  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [daA, setDaA] = useState<string>("Tutte");
  const [intervalloPagineIsValid, setIntervalloPagineIsValid] = useState<boolean | undefined>(true);
  // ✅ range esplicito (from/to) inviato al backend: il totale/pagine reali vengono ricalcolati server-side
  const [rangeAll, setRangeAllState] = useState<boolean>(true);
  const [rangeFrom, setRangeFrom] = useState<number | undefined>(undefined);
  const [rangeTo, setRangeTo] = useState<number | undefined>(undefined);

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

  // --- Plastiche A4 (da gestionale) ---
  const [plasticaOptions, setPlasticaOptions] = useState<PlasticaColor[]>([]);
  const [plasticaPriceMap, setPlasticaPriceMap] = useState<Record<string, number>>({});
  const [plasticheLoaded, setPlasticheLoaded] = useState(false);

  // selezione singola: 1 PDF oppure rilegatura unica
  const [plasticaSelectedSingle, setPlasticaSelectedSingle] = useState<PlasticaColor | null>(null);

  // ✅ Regola: se rilegatura è CIAPPATURA o NESSUNA, non permettere plastiche colorate
  // (solo per il percorso "rilegatura unica": col percorso per-file la regola si applica singolarmente a ogni file)
  const plasticaDisabled = useMemo(() => {
    const unica = numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI;
    return (
      formato === formatoEnum.A4 &&
      unica &&
      (rilegatura === rilegaturaEnum.CIAPPATURA || rilegatura === rilegaturaEnum.NESSUNA)
    );
  }, [formato, rilegatura, numeroPDF, rilegaturaUnica]);

  const rilegaturaVietaPlastica = useCallback(
    (r: number) => r === rilegaturaEnum.CIAPPATURA || r === rilegaturaEnum.NESSUNA,
    []
  );

  // ✅ quando diventa disabilitato, resetto selezioni plastiche
  useEffect(() => {
    if (!plasticaDisabled) return;
    setPlasticaSelectedSingle(null);
  }, [plasticaDisabled]);

  const coloreCards = useMemo(
    () => [
      { title: "Bianco e nero", icon: <IconOptBiancoNero />, disabled: false, errorMessage: "" },
      { title: "Colore", icon: <IconOptColore />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const paginaCards = useMemo(
    () => [
      { title: "Fronte-retro", icon: <IconOptFronteRetro />, disabled: false, errorMessage: "" },
      { title: "Fronte", icon: <IconOptFronte />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const layoutA4Cards = useMemo(
    () => [
      { title: "Verticale (A4)", icon: <IconOptLayoutVert />, disabled: false, errorMessage: "" },
      { title: "Orizzontale (A4)", icon: <IconOptLayoutOrizz />, disabled: false, errorMessage: "" },
      { title: "2 in 1 orizzontale", icon: <IconOpt2UpOrizz />, disabled: false, errorMessage: "" },
      { title: "2 in 1 verticale", icon: <IconOpt2UpVert />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const grammaturaCards = useMemo(
    () => [
      { title: "Normale", icon: <IconOptGrammaturaNormale />, disabled: false, errorMessage: "" },
      { title: "Cartoncino", icon: <IconOptGrammaturaCartoncino />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const plastificazioneCards = useMemo(
    () => [
      { title: "Si (plastificazione)", icon: <IconOptPlastificaSi />, disabled: false, errorMessage: "" },
      { title: "No (plastificazione)", icon: <IconOptPlastificaNo />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const layoutA3Cards = useMemo(
    () => [
      { title: "Auto", icon: <IconOptAuto />, disabled: false, errorMessage: "" },
      { title: "Orizzontale (A3)", icon: <IconOptLayoutOrizz />, disabled: false, errorMessage: "" },
      { title: "Verticale (A3)", icon: <IconOptLayoutVert />, disabled: false, errorMessage: "" },
    ],
    []
  );

  const rilegaturaCards = useMemo(
    () => [
      { title: "Anelli", icon: <IconOptAnelli />, disabled: numeroPaginePDF > 670 && intervalloPagine > 670, errorMessage: "Limite di 670 pagine" },
      { title: "Spirale", icon: <IconOptSpirale />, disabled: numeroPaginePDF > 500 && intervalloPagine > 500, errorMessage: "Limite di 500 pagine" },
      { title: "Fascetta", icon: <IconOptFascetta />, disabled: numeroPaginePDF > 80 && intervalloPagine > 80, errorMessage: "Limite di 80 pagine" },
      { title: "Ciappatura", icon: <IconOptCiappatura />, disabled: numeroPaginePDF > 35 && intervalloPagine > 35, errorMessage: "Limite di 40 pagine" },
      { title: "Nessuna", icon: <IconOptNessuna />, disabled: false, errorMessage: "" },
    ],
    [numeroPaginePDF, intervalloPagine]
  );

  const RILEGATURA_ICONS: Record<number, React.ReactNode> = {
    [rilegaturaEnum.ANELLI]: <IconOptAnelli />,
    [rilegaturaEnum.SPIRALE]: <IconOptSpirale />,
    [rilegaturaEnum.FASCETTA]: <IconOptFascetta />,
    [rilegaturaEnum.CIAPPATURA]: <IconOptCiappatura />,
    [rilegaturaEnum.NESSUNA]: <IconOptNessuna />,
  };

  // rilegatura per-file: ogni file stampato per intero, quindi il limite si valuta sulle sue sole pagine
  const buildRilegaturaCardsForFile = useCallback((pages: number) => {
    return RILEGATURA_LIMITI.map((r) => ({
      title: rilegaturaEnumToToken(r.enumVal),
      icon: RILEGATURA_ICONS[r.enumVal],
      disabled: pages > r.max,
      errorMessage: r.label,
    })).concat([
      { title: "Nessuna", icon: RILEGATURA_ICONS[rilegaturaEnum.NESSUNA], disabled: false, errorMessage: "" },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- carico i costi di vendita (pubblici) dal backend: il totale finale viene comunque
  // ricalcolato e verificato server-side alla creazione dell'ordine ----
  useEffect(() => {
    let alive = true;

    api.get<any>("/api/public/pricing-a4", { auth: false }).then((d) => {
      if (!alive || !d) return;
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
    }).catch(() => {});

    api.get<any>("/api/public/pricing-a3", { auth: false }).then((d) => {
      if (!alive || !d) return;
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
    }).catch(() => {});

    return () => { alive = false; };
  }, []);

  // ---- carico plastiche (A4) dal backend ----
  useEffect(() => {
    let alive = true;

    api.get<any[]>("/api/public/plastiche", { auth: false })
      .then((items) => {
        if (!alive) return;

        const cleaned: PlasticaDocItem[] = (items || [])
          .filter((c) => c && c.id != null)
          .map((c) => {
            const id = String(c.id);
            const name = typeof c.name === "string" ? c.name : id;
            const hex = typeof c.hex === "string" && isValidHex(c.hex) ? c.hex : "#cbd5e1";
            const priceEuro = typeof c.priceEuro === "number" ? c.priceEuro : 0;
            const enabled = typeof c.enabled === "boolean" ? c.enabled : true;
            const order = typeof c.sortOrder === "number" ? c.sortOrder : 0;

            return {
              id,
              name,
              hex,
              priceEuro,
              enabled,
              order,
              description: priceEuro > 0 ? `Extra ${fmtEuro(priceEuro)} €` : undefined,
              disabled: !enabled,
            } as unknown as PlasticaDocItem;
          })
          .sort((a: any, b: any) => a.order - b.order);

        const priceMap: Record<string, number> = {};
        (cleaned as any[]).forEach((x) => (priceMap[x.id] = Number(x.priceEuro || 0)));
        setPlasticaPriceMap(priceMap);

        const pickerOptions: PlasticaColor[] = (cleaned as any[]).map((x) => ({
          id: x.id,
          name: x.name,
          hex: x.hex,
          description: x.description,
          disabled: x.disabled,
        }));
        setPlasticaOptions(pickerOptions);

        // se selezioni attuali non esistono più o sono disabled -> reset
        setPlasticaSelectedSingle((prev) => {
          if (!prev) return null;
          const found = (cleaned as any[]).find((x) => x.id === prev.id);
          if (!found || found.disabled) return null;
          return { id: found.id, name: found.name, hex: found.hex, description: found.description, disabled: found.disabled };
        });

        setFileSettings((prev) => {
          const next: Record<number, FileSettings> = { ...prev };
          Object.keys(next).forEach((k) => {
            const idx = Number(k);
            const c = next[idx].plastica;
            if (!c) return;
            const found = (cleaned as any[]).find((x) => x.id === c.id);
            if (!found || found.disabled) next[idx] = { ...next[idx], plastica: null };
          });
          return next;
        });

        setPlasticheLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setPlasticaOptions([]);
        setPlasticaPriceMap({});
        setPlasticaSelectedSingle(null);
        setPlasticheLoaded(true);
      });

    return () => { alive = false; };
  }, []);

  // ---- normalizzo le impostazioni per-file in base a numeroPDF / rilegaturaUnica / fileData:
  // quando la rilegatura e' separata (2+ PDF, NO), ogni file ha le proprie impostazioni indipendenti,
  // inizializzate a partire dai valori globali correnti; altrimenti la mappa resta vuota (non usata) ----
  useEffect(() => {
    if (numeroPDF === 0 || numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI) {
      setFileSettings({});
      return;
    }

    setFileSettings((prev) => {
      const next: Record<number, FileSettings> = { ...prev };

      for (let i = 0; i < fileData.length; i++) {
        if (!(i in next)) {
          next[i] = {
            inchiostro,
            pagina,
            layoutA4,
            rilegatura,
            plastica: null,
            rangeAll: true,
            rangeFrom: undefined,
            rangeTo: undefined,
            rangeValid: true,
            numeroCopie: 1,
          };
        }
      }

      Object.keys(next).forEach((k) => {
        const idx = Number(k);
        if (!Number.isFinite(idx) || idx < 0 || idx >= fileData.length) delete next[idx];
      });

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPDF, rilegaturaUnica, fileData.length]);
  // ---- blocco scroll su modali ----
  useEffect(() => {
    if (formSubmitted || formSubmitting || formError) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
  }, [formSubmitted, formSubmitting, formError]);

  // ---- login state (i dati del profilo vengono letti server-side alla creazione dell'ordine) ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
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

  // aggiorna una o più impostazioni di un singolo file (rilegatura separata)
  const updateFileSetting = useCallback((idx: number, patch: Partial<FileSettings>) => {
    setFileSettings((prev) => {
      const current = prev[idx];
      if (!current) return prev;
      return { ...prev, [idx]: { ...current, ...patch } };
    });
  }, []);

  const updateFileRange = useCallback((idx: number, value: RangePagesData) => {
    setFileSettings((prev) => {
      const current = prev[idx];
      if (!current) return prev;
      if (value.all) {
        return { ...prev, [idx]: { ...current, rangeAll: true, rangeFrom: undefined, rangeTo: undefined, rangeValid: true } };
      }
      return { ...prev, [idx]: { ...current, rangeAll: false, rangeFrom: value.from, rangeTo: value.to, rangeValid: value.isValid === true } };
    });
  }, []);

  const setRangePagesHandler = useCallback(
    (value: RangePagesData) => {
      if (value.all) {
        setDaA("Tutte");
        setIntervalloPagine(numeroPaginePDF ? numeroPaginePDF : 1);
        setRangeAllState(true);
        setRangeFrom(undefined);
        setRangeTo(undefined);
        return;
      }

      setIntervalloPagineIsValid(value.isValid);
      if (!value.isValid) return;

      const from = value.from;
      const to = value.to;

      if (isNaN(from) || isNaN(to)) return;
      setDaA(`${from}-${to}`);
      setRangeAllState(false);
      setRangeFrom(from);
      setRangeTo(to);

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
      setRangeAllState(true);
      setRangeFrom(undefined);
      setRangeTo(undefined);
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
        setRangeAllState(true);
        setRangeFrom(undefined);
        setRangeTo(undefined);
        // reset plastiche
        setPlasticaSelectedSingle(null);
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

  // ---- helper: extra plastica totale (per 1 copia) ----
  const isRilegaturaUnicaA4 = numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI;

  const prezzoRilegaturaFor = useCallback(
    (r: number) => {
      switch (r) {
        case rilegaturaEnum.ANELLI: return costiA4.anelli;
        case rilegaturaEnum.FASCETTA: return costiA4.fascetta;
        case rilegaturaEnum.CIAPPATURA: return costiA4.ciappatura;
        case rilegaturaEnum.SPIRALE: return costiA4.spirale;
        default: return 0;
      }
    },
    [costiA4]
  );

  const computeExtraPlasticaPerCopia = useCallback(() => {
    if (formato !== formatoEnum.A4) return 0;

    // 1 pdf o rilegatura unica => 1 sola plastica, ammessa solo se la rilegatura unica lo consente
    if (isRilegaturaUnicaA4) {
      if (rilegaturaVietaPlastica(rilegatura)) return 0;
      if (!plasticaSelectedSingle) return 0;
      return plasticaPriceMap[plasticaSelectedSingle.id] ?? 0;
    }

    // 2+ pdf e non unica => 1 plastica per file, ammessa solo se la rilegatura di QUEL file lo consente
    let sum = 0;
    for (let i = 0; i < fileData.length; i++) {
      const s = fileSettings[i];
      if (!s || rilegaturaVietaPlastica(s.rilegatura)) continue;
      if (!s.plastica) continue;
      sum += plasticaPriceMap[s.plastica.id] ?? 0;
    }
    return sum;
  }, [
    formato,
    isRilegaturaUnicaA4,
    rilegatura,
    fileSettings,
    rilegaturaVietaPlastica,
    plasticaSelectedSingle,
    plasticaPriceMap,
    fileData.length,
  ]);

  const plasticheExtraEuro = useMemo(() => {
    if (formato !== formatoEnum.A4) return undefined;

    const extraPerCopia = computeExtraPlasticaPerCopia();
    const tot = isRilegaturaUnicaA4
      ? extraPerCopia * Math.max(0, numeroCopie)
      : fileData.reduce((sum, _, i) => {
          const s = fileSettings[i];
          if (!s || !s.plastica || rilegaturaVietaPlastica(s.rilegatura)) return sum;
          return sum + (plasticaPriceMap[s.plastica.id] ?? 0) * Math.max(0, s.numeroCopie);
        }, 0);
    return tot > 0 ? tot : undefined;
  }, [formato, computeExtraPlasticaPerCopia, isRilegaturaUnicaA4, numeroCopie, fileData, fileSettings, plasticaPriceMap, rilegaturaVietaPlastica]);

  const plasticheLabel = useMemo(() => {
    if (formato !== formatoEnum.A4) return undefined;

    if (isRilegaturaUnicaA4) {
      if (rilegaturaVietaPlastica(rilegatura)) return undefined;
      const c = plasticaSelectedSingle;
      if (!c) return undefined;
      const extra = plasticaPriceMap[c.id] ?? 0;
      return `Copertina: ${c.name}${extra > 0 ? ` (+${fmtEuro(extra)} €)` : ""}`;
    }

    const parts: string[] = [];
    for (let i = 0; i < fileData.length; i++) {
      const c = fileSettings[i]?.plastica;
      if (!c) continue;
      const extra = plasticaPriceMap[c.id] ?? 0;
      parts.push(`File ${i + 1}: ${c.name}${extra > 0 ? ` (+${fmtEuro(extra)} €)` : ""}`);
    }
    return parts.length ? parts.join(" • ") : undefined;
  }, [
    formato,
    isRilegaturaUnicaA4,
    rilegatura,
    rilegaturaVietaPlastica,
    plasticaSelectedSingle,
    fileSettings,
    plasticaPriceMap,
    fileData.length,
  ]);

  // etichette per il riepilogo: valore singolo se unica, elenco "File N: valore" per file se separata
  const rilegaturaLabel = useMemo(() => {
    if (isRilegaturaUnicaA4) return rilegaturaEnumToToken(rilegatura);
    if (fileData.length === 0) return rilegaturaEnumToToken(rilegatura);
    return fileData.map((_, i) => `File ${i + 1}: ${rilegaturaEnumToToken(fileSettings[i]?.rilegatura ?? rilegatura)}`).join(" • ");
  }, [isRilegaturaUnicaA4, rilegatura, fileSettings, fileData]);

  const coloreLabel = useMemo(() => {
    const label = (v: number) => (v === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore");
    if (isRilegaturaUnicaA4 || fileData.length === 0) return label(inchiostro);
    return fileData.map((_, i) => `File ${i + 1}: ${label(fileSettings[i]?.inchiostro ?? inchiostro)}`).join(" • ");
  }, [isRilegaturaUnicaA4, inchiostro, fileSettings, fileData]);

  const paginaLabel = useMemo(() => {
    const label = (v: number) => (v === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte");
    if (isRilegaturaUnicaA4 || fileData.length === 0) return label(pagina);
    return fileData.map((_, i) => `File ${i + 1}: ${label(fileSettings[i]?.pagina ?? pagina)}`).join(" • ");
  }, [isRilegaturaUnicaA4, pagina, fileSettings, fileData]);

  const layoutLabel = useMemo(() => {
    const label = (v: number) =>
      v === layoutA4Enum.VERTICALE
        ? "Verticale"
        : v === layoutA4Enum.ORIZZONTALE
          ? "Orizzontale"
          : v === layoutA4Enum.DUEPAGORIZZ
            ? "2 pagine in 1 orizzontale"
            : "2 pagine in 1 verticale";
    if (isRilegaturaUnicaA4 || fileData.length === 0) return label(layoutA4);
    return fileData.map((_, i) => `File ${i + 1}: ${label(fileSettings[i]?.layoutA4 ?? layoutA4)}`).join(" • ");
  }, [isRilegaturaUnicaA4, layoutA4, fileSettings, fileData]);

  const intervalloLabel = useMemo(() => {
    if (isRilegaturaUnicaA4 || fileData.length === 0) return daA;
    return fileData
      .map((f, i) => {
        const s = fileSettings[i];
        const label = !s || s.rangeAll ? "Tutte" : `${s.rangeFrom}-${s.rangeTo}`;
        return `File ${i + 1}: ${label}`;
      })
      .join(" • ");
  }, [isRilegaturaUnicaA4, daA, fileSettings, fileData]);

  const numeroCopieLabel = useMemo(() => {
    if (isRilegaturaUnicaA4 || fileData.length === 0) return numeroCopie;
    return fileData.reduce((sum, _, i) => sum + Math.max(0, fileSettings[i]?.numeroCopie ?? 0), 0);
  }, [isRilegaturaUnicaA4, numeroCopie, fileSettings, fileData]);

  useEffect(() => {
    const calcoloPreventivoA4 = () => {
      // rilegatura separata: ogni file e' un fascicolo a se' stante con le proprie impostazioni
      // (colore, fronte/retro, layout, rilegatura, plastica, intervallo pagine, copie), quindi il
      // costo si calcola e si somma indipendentemente per ciascuno invece di un unico calcolo
      // condiviso moltiplicato per un numeroCopie comune a tutto l'ordine.
      if (!(numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI)) {
        let totaleSeparata = 0;
        for (let i = 0; i < fileData.length; i++) {
          const s = fileSettings[i];
          if (!s) continue;

          const pagineSel = s.rangeAll ? fileData[i].pages : Math.max(0, (s.rangeTo ?? 0) - (s.rangeFrom ?? 0) + 1);
          const fogliPerCopia = computeNFogliPerCopiaA4(pagineSel, s.pagina, s.layoutA4);
          const prezzoInchiostro = s.inchiostro === inchiostroEnum.BIANCOENERO ? costiA4.biancoNero : costiA4.colore;
          const costoInchiostroPerFoglio = s.pagina === paginaEnum.FRONTE_RETRO ? 2 * prezzoInchiostro : prezzoInchiostro;

          let perCopia = fogliPerCopia * (costiA4.foglio + costoInchiostroPerFoglio);
          perCopia += prezzoRilegaturaFor(s.rilegatura);
          if (!rilegaturaVietaPlastica(s.rilegatura) && s.plastica) {
            perCopia += plasticaPriceMap[s.plastica.id] ?? 0;
          }

          totaleSeparata += perCopia * Math.max(0, s.numeroCopie);
        }
        return totaleSeparata.toFixed(2);
      }

      let totale = 0;
      const pagineSel = intervalloPagine;

      const prezzoInchiostro = inchiostro === inchiostroEnum.BIANCOENERO ? costiA4.biancoNero : costiA4.colore;
      const fogliPerCopia = computeNFogliPerCopiaA4(pagineSel, pagina, layoutA4);
      const costoInchiostroPerFoglio = pagina === paginaEnum.FRONTE_RETRO ? 2 * prezzoInchiostro : prezzoInchiostro;

      totale += fogliPerCopia * (costiA4.foglio + costoInchiostroPerFoglio);
      totale *= numeroCopie;

      totale += prezzoRilegaturaFor(rilegatura) * numeroCopie;

      // ✅ EXTRA plastica: una per copia, poi * copie (computeExtraPlasticaPerCopia già ritorna 0 per CIAPPATURA/NESSUNA)
      const extraPlasticaPerCopia = computeExtraPlasticaPerCopia();
      if (extraPlasticaPerCopia > 0) {
        totale += extraPlasticaPerCopia * numeroCopie;
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
    fileSettings,
    fileData,
    costiA4,
    grammatura,
    plastificazione,
    costiA3,
    computeExtraPlasticaPerCopia,
    prezzoRilegaturaFor,
    rilegaturaVietaPlastica,
    plasticaPriceMap,
  ]);

  const uploadOwner = useRef<string | null>(null);
  const uploadedPaths = useRef(new WeakMap<File, string>());
  const orderAttempt = useRef<{ signature: string; requestId: string } | null>(null);

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

      if (uploadOwner.current !== auth.currentUser.uid) {
        uploadOwner.current = auth.currentUser.uid;
        uploadedPaths.current = new WeakMap();
        orderAttempt.current = null;
      }
      if (payment?.method === "PAYPAL" && payment.confirmed) {
        setFormSubmitting(false);
        setFormSubmitted(true);
        return;
      }
      setFormSubmitting(true);

      const isValidA4 =
        formato === formatoEnum.A4
          ? !!intervalloPagineIsValid && Object.values(fileSettings).every((s) => s.rangeValid)
          : true;

      if (fileData.length === 0 || !isValidA4) {
        setFormSubmitting(false);
        return;
      }

      const isA4 = formato === formatoEnum.A4;

      try {
        // ---- upload a chunk, un file alla volta: piu' robusto su rete lenta di un upload unico ----
        const uploadedFiles: { storagePath: string; originalFileName: string }[] = [];
        try {
          for (const f of fileData) {
            const storagePath = uploadedPaths.current.get(f.file) ?? await uploadFileInChunks(f.file);
            uploadedPaths.current.set(f.file, storagePath);
            uploadedFiles.push({ storagePath, originalFileName: f.file.name });
          }
        } catch (uploadErr) {
          console.error("Upload fallito:", uploadErr);
          throw new Error(
            "Caricamento del PDF non riuscito. Controlla la connessione e riprova (per i file di grandi dimensioni serve una rete stabile)."
          );
        }

        const unicaA4 = numeroPDF === 1 || rilegaturaUnica === rilegaturaUnicaEnum.SI;

        // ✅ plastica permessa solo se la rilegatura unica lo consente (percorso unica)
        const singlePlasticaId =
          isA4 && unicaA4 && !rilegaturaVietaPlastica(rilegatura) && plasticaSelectedSingle
            ? Number(plasticaSelectedSingle.id)
            : undefined;

        const files = uploadedFiles.map((f, idx) => {
          if (!isA4 || unicaA4) {
            return {
              storagePath: f.storagePath,
              originalFileName: f.originalFileName,
              pages: fileData[idx].pages,
              plasticaId: undefined,
              rilegatura: undefined,
            };
          }

          // rilegatura separata: ogni file porta la propria configurazione completa
          const s = fileSettings[idx];
          const rFile = s?.rilegatura ?? rilegatura;
          const plasticaId = s && !rilegaturaVietaPlastica(rFile) && s.plastica ? Number(s.plastica.id) : undefined;

          return {
            storagePath: f.storagePath,
            originalFileName: f.originalFileName,
            pages: fileData[idx].pages,
            plasticaId,
            rilegatura: rilegaturaEnumToToken(rFile),
            inchiostro: inchiostroToToken(s?.inchiostro ?? inchiostro),
            pagina: paginaToToken(s?.pagina ?? pagina),
            layout: layoutA4ToToken(s?.layoutA4 ?? layoutA4),
            rangeAll: s?.rangeAll ?? true,
            rangeFrom: s && !s.rangeAll ? s.rangeFrom : undefined,
            rangeTo: s && !s.rangeAll ? s.rangeTo : undefined,
            numeroCopie: s?.numeroCopie ?? 1,
          };
        });

        const delivery = payment?.delivery;

        const paginaToken = paginaToToken(pagina);
        const rilegaturaToken = rilegaturaEnumToToken(rilegatura);
        const layoutToken = isA4
          ? layoutA4ToToken(layoutA4)
          : layoutA3 === layoutA3Enum.ORIZZONTALE
            ? "Orizzontale"
            : layoutA3 === layoutA3Enum.VERTICALE
              ? "Verticale"
              : "Auto";

        const numeroCopieTopLevel = isA4 && !unicaA4
          ? fileData.reduce((sum, _, i) => sum + Math.max(0, fileSettings[i]?.numeroCopie ?? 1), 0)
          : numeroCopie;

        const orderRequest = {
          tipo: isA4 ? "A4" : "A3",
          files,
          numeroPDF,
          numeroCopie: numeroCopieTopLevel,
          rangeAll: isA4 ? rangeAll : true,
          rangeFrom: isA4 ? rangeFrom : undefined,
          rangeTo: isA4 ? rangeTo : undefined,
          colore: inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore",
          pagina: paginaToken,
          inchiostro: inchiostroToToken(inchiostro),
          layout: layoutToken,
          rilegatura: isA4 ? rilegaturaToken : undefined,
          rilegaturaUnica: isA4 ? (rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO") : undefined,
          plasticaId: singlePlasticaId,
          grammatura: !isA4 ? (grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale") : undefined,
          plastificazione: !isA4 ? (plastificazione === plastificazioneEnum.SI ? "Si" : "No") : undefined,
          isStudent: !!delivery,
          delivery: delivery
            ? { dayLabel: delivery.dayLabel, timeRange: delivery.timeRange, dateISO: delivery.dateISO, weekday: delivery.weekday }
            : undefined,
          metodoPagamento: payment?.method === "PAYPAL" ? "PAYPAL" : "CASH",
        };

        const signature = JSON.stringify(orderRequest);
        if (orderAttempt.current?.signature !== signature) {
          orderAttempt.current = { signature, requestId: crypto.randomUUID() };
        }
        let saved: { id: string; totaleFinale: number };
        try {
          saved = await api.post<{ id: string; totaleFinale: number }>("/api/orders", {
            ...orderRequest, requestId: orderAttempt.current.requestId,
          });
        } catch (orderErr) {
          if (orderErr instanceof ApiError && (orderErr.status === 403 || orderErr.status === 404)) {
            uploadedPaths.current = new WeakMap();
            orderAttempt.current = null;
          }
          console.error("Creazione ordine fallita:", orderErr);
          throw new Error("Impossibile inviare l'ordine. Il file è stato caricato correttamente: riprova tra qualche istante.");
        }

        setFormSubmitting(false);
        if (payment?.method !== "PAYPAL") setFormSubmitted(true);
        return saved;
      } catch (e) {
        setFormErrorMessage(e instanceof Error ? e.message : "Si è verificato un errore imprevisto. Riprova.");
        setFormError(true);
        setFormSubmitting(false);
        if (payment?.method === "PAYPAL") throw e;
      }
    },
    [
      formato,
      fileData,
      numeroPDF,
      numeroCopie,
      inchiostro,
      pagina,
      layoutA4,
      rilegatura,
      rilegaturaUnica,
      fileSettings,
      rilegaturaVietaPlastica,
      intervalloPagineIsValid,
      rangeAll,
      rangeFrom,
      rangeTo,
      layoutA3,
      grammatura,
      plastificazione,
      plasticaSelectedSingle,
    ]
  );

  useEffect(() => {
    if (formSubmitted) {
      const t = setTimeout(() => window.location.reload(), 3000);
      return () => clearTimeout(t);
    }
  }, [formSubmitted]);

  const canConfirmA4 =
    formato === formatoEnum.A4
      ? !!intervalloPagineIsValid && Object.values(fileSettings).every((s) => s.rangeValid)
      : true;

  return (
    <Box
      style={{ position: "relative", zIndex: 1 }}
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {isDraggingFile && (
        <Box
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            pointerEvents: "none",
            background: "rgba(5,8,13,.88)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            style={{
              border: "2px dashed rgba(212,175,106,.6)",
              borderRadius: 24,
              padding: "56px 72px",
              textAlign: "center",
              background: "rgba(255,255,255,.03)",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e3c98b" strokeWidth="1.6" style={{ margin: "0 auto 18px" }}>
              <path d="M7 16a4 4 0 0 1-1-7.85A5.5 5.5 0 0 1 16.9 6.1 3.5 3.5 0 0 1 17 13" />
              <polyline points="12 12 12 20" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
            <Text style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 26, color: "#fff", textTransform: "uppercase", letterSpacing: ".03em" }}>
              Rilascia qui i tuoi PDF
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,.55)" }}>
              Vengono accettati solo file PDF
            </Text>
          </Box>
        </Box>
      )}

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

      <Modal
        opened={formError}
        onClose={() => setFormError(false)}
        centered
        radius="lg"
        title={
          <Group gap={10}>
            <IconAlertTriangle size={18} color="#c92a2a" />
            <Text fw={700}>Invio non riuscito</Text>
          </Group>
        }
      >
        <Text c="dimmed" style={{ lineHeight: 1.6 }}>
          {formErrorMessage || "Si è verificato un errore imprevisto. Riprova."}
        </Text>

        <Group justify="flex-end" mt="lg">
          <Button onClick={() => setFormError(false)}>Ho capito</Button>
        </Group>
      </Modal>

      <Box style={{ background: "linear-gradient(180deg,#05080d 0%,#0a0e15 40%,#0c1119 100%)" }}>
        {/* ================= HERO + UPLOAD ================= */}
        <Box style={{ textAlign: "center", padding: "56px 24px 0" }}>
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 999,
              border: "1px solid rgba(212,175,106,.35)",
              background: "rgba(212,175,106,.08)",
              color: "#e3c98b",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              marginBottom: 22,
            }}
          >
            Preventivo istantaneo
          </Box>

          <Text
            component="h1"
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 44,
              letterSpacing: ".03em",
              textTransform: "uppercase",
              color: "#ffffff",
              textShadow: "0 0 24px rgba(242,201,76,.45)",
            }}
          >
            {formato === formatoEnum.A4 ? "Stampa i tuoi documenti A4" : "Stampa i tuoi documenti A3"}
          </Text>

          <Text style={{ margin: "14px auto 0", maxWidth: 520, color: "rgba(255,255,255,.56)", fontSize: 16, lineHeight: 1.6 }}>
            Carica il PDF: pagine, opzioni e prezzo si aggiornano da soli mentre scegli.
          </Text>

          <Box style={{ maxWidth: 640, margin: "36px auto 0", textAlign: "left" }}>
            <MultiInput ref={multiInputRef} onSendData={setPDFHandler} />
          </Box>
        </Box>

        {/* ================= CORPO: percorso a step + riepilogo ================= */}
        <Container fluid px="xl" py="xl">
          <Grid gutter={56} align="flex-start">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Box style={{ position: "relative" }}>
                <Box
                  style={{
                    position: "absolute",
                    left: 19,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    background: "linear-gradient(180deg, rgba(212,175,106,.5), rgba(255,255,255,.06))",
                  }}
                />

                <Stack gap={48}>
                  <StepSection number={1} title="Formato" description="Scegli il formato del foglio per l'intero ordine.">
                    <OptionGroup first>
                      <FormatoPicker value={formato === formatoEnum.A4 ? "A4" : "A3"} onChange={(v) => newValue(v)} bare />
                    </OptionGroup>
                  </StepSection>

                  {formato === formatoEnum.A4 && (
                    <StepSection
                      number={2}
                      title="Rilegatura"
                      description="Un'unica rilegatura per tutti i file, oppure una diversa per ciascuno."
                    >
                      <OptionGroup first>
                        <RilegaturaUnicaPicker
                          value={rilegaturaUnica === rilegaturaUnicaEnum.SI ? "SI" : "NO"}
                          disabled={numeroPDF === 1}
                          disabledHint="Disponibile soltanto per 2 o più PDF"
                          onChange={(v) => newValue(v === "SI" ? "Si (rilegatura unica)" : "No (rilegatura unica)")}
                          bare
                        />
                      </OptionGroup>
                    </StepSection>
                  )}

                  {formato === formatoEnum.A3 && (
                    <StepSection number={2} title="Colore e stampa" description="Colore, se stampare su entrambi i lati e il tipo di foglio.">
                      <OptionGroup label="Colore" first>
                        <CardGridPicker
                          title="Colore:"
                          value={inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore"}
                          onChange={newValue}
                          options={coloreCards}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Gestione pagina">
                        <CardGridPicker
                          title="Gestione pagina:"
                          value={pagina === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte"}
                          onChange={newValue}
                          options={paginaCards}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Grammatura">
                        <CardGridPicker
                          title="Grammatura:"
                          value={grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale"}
                          onChange={newValue}
                          options={grammaturaCards}
                          cols={{ base: 2, md: 2, xl: 2 }}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Plastificazione">
                        <CardGridPicker
                          title="Plastificazione:"
                          value={plastificazione === plastificazioneEnum.SI ? "Si (plastificazione)" : "No (plastificazione)"}
                          onChange={newValue}
                          options={plastificazioneCards}
                          cols={{ base: 2, md: 2, xl: 2 }}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Layout">
                        <CardGridPicker
                          title="Layout:"
                          value={
                            layoutA3 === layoutA3Enum.AUTO ? "Auto" : layoutA3 === layoutA3Enum.ORIZZONTALE ? "Orizzontale (A3)" : "Verticale (A3)"
                          }
                          onChange={newValue}
                          options={layoutA3Cards}
                          cols={{ base: 2, md: 3, xl: 3 }}
                          bare
                        />
                      </OptionGroup>
                    </StepSection>
                  )}

                  {formato === formatoEnum.A4 && isRilegaturaUnicaA4 && (
                    <>
                      <StepSection number={3} title="Opzioni di stampa" description="Colore, lati e disposizione delle pagine sul foglio.">
                        <OptionGroup label="Colore" first>
                          <CardGridPicker
                            title="Colore:"
                            value={inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore"}
                            onChange={newValue}
                            options={coloreCards}
                            bare
                          />
                        </OptionGroup>

                        <OptionGroup label="Gestione pagina">
                          <CardGridPicker
                            title="Gestione pagina:"
                            value={pagina === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte"}
                            onChange={newValue}
                            options={paginaCards}
                            bare
                          />
                        </OptionGroup>

                        <OptionGroup label="Layout">
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
                            cols={{ base: 2, md: 4, xl: 4 }}
                            bare
                          />
                        </OptionGroup>
                      </StepSection>

                      <StepSection number={4} title="Rilegatura e copertina" description="Come vuoi che il fascicolo venga rilegato.">
                        <OptionGroup label="Tipo di rilegatura" first>
                          <CardGridPicker
                            title="Rilegatura:"
                            value={rilegaturaEnumToToken(rilegatura)}
                            onChange={newValue}
                            options={rilegaturaCards}
                            cols={{ base: 2, md: 5, xl: 5 }}
                            bare
                          />
                        </OptionGroup>

                        {/* ✅ Plastiche (A4 only): il picker mostra gia' la propria etichetta + badge di stato */}
                        {plasticheLoaded && (
                          <OptionGroup>
                            {plasticaDisabled ? (
                              <Text size="sm" style={{ color: "rgba(16,20,28,.5)" }}>
                                La plastica colorata non è disponibile con rilegatura:{" "}
                                {rilegatura === rilegaturaEnum.CIAPPATURA ? "Ciappatura" : "Nessuna"}.
                              </Text>
                            ) : (
                              <PlasticaColorePicker
                                label="Colore Copertina"
                                colors={plasticaOptions}
                                value={plasticaSelectedSingle?.id ?? null}
                                onChange={(c) => setPlasticaSelectedSingle(c)}
                                columns={{ base: 2, sm: 3, md: 4, lg: 4 }}
                                withPreviewCard
                                bare
                              />
                            )}
                          </OptionGroup>
                        )}
                      </StepSection>

                      <StepSection number={5} title="Pagine e copie" description="Quali pagine stampare e in quante copie.">
                        <OptionGroup first>
                          <IntervalloPagine
                            onSendData={setRangePagesHandler}
                            maxValue={numeroPaginePDF}
                            disable={numeroPDF >= 2}
                            errorMessage="Disponibile soltanto per un singolo PDF"
                            bare
                          />
                        </OptionGroup>

                        <OptionGroup label="Numero copie">
                          <NumeroCopie onSendData={setCopiesHandler} bare />
                        </OptionGroup>
                      </StepSection>
                    </>
                  )}

                  {formato === formatoEnum.A4 && !isRilegaturaUnicaA4 && (
                    <StepSection
                      number={3}
                      title="Impostazioni per ciascun PDF"
                      description="Ogni file è un fascicolo a sé: colore, layout, rilegatura, copertina, pagine e copie possono essere diversi."
                    >
                      <Accordion
                        variant="separated"
                        radius="md"
                        defaultValue="file-0"
                        chevronSize={16}
                        styles={{
                          item: { border: "1px solid rgba(16,20,28,.10)", background: "#fbfaf8" },
                          control: { padding: "10px 12px" },
                          panel: { padding: "0 12px 14px" },
                          label: { padding: 0 },
                        }}
                      >
                        {fileData.map((f, idx) => {
                          const s = fileSettings[idx];
                          if (!s) return null;
                          const fileVietaPlastica = rilegaturaVietaPlastica(s.rilegatura);
                          const summary = `${rilegaturaEnumToToken(s.rilegatura)}${
                            !fileVietaPlastica && s.plastica ? ` · ${s.plastica.name}` : ""
                          } · ${s.numeroCopie} cop.`;

                          return (
                            <Accordion.Item key={idx} value={`file-${idx}`}>
                              <Accordion.Control>
                                <Group justify="space-between" wrap="nowrap" gap="xs">
                                  <Text fw={800} size="sm" style={{ color: "#10141c" }}>
                                    File {idx + 1} <span style={{ fontWeight: 500, color: "rgba(16,20,28,.5)" }}>· {f.pages} pag.</span>
                                  </Text>
                                  <Text size="xs" fw={700} style={{ color: "#96773d", whiteSpace: "nowrap" }}>
                                    {summary}
                                  </Text>
                                </Group>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Stack gap="xs">
                                  <OptionGroup label="Colore" first>
                                    <CardGridPicker
                                      title="Colore:"
                                      value={s.inchiostro === inchiostroEnum.BIANCOENERO ? "Bianco e nero" : "Colore"}
                                      onChange={(v) =>
                                        updateFileSetting(idx, {
                                          inchiostro: v === "Colore" ? inchiostroEnum.COLORE : inchiostroEnum.BIANCOENERO,
                                        })
                                      }
                                      options={coloreCards}
                                      bare
                                    />
                                  </OptionGroup>

                                  <OptionGroup label="Gestione pagina">
                                    <CardGridPicker
                                      title="Gestione pagina:"
                                      value={s.pagina === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte"}
                                      onChange={(v) =>
                                        updateFileSetting(idx, { pagina: v === "Fronte" ? paginaEnum.FRONTE : paginaEnum.FRONTE_RETRO })
                                      }
                                      options={paginaCards}
                                      bare
                                    />
                                  </OptionGroup>

                                  <OptionGroup label="Layout">
                                    <CardGridPicker
                                      title="Layout:"
                                      value={
                                        s.layoutA4 === layoutA4Enum.VERTICALE
                                          ? "Verticale (A4)"
                                          : s.layoutA4 === layoutA4Enum.ORIZZONTALE
                                            ? "Orizzontale (A4)"
                                            : s.layoutA4 === layoutA4Enum.DUEPAGORIZZ
                                              ? "2 in 1 orizzontale"
                                              : "2 in 1 verticale"
                                      }
                                      onChange={(token) => updateFileSetting(idx, { layoutA4: layoutA4TokenToEnum(token) })}
                                      options={layoutA4Cards}
                                      cols={{ base: 2, md: 4, xl: 4 }}
                                      bare
                                    />
                                  </OptionGroup>

                                  <OptionGroup label="Rilegatura e copertina">
                                    <Stack gap="xs">
                                      <CardGridPicker
                                        title="Rilegatura:"
                                        value={rilegaturaEnumToToken(s.rilegatura)}
                                        onChange={(token) => updateFileSetting(idx, { rilegatura: rilegaturaTokenToEnum(token) })}
                                        options={buildRilegaturaCardsForFile(f.pages)}
                                        cols={{ base: 2, md: 5, xl: 5 }}
                                        bare
                                      />

                                      {plasticheLoaded &&
                                        (fileVietaPlastica ? (
                                          <Text size="xs" style={{ color: "rgba(16,20,28,.5)" }}>
                                            Plastica non disponibile con rilegatura{" "}
                                            {s.rilegatura === rilegaturaEnum.CIAPPATURA ? "Ciappatura" : "Nessuna"}.
                                          </Text>
                                        ) : (
                                          <PlasticaColorePicker
                                            label="Colore copertina"
                                            colors={plasticaOptions}
                                            value={s.plastica?.id ?? null}
                                            onChange={(c) => updateFileSetting(idx, { plastica: c })}
                                            columns={{ base: 1, sm: 3, md: 4, lg: 4 }}
                                            withPreviewCard
                                            bare
                                          />
                                        ))}
                                    </Stack>
                                  </OptionGroup>

                                  <OptionGroup label="Intervallo pagine">
                                    <IntervalloPagine
                                      key={`range-${idx}`}
                                      onSendData={(v) => updateFileRange(idx, v)}
                                      maxValue={f.pages}
                                      disable={false}
                                      errorMessage=""
                                      bare
                                    />
                                  </OptionGroup>

                                  <OptionGroup label="Numero copie">
                                    <NumeroCopie key={`copies-${idx}`} onSendData={(v) => updateFileSetting(idx, { numeroCopie: v })} bare />
                                  </OptionGroup>
                                </Stack>
                              </Accordion.Panel>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    </StepSection>
                  )}
                </Stack>
              </Box>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Box style={{ position: "sticky", top: 24 }}>
                {formato === formatoEnum.A4 ? (
                  <RiepilogoOrdine
                    numeroPDF={numeroPDF}
                    inchiostro={coloreLabel}
                    pagina={paginaLabel}
                    layout={layoutLabel}
                    rilegatura={rilegaturaLabel}
                    rilegaturaUnica={rilegaturaUnica === 0 ? "Si" : "No"}
                    intervalloPagine={intervalloLabel}
                    numeroCopie={numeroCopieLabel}
                    plasticheLabel={plasticheLabel}
                    plasticheExtraEuro={plasticheExtraEuro}
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
      </Box>

      <Footer />
    </Box>
  );
};

export default PdfPrintPage;