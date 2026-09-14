import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Accordion,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconBolt,
  IconDiamond,
  IconFileText,
  IconLock,
  IconTruck,
} from "@tabler/icons-react";

import { useNavigate } from "react-router-dom";

import Footer from "../FooterComponents/Footer";
import Header from "../HeaderComponents/Header";
import Banner from "../Banner/Banner";

import MultiInput, {
  type MultiInputHandle,
} from "../MultiInputComponents/MultiInput";

import NumeroCopie from "../NumeroCopieComponents/NumeroCopie";
import IntervalloPagine from "../IntervalloPagineComponents/IntervalloPagine";

import RiepilogoOrdine from "../RiepilogoOrdineComponents/RiepilogoOrdine";
import RiepilogoOrdineA3 from "../RiepilogoOrdineComponents/RiepilogoOrdineA3";

import type { UploadProgressState } from "../RiepilogoOrdineComponents/UploadProgressBar";

import FormatoPicker from "../CardComponents/FormatoPicker";
import CardGridPicker from "../CardComponents/CardGridPicker";
import RilegaturaUnicaPicker from "../CardComponents/RilegaturaUnicaPicker";

import PlasticaColorePicker, {
  type PlasticaColor,
} from "../CardComponents/PlasticaColorePicker";

import { auth, onAuthStateChanged } from "../../backend/auth";
import { api, ApiError } from "../../backend/apiClient";
import { uploadFileInChunks } from "../../utils/chunkedUpload";

import type { FileHandler } from "../../types/FileHandler";
import type { RangePagesData } from "../../types/RangePagesData";

/* -------------------------------------------------------------------------- */
/* Costanti e conversioni                                                      */
/* -------------------------------------------------------------------------- */

const FONT_DISPLAY = "'Oswald', sans-serif";

const fmtEuro = (value?: number | string) =>
  Number(value || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatoEnum = {
  A4: 0,
  A3: 1,
};

const inchiostroEnum = {
  BIANCOENERO: 0,
  COLORE: 1,
};

const paginaEnum = {
  FRONTE_RETRO: 0,
  FRONTE: 1,
};

const layoutA4Enum = {
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
  SPIRALE: 4,
};

const rilegaturaUnicaEnum = {
  SI: 0,
  NO: 1,
};

const plastificazioneEnum = {
  SI: 0,
  NO: 1,
};

const layoutA3Enum = {
  ORIZZONTALE: 0,
  VERTICALE: 1,
  AUTO: 2,
};

const grammaturaEnum = {
  NORMALE: 0,
  CARTONCINO: 1,
};

const rilegaturaEnumToToken = (value: number): string => {
  switch (value) {
    case rilegaturaEnum.ANELLI:
      return "Anelli";
    case rilegaturaEnum.SPIRALE:
      return "Spirale";
    case rilegaturaEnum.FASCETTA:
      return "Fascetta";
    case rilegaturaEnum.CIAPPATURA:
      return "Ciappatura";
    default:
      return "Nessuna";
  }
};

const rilegaturaTokenToEnum = (token: string): number => {
  switch (token) {
    case "Anelli":
      return rilegaturaEnum.ANELLI;
    case "Spirale":
      return rilegaturaEnum.SPIRALE;
    case "Fascetta":
      return rilegaturaEnum.FASCETTA;
    case "Ciappatura":
      return rilegaturaEnum.CIAPPATURA;
    default:
      return rilegaturaEnum.NESSUNA;
  }
};

const layoutA4TokenToEnum = (token: string): number => {
  switch (token) {
    case "Verticale (A4)":
      return layoutA4Enum.VERTICALE;
    case "Orizzontale (A4)":
      return layoutA4Enum.ORIZZONTALE;
    case "2 in 1 orizzontale":
      return layoutA4Enum.DUEPAGORIZZ;
    case "2 in 1 verticale":
      return layoutA4Enum.DUEPAGVERT;
    default:
      return layoutA4Enum.VERTICALE;
  }
};

const layoutA4PickerToken = (value: number): string => {
  switch (value) {
    case layoutA4Enum.ORIZZONTALE:
      return "Orizzontale (A4)";
    case layoutA4Enum.DUEPAGORIZZ:
      return "2 in 1 orizzontale";
    case layoutA4Enum.DUEPAGVERT:
      return "2 in 1 verticale";
    default:
      return "Verticale (A4)";
  }
};

const inchiostroToToken = (value: number): string =>
  value === inchiostroEnum.COLORE ? "colore" : "biancoenero";

const paginaToToken = (value: number): string =>
  value === paginaEnum.FRONTE_RETRO ? "Fronte-retro" : "Fronte";

const layoutA4ToToken = (value: number): string => {
  switch (value) {
    case layoutA4Enum.ORIZZONTALE:
      return "Orizzontale";
    case layoutA4Enum.DUEPAGORIZZ:
      return "2 pagine in 1 orizzontale";
    case layoutA4Enum.DUEPAGVERT:
      return "2 pagine in 1 verticale";
    default:
      return "Verticale";
  }
};

const RILEGATURA_LIMITI: {
  enumVal: number;
  max: number;
  label: string;
}[] = [
    {
      enumVal: rilegaturaEnum.ANELLI,
      max: 670,
      label: "Limite di 670 pagine",
    },
    {
      enumVal: rilegaturaEnum.SPIRALE,
      max: 500,
      label: "Limite di 500 pagine",
    },
    {
      enumVal: rilegaturaEnum.FASCETTA,
      max: 80,
      label: "Limite di 80 pagine",
    },
    {
      enumVal: rilegaturaEnum.CIAPPATURA,
      max: 35,
      label: "Limite di 40 pagine",
    },
  ];

type PlasticaDocItem = {
  id: string;
  name: string;
  hex: string;
  priceEuro: number;
  enabled: boolean;
  order: number;
};

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

const isValidHex = (hex: string) =>
  /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test((hex || "").trim());

/* -------------------------------------------------------------------------- */
/* Stili della pagina                                                         */
/* -------------------------------------------------------------------------- */

const PRINT_HOME_STYLES = `
/* SFONDO E CONTENITORI */
/* Consente lo sticky solo nella pagina di stampa. */
.pageBg:has(.pv-print-home) {
  overflow: clip;
}

.pageContent:has(.pv-print-home) {
  overflow: visible;
}

.pv-print-home {
  --pv-ink: #182331;
  --pv-gold: #a37c32;
  --pv-muted: #697586;
  --summary-top: 88px;
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  background: #f6f3ed;
  color: var(--pv-ink);
  color-scheme: light;
}

.pv-print-home *,
.pv-print-home *::before,
.pv-print-home *::after {
  box-sizing: border-box;
}

/* HEADER */
.pv-print-header {
  position: relative;
  z-index: 201;
  max-width: 1240px;
  margin: 0 auto;
  border-radius: 0 0 16px 16px;
  overflow: clip;
  box-shadow: 0 9px 24px #11182026;
}

/* HERO */
.pv-print-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 42px 28px 38px;
  background:
    radial-gradient(ellipse at 15% 0%, #d7c9b34d, transparent 48%),
    linear-gradient(115deg, #f0e9dc, #fffdf8 52%, #e9dfcf);
}

.pv-print-hero-inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 42px;
  align-items: start;
  max-width: 1180px;
  margin: auto;
}

.pv-print-intro {
  min-width: 0;
  padding: 14px 0;
}

.pv-print-eyebrow {
  margin: 0 0 15px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .15em;
  color: #856326;
}

.pv-print-intro h1 {
  margin: 0 0 12px;
  font-family: 'Oswald', sans-serif;
  font-size: clamp(32px, 3vw, 52px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -.025em;
  text-transform: uppercase;
  color: #10161d;
}

.pv-print-subtitle {
  margin: 0 0 13px;
  font-size: clamp(18px, 1.55vw, 24px);
  font-weight: 700;
  line-height: 1.3;
}

.pv-print-description {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--pv-muted);
}

.pv-print-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 28px;
  margin-top: 28px;
}

.pv-print-benefits > div {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}

.pv-print-benefits svg {
  flex-shrink: 0;
  color: var(--pv-gold);
}

.pv-print-paper {
  position: absolute;
  z-index: 0;
  width: 155px;
  height: 225px;
  padding: 26px 20px;
  pointer-events: none;
  background: linear-gradient(120deg, #fff, #eae6dd);
  box-shadow: 14px 20px 22px #0003;
  color: #555;
  font-family: Georgia, serif;
}

.pv-print-paper span {
  display: block;
  margin-bottom: 14px;
  font-size: 40px;
}

.pv-print-paper small {
  font-size: 13px;
  letter-spacing: .12em;
  line-height: 1.5;
}

.pv-print-paper--a4 {
  left: -40px;
  top: 48px;
  transform: rotate(-18deg);
}

.pv-print-paper--a3 {
  right: -42px;
  top: 80px;
  transform: rotate(14deg);
}

/* CARICAMENTO PDF */
.pv-print-upload {
  min-width: 0;
  padding: 22px;
  border: 1px solid #384047;
  border-radius: 16px;
  background: linear-gradient(135deg, #242b31, #101820);
  box-shadow: 0 12px 24px #15212c30;
  color: #fff;
}

.pv-print-upload > h2 {
  margin: 0 0 14px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.pv-print-home .pv-print-upload > .mantine-Card-root {
  padding: 0;
  border: 0;
  box-shadow: none;
  overflow: visible;
  background: transparent !important;
}

.pv-print-upload > .mantine-Card-root > .mantine-Group-root {
  display: none;
}

.pv-print-home .pv-print-upload .mantine-Dropzone-root {
  padding: 24px 12px;
  border: 1px dashed #c89f49;
  border-radius: 10px;
  background: #111820 !important;
  color: #fff;
  cursor: pointer;
}

.pv-print-upload .mantine-Dropzone-root > .mantine-Group-root {
  flex-direction: column;
  min-height: 130px !important;
  text-align: center;
}

.pv-print-upload .mantine-Dropzone-root .mantine-Text-root {
  color: #f5f1e8;
}

.pv-print-upload .mantine-Dropzone-root .mantine-Text-root:last-child {
  color: #c3c8cc;
  font-size: 12px;
}

.pv-print-upload .mantine-Dropzone-root svg {
  width: 32px;
  height: 32px;
  color: #e6c57c;
}

.pv-print-upload .mantine-Dropzone-root:focus-visible {
  outline: 3px solid #ecd299;
  outline-offset: 4px;
}

.pv-print-upload .mantine-Dropzone-root:hover {
  background: #202a34 !important;
}

.pv-print-upload .mantine-SimpleGrid-root {
  max-height: 310px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px;
}

.pv-print-banner {
  max-width: 1440px;
  margin: auto;
}

/* AVANZAMENTO */
.pv-print-progress {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  max-width: 1050px;
  margin: 25px auto;
  padding: 0 24px;
  list-style: none;
}

.pv-print-progress li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.pv-print-progress li:not(:last-child)::after {
  content: "";
  flex: 1;
  height: 1px;
  margin-left: 10px;
  background: #d7ccba;
}

.pv-print-progress-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border: 2px solid #e1dbd1;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}

.pv-print-progress li.is-active .pv-print-progress-number {
  background: linear-gradient(#f2d17a, #d1a348);
  border-color: #ead3a0;
  box-shadow: 0 2px 6px #b8934f33;
}

.pv-print-progress strong {
  display: block;
  font-size: 14px;
}

.pv-print-progress small {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--pv-muted);
}

/* CONFIGURATORE */
.pv-print-body {
  max-width: 1680px;
  padding: 0 28px 30px;
  overflow: visible;
}

.pv-print-body > .mantine-Grid-root,
.pv-print-body > .mantine-Grid-root > .mantine-Grid-inner {
  overflow: visible;
}

.pv-print-configurator {
  padding: 0;
  overflow: clip;
  container-type: inline-size;
  background: #f7f8fa;
  border: 1px solid #e1e5ea;
  border-radius: 20px;
}

.pv-config-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 26px;
  background: linear-gradient(130deg, #17232f, #263540);
  color: #fff;
}

.pv-print-config-title {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -.04em;
  line-height: 1.25;
  color: #fff;
}

.pv-config-topbar p {
  margin: 7px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #b8c2ca;
}

.pv-config-counter {
  flex-shrink: 0;
  padding: 7px 10px;
  border: 1px solid #637077;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  color: #e8d3a5;
}

.pv-print-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
}

.pv-print-section {
  min-width: 0;
  padding: 20px;
  border: 1px solid #e2e6eb;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 4px 12px #15213003;
}

.pv-print-section--wide {
  grid-column: 1 / -1;
}

.pv-config-section-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.pv-config-section-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: #f3ede0;
  color: #987334;
  font-size: 12px;
  font-weight: 650;
}

.pv-config-section-copy {
  flex: 1;
  min-width: 0;
}

.pv-print-section-title {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -.02em;
  color: #1c2937;
}

.pv-config-summary {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: #857150;
  overflow-wrap: anywhere;
}

.pv-config-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: #f4f6f8;
  color: #7a8793;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}

.pv-config-toggle:hover {
  background: #eee6d5;
  color: #806125;
}

.pv-config-toggle span {
  font-size: 18px;
  line-height: 1;
}

.pv-config-toggle:focus-visible {
  outline: 3px solid #b58a3680;
  outline-offset: 3px;
}

.pv-config-section-content {
  padding-top: 16px;
}

.pv-config-section-content[hidden] {
  display: none;
}

.pv-print-section-description {
  margin: 0 0 15px;
  font-size: 12px;
  line-height: 1.5;
  color: #6e7b89;
}

.pv-config-options {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.pv-config-option {
  min-width: 0;
}

.pv-config-option-label {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  font-size: 12px;
  font-weight: 650;
  color: #3b4857;
}

.pv-print-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 26px 14px;
  text-align: center;
  border: 1px dashed #d9dce1;
  border-radius: 10px;
  background: #faf9f6;
  color: #68717d;
}

.pv-print-configurator .mantine-Accordion-item {
  border: 1px solid #e3e6ec !important;
  border-radius: 12px !important;
  background: #fff !important;
}

.pv-print-configurator .mantine-Accordion-control {
  padding: 14px !important;
}

.pv-print-configurator .mantine-Accordion-control:hover {
  background: #f6f2e9;
}

.pv-print-configurator .mantine-Accordion-label {
  min-width: 0;
}

.pv-file-settings {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

@container (min-width: 650px) {
  .pv-print-section--wide .pv-config-options,
  .pv-file-settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }

  .pv-print-section--wide .pv-config-options > .pv-config-option[data-label="Layout"],
  .pv-print-section--wide .pv-config-options > .mantine-Accordion-root,
  .pv-print-section--wide .pv-config-options > .pv-print-empty,
  .pv-file-settings > .pv-config-option[data-label="Layout"],
  .pv-file-settings > .pv-config-option[data-label="Rilegatura e copertina"] {
    grid-column: 1 / -1;
  }
}

/* RILEGATURA SOPRA, COPERTINE SOTTO */
.pv-print-section[data-title="Rilegatura e copertina"] .pv-config-options {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pv-print-section[data-title="Rilegatura e copertina"] .pv-config-options > * {
  width: 100%;
  min-width: 0;
}

.pv-print-section[data-title="Rilegatura e copertina"]
.pv-config-options > .pv-config-option + .pv-config-option {
  padding-top: 22px;
  border-top: 1px solid #e8ecf1;
}

.pc-choice-grid.pc-choice-grid--binding {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 120px), 1fr));
  gap: 12px;
}

.pc-choice-grid--binding .pc-choice {
  min-height: 112px;
  padding: 20px 12px 16px;
  border-radius: 14px;
  gap: 12px;
}

.pc-choice-grid--binding .pc-choice-icon svg {
  width: 32px;
  height: 32px;
}

.pc-choice-grid--binding .pc-choice-title {
  font-size: 14px;
  font-weight: 650;
}

.pc-choice-grid--binding .pc-choice[aria-pressed="true"] {
  border-color: #b89650;
  background: linear-gradient(145deg, #fffdf8, #f5ead2);
  box-shadow: 0 4px 14px rgba(163, 124, 50, .12);
}

/* RIEPILOGO */
.pv-print-summary {
  min-width: 0;
  height: auto;
}

/* Compatibilità con il riepilogo Mantine precedente */
.pv-print-home .pv-print-summary > .mantine-Card-root,
.pv-print-home .pv-print-summary > div > .mantine-Card-root {
  border: 1px solid #354048;
  border-radius: 14px;
  background: linear-gradient(135deg, #20272e, #101820) !important;
  box-shadow: 0 10px 22px #1018201c;
}

.pv-print-summary .mantine-Title-root {
  font-size: 20px;
  text-transform: none;
  letter-spacing: 0;
}

.pv-print-summary .mantine-Card-root .mantine-Card-root {
  color: #111820;
}

.pv-order {
  --order-ink: #18212c;
  --order-muted: #657180;
  --order-line: #e7eaf0;
  --order-gold: #aa8138;
  width: 100%;
  min-width: 0;
  position: static;
  display: flex;
  flex-direction: column;
  border: 1px solid #dedfe3;
  border-radius: 22px;
  background: #fff;
  color: var(--order-ink);
  box-shadow:
    0 18px 50px rgba(24, 33, 44, .09),
    0 3px 10px rgba(24, 33, 44, .03);
  font-family: Inter, system-ui, sans-serif;
}

.pv-order-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding: 24px;
  border-radius: 21px 21px 0 0;
  background: linear-gradient(135deg, #242b33, #111820);
  color: #fff;
}

.pv-order-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #dfc48d;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}

.pv-order-header h2 {
  margin: 0;
  color: #fff;
  font-family: inherit;
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -.04em;
}

.pv-order-header p {
  margin: 9px 0 0;
  color: #bdc5cf;
  font-size: 12px;
  line-height: 1.5;
}

.pv-order-format {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  min-width: 43px;
  height: 43px;
  border: 1px solid #d4b36c55;
  border-radius: 12px;
  background: #d4b36c12;
  color: #e9ce96;
  font-size: 15px;
  font-weight: 700;
}

.pv-order-body {
  min-height: 0;
  padding: 20px 24px;
}

.pv-order-body:focus-visible {
  outline: 2px solid #b89650;
  outline-offset: -3px;
}

.pv-order-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 15px 0;
  margin-bottom: 18px;
  border: 1px solid var(--order-line);
  border-radius: 13px;
  background: #fafbfc;
}

.pv-order-stats > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.pv-order-stats > div + div {
  border-left: 1px solid var(--order-line);
}

.pv-order-stats strong {
  font-size: 21px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.pv-order-stats span {
  color: var(--order-muted);
  font-size: 10px;
}

.pv-order-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0 14px;
  cursor: pointer;
  list-style: none;
  font-size: 13px;
  font-weight: 650;
}

.pv-order-details summary::-webkit-details-marker {
  display: none;
}

.pv-order-chevron {
  color: var(--order-gold);
  font-size: 20px;
  transition: transform 180ms ease;
}

.pv-order-details[open] .pv-order-chevron {
  transform: rotate(180deg);
}

.pv-order-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin: 0;
}

.pv-order-list > div {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
  gap: 16px;
  align-items: baseline;
}

.pv-order-list dt {
  color: var(--order-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pv-order-list dd {
  min-width: 0;
  margin: 0;
  color: var(--order-ink);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  text-align: right;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.pv-order-list dt small {
  display: block;
  margin-top: 3px;
  font-size: 10px;
}

.pv-order-prices dd {
  font-variant-numeric: tabular-nums;
}

.pv-order-section {
  margin-top: 21px;
  padding-top: 20px;
  border-top: 1px solid var(--order-line);
}

.pv-order-section h3 {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 13px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 650;
}

.pv-order-step {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 8px;
  background: #f5efe2;
  color: #927035;
  font-size: 10px;
}

.pv-order .pv-order-section .mantine-Card-root {
  padding: 12px;
  border: 1px solid var(--order-line);
  border-radius: 12px;
  background: #fafbfc !important;
  box-shadow: none;
}

.pv-order-payment {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.pv-order-payment:disabled {
  opacity: .65;
}

.pv-order-promos {
  display: grid;
  gap: 9px;
  margin-top: 18px;
}

.pv-order-promo {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 12px;
  border: 1px solid #d5e7dc;
  border-radius: 11px;
  background: #f1f8f3;
  color: #286243;
}

.pv-order-promo > svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.pv-order-promo strong {
  font-size: 12px;
}

.pv-order-promo p {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.5;
}

.pv-order-discount dt,
.pv-order-discount dd {
  color: #28744a;
}

.pv-order-paypal {
  margin-top: 20px;
  padding: 14px;
  border: 1px solid var(--order-line);
  border-radius: 12px;
  background: #f8fafc;
}

.pv-order-paypal > p {
  margin: 0 0 12px;
  color: var(--order-muted);
  font-size: 12px;
  line-height: 1.6;
}

.pv-order-footer {
  flex-shrink: 0;
  padding: 20px 24px;
  border-top: 1px solid #e5dcc9;
  border-radius: 0 0 21px 21px;
  background: linear-gradient(145deg, #fffdf8, #f7f1e5);
}

.pv-order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.pv-order-total > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pv-order-total > div > span {
  font-size: 13px;
  font-weight: 650;
}

.pv-order-total small {
  color: var(--order-muted);
  font-size: 10px;
}

.pv-order-total > strong {
  color: #876225;
  font-size: clamp(26px, 2.3vw, 34px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -.055em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.pv-order-total > strong > span {
  font-size: 20px;
  font-weight: 500;
}

.pv-order-confirm {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  width: 100%;
  min-height: 49px;
  padding: 12px 18px;
  border: 1px solid #bc974d;
  border-radius: 12px;
  background: linear-gradient(135deg, #ebcf8e, #d3ac5c);
  color: #241d10;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 5px 13px #a8823020;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.pv-order-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px #a8823033;
}

.pv-order-confirm:disabled {
  cursor: not-allowed;
  background: #e9e5dc;
  border-color: #ded8cc;
  color: #7b766c;
  box-shadow: none;
}

.pv-order-confirm:focus-visible,
.pv-order-details summary:focus-visible {
  outline: 3px solid #b8965077;
  outline-offset: 3px;
}

.pv-order-footnote {
  margin: 10px 0 0;
  color: #766c58;
  text-align: center;
  font-size: 11px;
  line-height: 1.5;
}

.pv-order-success {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 9px;
  padding: 12px;
  border-radius: 10px;
  background: #eaf5ec;
  color: #286243;
  font-size: 13px;
  font-weight: 600;
}

.pv-order-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* STICKY DESKTOP */
/* Funziona anche se la Grid.Col non ha pv-summary-column. */
@media (min-width: 62em) {
  .pv-print-home .pv-summary-column,
  .pv-print-home .mantine-Grid-col:has(> .pv-print-summary) {
    align-self: stretch;
    min-width: 0;
    overflow: visible;
  }

  .pv-print-home .pv-print-summary {
    position: sticky;
    top: var(--summary-top);
    height: auto;
    min-height: 0;
    max-height: calc(100dvh - var(--summary-top) - 20px);
    z-index: 5;
  }

  /* Disattiva eventuali sticky interni: ne serve uno solo. */
  .pv-print-home .pv-print-summary > .pv-order,
  .pv-print-home .pv-print-summary > div {
    position: static !important;
    top: auto !important;
  }

  .pv-print-home .pv-print-summary .pv-order {
    position: static;
    top: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    max-height: calc(100dvh - var(--summary-top) - 20px);
  }

  .pv-print-home .pv-print-summary .pv-order-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #c6b68f transparent;
    scrollbar-gutter: stable;
  }

  .pv-print-home .pv-print-summary .pv-order-header,
  .pv-print-home .pv-print-summary .pv-order-footer {
    flex: 0 0 auto;
  }

  /* Riepilogo precedente, ad esempio A3:
     mantiene accessibile tutta la card con scroll interno. */
  .pv-print-home .pv-print-summary:not(:has(.pv-order)) {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #c6b68f transparent;
  }
}

/* Schermi desktop bassi: tutto il riepilogo resta raggiungibile. */
@media (min-width: 62em) and (max-height: 599px) {
  .pv-print-home .pv-print-summary {
    overflow-y: auto;
  }

  .pv-print-home .pv-print-summary .pv-order {
    max-height: none;
  }

  .pv-print-home .pv-print-summary .pv-order-body {
    overflow: visible;
    flex: 0 0 auto;
  }
}

/* FOOTER */
.pv-print-footer,
.pv-print-footer footer {
  background: #101820 !important;
}

.pv-print-footer footer > .mantine-Container-root {
  padding-top: 24px;
  padding-bottom: 20px;
}

.pv-print-footer .mantine-Text-root {
  overflow-wrap: anywhere;
}

/* DRAG OVERLAY */
.pv-print-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 20px;
  pointer-events: none;
  background: rgba(5, 8, 13, .88);
  backdrop-filter: blur(4px);
}

.pv-print-drag-message {
  width: min(100%, 560px);
  padding: 45px 24px;
  text-align: center;
  border: 2px dashed rgba(212, 175, 106, .6);
  border-radius: 24px;
  background: rgba(255, 255, 255, .03);
}

/* RESPONSIVE */
@media (min-width: 1750px) {
  .pv-print-paper--a4 { left: 30px; }
  .pv-print-paper--a3 { right: 30px; }
}

@media (max-width: 1450px) {
  .pv-print-paper { opacity: .14; }
  .pv-print-hero-inner { gap: 28px; }
}

@media (max-width: 1100px) {
  .pv-print-benefits { gap: 15px; }
  .pv-print-hero { padding-inline: 24px; }
  .pv-print-body { padding-inline: 18px; }
}

@media (width < 62em) {
  .pv-print-hero-inner {
    grid-template-columns: 1fr;
  }

  .pv-print-intro {
    max-width: 680px;
  }

  .pv-print-upload {
    max-width: 680px;
    width: 100%;
    justify-self: center;
  }

  .pv-print-hero { padding-top: 24px; }
  .pv-print-header { border-radius: 0; }

  .pv-print-progress li:not(:last-child)::after {
    display: none;
  }

  .pv-print-footer .mantine-SimpleGrid-root > div {
    min-width: 0 !important;
  }

  .pv-print-home .pv-print-summary,
  .pv-print-home .pv-print-summary .pv-order {
    position: static;
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .pv-print-home .pv-print-summary > div {
    position: static !important;
    top: auto !important;
  }

  .pv-print-home .pv-print-summary .pv-order-body {
    overflow: visible;
    flex: 0 0 auto;
  }
}

@media (max-width: 600px) {
  .pv-print-hero { padding: 22px 16px; }
  .pv-print-intro h1 { font-size: 36px; }

  .pv-print-benefits {
    gap: 14px;
    justify-content: space-between;
  }

  .pv-print-benefits > div {
    font-size: 11px;
    gap: 5px;
  }

  .pv-print-benefits svg { width: 23px; }
  .pv-print-upload { padding: 16px; }

  .pv-print-progress {
    gap: 10px;
    margin: 20px auto;
    padding: 0 14px;
  }

  .pv-print-progress li {
    flex-direction: column;
    align-items: center;
    gap: 5px;
    text-align: center;
  }

  .pv-print-progress small { display: none; }
  .pv-print-progress strong { font-size: 12px; }

  .pv-print-progress-number {
    width: 32px;
    height: 32px;
    font-size: 15px;
  }

  .pv-print-body { padding: 0 12px 20px; }

  .pv-config-topbar {
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 17px;
  }

  .pv-print-config-title { font-size: 22px; }

  .pv-print-settings-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
  }

  .pv-print-section { padding: 15px; }
  .pv-config-toggle { padding: 6px 8px; }
  .pv-print-paper { display: none; }

  .pv-print-configurator .mantine-Accordion-control .mantine-Group-root {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .pc-choice-grid.pc-choice-grid--binding {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .pc-choice-grid--binding .pc-choice {
    min-height: 104px;
  }

  .pv-order-header,
  .pv-order-body,
  .pv-order-footer {
    padding: 18px;
  }

  .pv-order-header h2 {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pv-print-home * {
    scroll-behavior: auto !important;
    animation: none !important;
    transition: none !important;
  }
}
  /* Nasconde la scrollbar senza tagliare i contenuti */
.pv-print-home .pv-print-summary,
.pv-print-home .pv-print-summary .pv-order-body {
  scrollbar-width: none;
  scrollbar-gutter: auto;
  -ms-overflow-style: none;
}

.pv-print-home .pv-print-summary::-webkit-scrollbar,
.pv-print-home .pv-print-summary .pv-order-body::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
  /* Superfici scure coerenti con l’header */
.pv-print-home {
  --pv-dark-background: linear-gradient(
    180deg,
    #202223 0%,
    #383a3b 100%
  );
  --pv-dark-border: rgba(255, 255, 255, 0.12);
  --pv-dark-text: #ffffff;
  --pv-dark-muted: #c5c7ca;
}

/* Caricamento PDF */
.pv-print-home .pv-print-upload {
  background: var(--pv-dark-background);
  border-color: var(--pv-dark-border);
}

/* Area di trascinamento */
.pv-print-home .pv-print-upload .mantine-Dropzone-root {
  background: rgba(0, 0, 0, 0.16) !important;
  border-color: rgba(224, 184, 95, 0.65);
}

.pv-print-home .pv-print-upload .mantine-Dropzone-root:hover {
  background: rgba(255, 255, 255, 0.05) !important;
}

/* Intestazioni configuratore e riepilogo */
.pv-print-home .pv-config-topbar,
.pv-print-home .pv-order-header {
  background: var(--pv-dark-background);
  color: var(--pv-dark-text);
}

.pv-print-home .pv-config-topbar p,
.pv-print-home .pv-order-header p,
.pv-print-home .pv-print-upload
  .mantine-Dropzone-root .mantine-Text-root:last-child {
  color: var(--pv-dark-muted);
}

/* Riepiloghi che usano ancora la vecchia Card */
.pv-print-home .pv-print-summary > .mantine-Card-root,
.pv-print-home .pv-print-summary > div > .mantine-Card-root {
  background: var(--pv-dark-background) !important;
  border-color: var(--pv-dark-border);
}

/* Footer */
.pv-print-home .pv-print-footer {
  background: var(--pv-dark-background) !important;
}

.pv-print-home .pv-print-footer footer {
  background: transparent !important;
  border-top-color: var(--pv-dark-border);
}
`;

/* -------------------------------------------------------------------------- */
/* Icone delle opzioni                                                         */
/* -------------------------------------------------------------------------- */

const OPT_ICON_STROKE = "#987128";

const OptionSvg = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke={OPT_ICON_STROKE}
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconOptBiancoNero = () => (
  <OptionSvg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 1 0 18z" fill={OPT_ICON_STROKE} />
  </OptionSvg>
);

const IconOptColore = () => (
  <OptionSvg>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9.5" cy="10" r="2.2" fill="#e0574f" stroke="none" />
    <circle cx="14.5" cy="10" r="2.2" fill="#4f8fe0" stroke="none" />
    <circle cx="12" cy="14.5" r="2.2" fill="#e0c93f" stroke="none" />
  </OptionSvg>
);

const IconOptFronte = () => (
  <OptionSvg>
    <rect x="5" y="2" width="14" height="20" rx="2" />
  </OptionSvg>
);

const IconOptFronteRetro = () => (
  <OptionSvg>
    <rect x="8" y="2" width="13" height="17" rx="2" opacity=".5" />
    <rect x="3" y="6" width="13" height="16" rx="2" />
  </OptionSvg>
);

const IconOptLayoutVert = IconOptFronte;

const IconOptLayoutOrizz = () => (
  <OptionSvg>
    <rect x="2" y="5" width="20" height="14" rx="2" />
  </OptionSvg>
);

const IconOpt2UpOrizz = () => (
  <OptionSvg>
    <rect x="2" y="5" width="9" height="14" rx="1.5" />
    <rect x="13" y="5" width="9" height="14" rx="1.5" />
  </OptionSvg>
);

const IconOpt2UpVert = () => (
  <OptionSvg>
    <rect x="5" y="2" width="14" height="9" rx="1.5" />
    <rect x="5" y="13" width="14" height="9" rx="1.5" />
  </OptionSvg>
);

const IconOptAnelli = () => (
  <OptionSvg>
    <rect x="7" y="2" width="14" height="20" rx="2" />
    <path d="M3 6h6M3 12h6M3 18h6" />
  </OptionSvg>
);

const IconOptSpirale = () => (
  <OptionSvg>
    <rect x="9" y="2" width="12" height="20" rx="2" />
    <path d="M5 2c3 1 3 3 0 4s-3 3 0 4s3 3 0 4s-3 3 0 4s3 3 0 4" />
  </OptionSvg>
);

const IconOptFascetta = () => (
  <OptionSvg>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <rect
      x="2"
      y="10"
      width="20"
      height="4"
      rx="1"
      fill={OPT_ICON_STROKE}
      stroke="none"
    />
  </OptionSvg>
);

const IconOptCiappatura = () => (
  <OptionSvg>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M6 5h5M8.5 2.5v5" />
  </OptionSvg>
);

const IconOptNessuna = IconOptFronte;
const IconOptGrammaturaNormale = IconOptFronte;

const IconOptGrammaturaCartoncino = () => (
  <OptionSvg>
    <rect x="7" y="5" width="14" height="17" rx="2" opacity=".4" />
    <rect x="3" y="2" width="14" height="17" rx="2" />
  </OptionSvg>
);

const IconOptPlastificaSi = () => (
  <OptionSvg>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="m8 16 3-10M12 18l3-13" opacity=".7" />
  </OptionSvg>
);

const IconOptPlastificaNo = IconOptFronte;

const IconOptAuto = () => (
  <OptionSvg>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="m6 6 3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />
  </OptionSvg>
);

/* -------------------------------------------------------------------------- */
/* Sezioni del configuratore                                                  */
/* -------------------------------------------------------------------------- */

type StepSectionProps = {
  number: number;
  title: string;
  description?: string;
  summary?: string;
  children: React.ReactNode;
};

const StepSection: React.FC<StepSectionProps> = ({
  number,
  title,
  description,
  summary,
  children,
}) => {
  const [expanded, setExpanded] = useState(true);
  const panelId = React.useId();

  const collapsible = number >= 3 || title === "Colore e stampa";

  return (
    <section
      data-title={title}
      className={`pv-print-section ${collapsible ? "pv-print-section--wide" : ""
        }`}
    >
      <div className="pv-config-section-heading">
        <span className="pv-config-section-number" aria-hidden="true">
          {String(number).padStart(2, "0")}
        </span>

        <div className="pv-config-section-copy">
          <h3 className="pv-print-section-title">{title}</h3>

          {summary && (
            <Text className="pv-config-summary">{summary}</Text>
          )}
        </div>

        {collapsible && (
          <button
            type="button"
            className="pv-config-toggle"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? "Riduci" : "Espandi"}: ${title}`}
            onClick={() => setExpanded((previous) => !previous)}
          >
            {expanded ? "Riduci" : "Modifica"}
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        )}
      </div>

      {/* I controlli rimangono montati anche quando la sezione è chiusa. */}
      <div
        id={panelId}
        hidden={!expanded}
        className="pv-config-section-content"
      >
        {description && (
          <Text className="pv-print-section-description">
            {description}
          </Text>
        )}

        <div className="pv-config-options">{children}</div>
      </div>
    </section>
  );
};

type OptionGroupProps = {
  label?: string;
  hint?: string;
  children: React.ReactNode;
};

const OptionGroup: React.FC<OptionGroupProps> = ({
  label,
  hint,
  children,
}) => (
  <div className="pv-config-option" data-label={label || ""}>
    {label && (
      <Group justify="space-between" align="baseline" mb={12}>
        <p className="pv-config-option-label">{label}</p>

        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Group>
    )}

    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/* Pagina                                                                     */
/* -------------------------------------------------------------------------- */

const PdfPrintPage = () => {
  const navigate = useNavigate();

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const multiInputRef = useRef<MultiInputHandle>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);

  const handlePageDragEnter = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  }, []);

  const handlePageDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
  }, []);

  const handlePageDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);

    if (dragCounterRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handlePageDrop = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes("Files")) return;

    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const dropped = Array.from(event.dataTransfer.files || []);

    if (dropped.length) {
      multiInputRef.current?.addFiles(dropped);
    }
  }, []);

  const [formato, setFormato] = useState<number>(formatoEnum.A4);

  const [fileData, setFileData] = useState<
    { file: File; pages: number }[]
  >([]);

  const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
  const [numeroPDF, setNumeroPDF] = useState<number>(0);

  const [numeroCopie, setNumeroCopie] = useState<number>(1);
  const [preventivo, setPreventivo] = useState<string>("0.00");

  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<boolean>(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string>("");

  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(null);

  const [, setIsLoggedIn] = useState(false);

  const [inchiostro, setInchiostro] = useState<number>(
    inchiostroEnum.BIANCOENERO
  );

  const [pagina, setPagina] = useState<number>(
    paginaEnum.FRONTE_RETRO
  );

  const [layoutA4, setLayoutA4] = useState<number>(
    layoutA4Enum.VERTICALE
  );

  const [rilegatura, setRilegatura] = useState<number>(
    rilegaturaEnum.ANELLI
  );

  const [rilegaturaUnica, setRilegaturaUnica] = useState<number>(
    rilegaturaUnicaEnum.NO
  );

  const [fileSettings, setFileSettings] = useState<
    Record<number, FileSettings>
  >({});

  const [intervalloPagine, setIntervalloPagine] = useState<number>(1);
  const [daA, setDaA] = useState<string>("Tutte");

  const [intervalloPagineIsValid, setIntervalloPagineIsValid] =
    useState<boolean | undefined>(true);

  const [rangeAll, setRangeAllState] = useState<boolean>(true);
  const [rangeFrom, setRangeFrom] = useState<number | undefined>();
  const [rangeTo, setRangeTo] = useState<number | undefined>();

  const [layoutA3, setLayoutA3] = useState<number>(layoutA3Enum.AUTO);

  const [grammatura, setGrammatura] = useState<number>(
    grammaturaEnum.NORMALE
  );

  const [plastificazione, setPlastificazione] = useState<number>(
    plastificazioneEnum.SI
  );

  const [costiA4, setCostiA4] = useState({
    foglio: 0.03,
    biancoNero: 0.015,
    colore: 0.075,
    anelli: 1.5,
    fascetta: 1,
    ciappatura: 0.1,
    spirale: 2,
  });

  const [costiA3, setCostiA3] = useState({
    grammaturaNormale: 0.12,
    grammaturaCartoncino: 0.17,
    biancoNero: 0.03,
    colore: 0.13,
    plastificazione: 0.3,
  });

  const [plasticaOptions, setPlasticaOptions] = useState<
    PlasticaColor[]
  >([]);

  const [plasticaPriceMap, setPlasticaPriceMap] = useState<
    Record<string, number>
  >({});

  const [plasticheLoaded, setPlasticheLoaded] = useState(false);

  const [plasticaSelectedSingle, setPlasticaSelectedSingle] =
    useState<PlasticaColor | null>(null);

  const plasticaDisabled = useMemo(() => {
    const unica =
      numeroPDF === 1 ||
      rilegaturaUnica === rilegaturaUnicaEnum.SI;

    return (
      formato === formatoEnum.A4 &&
      unica &&
      (rilegatura === rilegaturaEnum.CIAPPATURA ||
        rilegatura === rilegaturaEnum.NESSUNA)
    );
  }, [formato, rilegatura, numeroPDF, rilegaturaUnica]);

  const rilegaturaVietaPlastica = useCallback(
    (value: number) =>
      value === rilegaturaEnum.CIAPPATURA ||
      value === rilegaturaEnum.NESSUNA,
    []
  );

  useEffect(() => {
    if (!plasticaDisabled) return;
    setPlasticaSelectedSingle(null);
  }, [plasticaDisabled]);

  /* Opzioni dei picker */

  const coloreCards = useMemo(
    () => [
      {
        title: "Bianco e nero",
        icon: <IconOptBiancoNero />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Colore",
        icon: <IconOptColore />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const paginaCards = useMemo(
    () => [
      {
        title: "Fronte-retro",
        icon: <IconOptFronteRetro />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Fronte",
        icon: <IconOptFronte />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const layoutA4Cards = useMemo(
    () => [
      {
        title: "Verticale (A4)",
        icon: <IconOptLayoutVert />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Orizzontale (A4)",
        icon: <IconOptLayoutOrizz />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "2 in 1 orizzontale",
        icon: <IconOpt2UpOrizz />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "2 in 1 verticale",
        icon: <IconOpt2UpVert />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const grammaturaCards = useMemo(
    () => [
      {
        title: "Normale",
        icon: <IconOptGrammaturaNormale />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Cartoncino",
        icon: <IconOptGrammaturaCartoncino />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const plastificazioneCards = useMemo(
    () => [
      {
        title: "Si (plastificazione)",
        icon: <IconOptPlastificaSi />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "No (plastificazione)",
        icon: <IconOptPlastificaNo />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const layoutA3Cards = useMemo(
    () => [
      {
        title: "Auto",
        icon: <IconOptAuto />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Orizzontale (A3)",
        icon: <IconOptLayoutOrizz />,
        disabled: false,
        errorMessage: "",
      },
      {
        title: "Verticale (A3)",
        icon: <IconOptLayoutVert />,
        disabled: false,
        errorMessage: "",
      },
    ],
    []
  );

  const rilegaturaCards = useMemo(
    () => [
      {
        title: "Anelli",
        icon: <IconOptAnelli />,
        disabled: numeroPaginePDF > 670 && intervalloPagine > 670,
        errorMessage: "Limite di 670 pagine",
      },
      {
        title: "Spirale",
        icon: <IconOptSpirale />,
        disabled: numeroPaginePDF > 500 && intervalloPagine > 500,
        errorMessage: "Limite di 500 pagine",
      },
      {
        title: "Fascetta",
        icon: <IconOptFascetta />,
        disabled: numeroPaginePDF > 80 && intervalloPagine > 80,
        errorMessage: "Limite di 80 pagine",
      },
      {
        title: "Ciappatura",
        icon: <IconOptCiappatura />,
        disabled: numeroPaginePDF > 35 && intervalloPagine > 35,
        errorMessage: "Limite di 40 pagine",
      },
      {
        title: "Nessuna",
        icon: <IconOptNessuna />,
        disabled: false,
        errorMessage: "",
      },
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

  const buildRilegaturaCardsForFile = useCallback((pages: number) => {
    return RILEGATURA_LIMITI.map((item) => ({
      title: rilegaturaEnumToToken(item.enumVal),
      icon: RILEGATURA_ICONS[item.enumVal],
      disabled: pages > item.max,
      errorMessage: item.label,
    })).concat([
      {
        title: "Nessuna",
        icon: RILEGATURA_ICONS[rilegaturaEnum.NESSUNA],
        disabled: false,
        errorMessage: "",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Prezzi pubblici */

  useEffect(() => {
    let alive = true;

    api
      .get<any>("/api/public/pricing-a4", { auth: false })
      .then((data) => {
        if (!alive || !data) return;

        if (
          typeof data.foglio === "number" &&
          typeof data.biancoNero === "number" &&
          typeof data.colore === "number" &&
          typeof data.anelli === "number" &&
          typeof data.fascetta === "number" &&
          typeof data.ciappatura === "number" &&
          typeof data.spirale === "number"
        ) {
          setCostiA4({
            foglio: data.foglio,
            biancoNero: data.biancoNero,
            colore: data.colore,
            anelli: data.anelli,
            fascetta: data.fascetta,
            ciappatura: data.ciappatura,
            spirale: data.spirale,
          });
        }
      })
      .catch(() => { });

    api
      .get<any>("/api/public/pricing-a3", { auth: false })
      .then((data) => {
        if (!alive || !data) return;

        if (
          typeof data.grammaturaNormale === "number" &&
          typeof data.grammaturaCartoncino === "number" &&
          typeof data.biancoNero === "number" &&
          typeof data.colore === "number" &&
          typeof data.plastificazione === "number"
        ) {
          setCostiA3({
            grammaturaNormale: data.grammaturaNormale,
            grammaturaCartoncino: data.grammaturaCartoncino,
            biancoNero: data.biancoNero,
            colore: data.colore,
            plastificazione: data.plastificazione,
          });
        }
      })
      .catch(() => { });

    return () => {
      alive = false;
    };
  }, []);

  /* Copertine dal gestionale */

  useEffect(() => {
    let alive = true;

    api
      .get<any[]>("/api/public/plastiche", { auth: false })
      .then((items) => {
        if (!alive) return;

        const cleaned: PlasticaDocItem[] = (items || [])
          .filter((item) => item && item.id != null)
          .map((item) => {
            const id = String(item.id);

            const name =
              typeof item.name === "string" ? item.name : id;

            const hex =
              typeof item.hex === "string" && isValidHex(item.hex)
                ? item.hex
                : "#cbd5e1";

            const priceEuro =
              typeof item.priceEuro === "number"
                ? item.priceEuro
                : 0;

            const enabled =
              typeof item.enabled === "boolean"
                ? item.enabled
                : true;

            const order =
              typeof item.sortOrder === "number"
                ? item.sortOrder
                : 0;

            return {
              id,
              name,
              hex,
              priceEuro,
              enabled,
              order,
              description:
                priceEuro > 0
                  ? `Extra ${fmtEuro(priceEuro)} €`
                  : undefined,
              disabled: !enabled,
            } as unknown as PlasticaDocItem;
          })
          .sort((a: any, b: any) => a.order - b.order);

        const priceMap: Record<string, number> = {};

        (cleaned as any[]).forEach((item) => {
          priceMap[item.id] = Number(item.priceEuro || 0);
        });

        setPlasticaPriceMap(priceMap);

        const pickerOptions: PlasticaColor[] = (
          cleaned as any[]
        ).map((item) => ({
          id: item.id,
          name: item.name,
          hex: item.hex,
          description: item.description,
          disabled: item.disabled,
        }));

        setPlasticaOptions(pickerOptions);

        setPlasticaSelectedSingle((previous) => {
          if (!previous) return null;

          const found = (cleaned as any[]).find(
            (item) => item.id === previous.id
          );

          if (!found || found.disabled) return null;

          return {
            id: found.id,
            name: found.name,
            hex: found.hex,
            description: found.description,
            disabled: found.disabled,
          };
        });

        setFileSettings((previous) => {
          const next: Record<number, FileSettings> = {
            ...previous,
          };

          Object.keys(next).forEach((key) => {
            const index = Number(key);
            const color = next[index].plastica;

            if (!color) return;

            const found = (cleaned as any[]).find(
              (item) => item.id === color.id
            );

            if (!found || found.disabled) {
              next[index] = {
                ...next[index],
                plastica: null,
              };
            }
          });

          return next;
        });

        setPlasticheLoaded(true);
      })
      .catch((error) => {
        console.error(error);
        setPlasticaOptions([]);
        setPlasticaPriceMap({});
        setPlasticaSelectedSingle(null);
        setPlasticheLoaded(true);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* Impostazioni indipendenti dei file */

  useEffect(() => {
    if (
      numeroPDF === 0 ||
      numeroPDF === 1 ||
      rilegaturaUnica === rilegaturaUnicaEnum.SI
    ) {
      setFileSettings({});
      return;
    }

    setFileSettings((previous) => {
      const next: Record<number, FileSettings> = {
        ...previous,
      };

      for (let index = 0; index < fileData.length; index++) {
        if (!(index in next)) {
          next[index] = {
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

      Object.keys(next).forEach((key) => {
        const index = Number(key);

        if (
          !Number.isFinite(index) ||
          index < 0 ||
          index >= fileData.length
        ) {
          delete next[index];
        }
      });

      return next;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroPDF, rilegaturaUnica, fileData.length]);

  useEffect(() => {
    if (formSubmitted || formSubmitting || formError) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [formSubmitted, formSubmitting, formError]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });

    return () => unsubscribe();
  }, []);

  const setPDFHandler = useCallback(
    (files: FileHandler[], totalPages: number) => {
      const validFiles = files
        .filter((item) => item.file !== null)
        .map((item) => ({
          file: item.file as File,
          pages: item.numPages || 0,
        }));

      setFileData(validFiles);
      setNumeroPDF(validFiles.length);
      setNumeroPaginePDF(totalPages);
    },
    []
  );

  const setCopiesHandler = useCallback(
    (value: number) => setNumeroCopie(value),
    []
  );

  const updateFileSetting = useCallback(
    (index: number, patch: Partial<FileSettings>) => {
      setFileSettings((previous) => {
        const current = previous[index];

        if (!current) return previous;

        return {
          ...previous,
          [index]: {
            ...current,
            ...patch,
          },
        };
      });
    },
    []
  );

  const updateFileRange = useCallback(
    (index: number, value: RangePagesData) => {
      setFileSettings((previous) => {
        const current = previous[index];

        if (!current) return previous;

        if (value.all) {
          return {
            ...previous,
            [index]: {
              ...current,
              rangeAll: true,
              rangeFrom: undefined,
              rangeTo: undefined,
              rangeValid: true,
            },
          };
        }

        return {
          ...previous,
          [index]: {
            ...current,
            rangeAll: false,
            rangeFrom: value.from,
            rangeTo: value.to,
            rangeValid: value.isValid === true,
          },
        };
      });
    },
    []
  );

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

      if (from === 0 && to === 0) {
        range = 0;
      }

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

  const computeNFogliPerCopiaA4 = (
    pagineSel: number,
    paginaMode: number,
    layoutMode: number
  ) => {
    let fogli =
      paginaMode === paginaEnum.FRONTE_RETRO
        ? Math.ceil(pagineSel / 2)
        : pagineSel;

    if (
      layoutMode === layoutA4Enum.DUEPAGORIZZ ||
      layoutMode === layoutA4Enum.DUEPAGVERT
    ) {
      fogli = Math.ceil(fogli / 2);
    }

    return Math.max(0, fogli);
  };

  const isRilegaturaUnicaA4 =
    numeroPDF === 1 ||
    rilegaturaUnica === rilegaturaUnicaEnum.SI;

  const prezzoRilegaturaFor = useCallback(
    (value: number) => {
      switch (value) {
        case rilegaturaEnum.ANELLI:
          return costiA4.anelli;
        case rilegaturaEnum.FASCETTA:
          return costiA4.fascetta;
        case rilegaturaEnum.CIAPPATURA:
          return costiA4.ciappatura;
        case rilegaturaEnum.SPIRALE:
          return costiA4.spirale;
        default:
          return 0;
      }
    },
    [costiA4]
  );

  const computeExtraPlasticaPerCopia = useCallback(() => {
    if (formato !== formatoEnum.A4) return 0;

    if (isRilegaturaUnicaA4) {
      if (rilegaturaVietaPlastica(rilegatura)) return 0;
      if (!plasticaSelectedSingle) return 0;

      return plasticaPriceMap[plasticaSelectedSingle.id] ?? 0;
    }

    let sum = 0;

    for (let index = 0; index < fileData.length; index++) {
      const settings = fileSettings[index];

      if (
        !settings ||
        rilegaturaVietaPlastica(settings.rilegatura)
      ) {
        continue;
      }

      if (!settings.plastica) continue;

      sum += plasticaPriceMap[settings.plastica.id] ?? 0;
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

    const total = isRilegaturaUnicaA4
      ? extraPerCopia * Math.max(0, numeroCopie)
      : fileData.reduce((sum, _, index) => {
        const settings = fileSettings[index];

        if (
          !settings ||
          !settings.plastica ||
          rilegaturaVietaPlastica(settings.rilegatura)
        ) {
          return sum;
        }

        return (
          sum +
          (plasticaPriceMap[settings.plastica.id] ?? 0) *
          Math.max(0, settings.numeroCopie)
        );
      }, 0);

    return total > 0 ? total : undefined;
  }, [
    formato,
    computeExtraPlasticaPerCopia,
    isRilegaturaUnicaA4,
    numeroCopie,
    fileData,
    fileSettings,
    plasticaPriceMap,
    rilegaturaVietaPlastica,
  ]);

  const plasticheLabel = useMemo(() => {
    if (formato !== formatoEnum.A4) return undefined;

    if (isRilegaturaUnicaA4) {
      if (rilegaturaVietaPlastica(rilegatura)) return undefined;

      const color = plasticaSelectedSingle;

      if (!color) return undefined;

      const extra = plasticaPriceMap[color.id] ?? 0;

      return `Copertina: ${color.name}${extra > 0 ? ` (+${fmtEuro(extra)} €)` : ""
        }`;
    }

    const parts: string[] = [];

    for (let index = 0; index < fileData.length; index++) {
      const color = fileSettings[index]?.plastica;

      if (!color) continue;

      const extra = plasticaPriceMap[color.id] ?? 0;

      parts.push(
        `File ${index + 1}: ${color.name}${extra > 0 ? ` (+${fmtEuro(extra)} €)` : ""
        }`
      );
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

  /* Etichette riepilogo */

  const rilegaturaLabel = useMemo(() => {
    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return rilegaturaEnumToToken(rilegatura);
    }

    return fileData
      .map(
        (_, index) =>
          `File ${index + 1}: ${rilegaturaEnumToToken(
            fileSettings[index]?.rilegatura ?? rilegatura
          )}`
      )
      .join(" • ");
  }, [isRilegaturaUnicaA4, rilegatura, fileSettings, fileData]);

  const coloreLabel = useMemo(() => {
    const label = (value: number) =>
      value === inchiostroEnum.BIANCOENERO
        ? "Bianco e nero"
        : "Colore";

    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return label(inchiostro);
    }

    return fileData
      .map(
        (_, index) =>
          `File ${index + 1}: ${label(
            fileSettings[index]?.inchiostro ?? inchiostro
          )}`
      )
      .join(" • ");
  }, [isRilegaturaUnicaA4, inchiostro, fileSettings, fileData]);

  const paginaLabel = useMemo(() => {
    const label = (value: number) =>
      value === paginaEnum.FRONTE_RETRO
        ? "Fronte-retro"
        : "Fronte";

    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return label(pagina);
    }

    return fileData
      .map(
        (_, index) =>
          `File ${index + 1}: ${label(
            fileSettings[index]?.pagina ?? pagina
          )}`
      )
      .join(" • ");
  }, [isRilegaturaUnicaA4, pagina, fileSettings, fileData]);

  const layoutLabel = useMemo(() => {
    const label = (value: number) => layoutA4ToToken(value);

    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return label(layoutA4);
    }

    return fileData
      .map(
        (_, index) =>
          `File ${index + 1}: ${label(
            fileSettings[index]?.layoutA4 ?? layoutA4
          )}`
      )
      .join(" • ");
  }, [isRilegaturaUnicaA4, layoutA4, fileSettings, fileData]);

  const intervalloLabel = useMemo(() => {
    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return daA;
    }

    return fileData
      .map((_, index) => {
        const settings = fileSettings[index];

        const label =
          !settings || settings.rangeAll
            ? "Tutte"
            : `${settings.rangeFrom}-${settings.rangeTo}`;

        return `File ${index + 1}: ${label}`;
      })
      .join(" • ");
  }, [isRilegaturaUnicaA4, daA, fileSettings, fileData]);

  const numeroCopieLabel = useMemo(() => {
    if (isRilegaturaUnicaA4 || fileData.length === 0) {
      return numeroCopie;
    }

    return fileData.reduce(
      (sum, _, index) =>
        sum + Math.max(0, fileSettings[index]?.numeroCopie ?? 0),
      0
    );
  }, [isRilegaturaUnicaA4, numeroCopie, fileSettings, fileData]);

  /* Preventivo */

  useEffect(() => {
    const calcoloPreventivoA4 = () => {
      if (
        !(
          numeroPDF === 1 ||
          rilegaturaUnica === rilegaturaUnicaEnum.SI
        )
      ) {
        let totaleSeparata = 0;

        for (let index = 0; index < fileData.length; index++) {
          const settings = fileSettings[index];

          if (!settings) continue;

          const pagineSel = settings.rangeAll
            ? fileData[index].pages
            : Math.max(
              0,
              (settings.rangeTo ?? 0) -
              (settings.rangeFrom ?? 0) +
              1
            );

          const fogliPerCopia = computeNFogliPerCopiaA4(
            pagineSel,
            settings.pagina,
            settings.layoutA4
          );

          const prezzoInchiostro =
            settings.inchiostro === inchiostroEnum.BIANCOENERO
              ? costiA4.biancoNero
              : costiA4.colore;

          const costoInchiostroPerFoglio =
            settings.pagina === paginaEnum.FRONTE_RETRO
              ? 2 * prezzoInchiostro
              : prezzoInchiostro;

          let perCopia =
            fogliPerCopia *
            (costiA4.foglio + costoInchiostroPerFoglio);

          perCopia += prezzoRilegaturaFor(settings.rilegatura);

          if (
            !rilegaturaVietaPlastica(settings.rilegatura) &&
            settings.plastica
          ) {
            perCopia +=
              plasticaPriceMap[settings.plastica.id] ?? 0;
          }

          totaleSeparata +=
            perCopia * Math.max(0, settings.numeroCopie);
        }

        return totaleSeparata.toFixed(2);
      }

      let totale = 0;
      const pagineSel = intervalloPagine;

      const prezzoInchiostro =
        inchiostro === inchiostroEnum.BIANCOENERO
          ? costiA4.biancoNero
          : costiA4.colore;

      const fogliPerCopia = computeNFogliPerCopiaA4(
        pagineSel,
        pagina,
        layoutA4
      );

      const costoInchiostroPerFoglio =
        pagina === paginaEnum.FRONTE_RETRO
          ? 2 * prezzoInchiostro
          : prezzoInchiostro;

      totale +=
        fogliPerCopia *
        (costiA4.foglio + costoInchiostroPerFoglio);

      totale *= numeroCopie;
      totale += prezzoRilegaturaFor(rilegatura) * numeroCopie;

      const extraPlasticaPerCopia =
        computeExtraPlasticaPerCopia();

      if (extraPlasticaPerCopia > 0) {
        totale += extraPlasticaPerCopia * numeroCopie;
      }

      if (numeroCopie === 0) totale = 0;

      return totale.toFixed(2);
    };

    const calcoloPreventivoA3 = () => {
      let totale = 0;
      const pagine = numeroPaginePDF;

      const fogli =
        pagina === paginaEnum.FRONTE_RETRO
          ? Math.ceil(pagine / 2)
          : pagine;

      const costoFoglio =
        grammatura === grammaturaEnum.CARTONCINO
          ? costiA3.grammaturaCartoncino
          : costiA3.grammaturaNormale;

      const costoInchiostro =
        inchiostro === inchiostroEnum.COLORE
          ? costiA3.colore
          : costiA3.biancoNero;

      const inchiostroTotale =
        pagina === paginaEnum.FRONTE_RETRO
          ? 2 * costoInchiostro
          : costoInchiostro;

      totale += fogli * (costoFoglio + inchiostroTotale);
      totale *= numeroCopie;

      if (plastificazione === plastificazioneEnum.SI) {
        totale +=
          costiA3.plastificazione * pagine * numeroCopie;
      }

      if (numeroCopie === 0) totale = 0;

      return totale.toFixed(2);
    };

    if (numeroPaginePDF > 0) {
      setPreventivo(
        formato === formatoEnum.A4
          ? calcoloPreventivoA4()
          : calcoloPreventivoA3()
      );
    }

    if (numeroPDF === 0) {
      setPreventivo("0.00");
    }
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

  /* Upload e creazione ordine */

  const uploadOwner = useRef<string | null>(null);

  const uploadedPaths = useRef(new WeakMap<File, string>());

  const orderAttempt = useRef<{
    signature: string;
    requestId: string;
  } | null>(null);

  const submitFormHandler = useCallback(
    async (
      arg1?: any,
      arg2?: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
      const isPaymentPayload = (value: any) =>
        value &&
        typeof value === "object" &&
        "method" in value;

      const payment = isPaymentPayload(arg1) ? arg1 : undefined;
      const event = isPaymentPayload(arg1) ? arg2 : arg1;

      event?.preventDefault();

      if (!auth.currentUser) {
        setLoginModalOpen(true);
        setFormSubmitting(false);
        setUploadProgress(null);
        return;
      }

      if (uploadOwner.current !== auth.currentUser.uid) {
        uploadOwner.current = auth.currentUser.uid;
        uploadedPaths.current = new WeakMap();
        orderAttempt.current = null;
      }

      if (payment?.method === "PAYPAL" && payment.confirmed) {
        setFormSubmitting(false);
        setUploadProgress(null);
        setFormSubmitted(true);
        return;
      }

      setFormSubmitting(true);
      setUploadProgress(null);

      const isValidA4 =
        formato === formatoEnum.A4
          ? !!intervalloPagineIsValid &&
          Object.values(fileSettings).every(
            (settings) => settings.rangeValid
          )
          : true;

      if (fileData.length === 0 || !isValidA4) {
        setFormSubmitting(false);
        return;
      }

      const isA4 = formato === formatoEnum.A4;

      try {
        const uploadedFiles: {
          storagePath: string;
          originalFileName: string;
        }[] = [];

        try {
          const totalBytes = fileData.reduce(
            (sum, item) => sum + item.file.size,
            0
          );

          const alreadyUploadedBytes = fileData
            .filter((item) => uploadedPaths.current.has(item.file))
            .reduce((sum, item) => sum + item.file.size, 0);

          let bytesDoneBeforeCurrentFile = alreadyUploadedBytes;

          setUploadProgress({
            loadedBytes: alreadyUploadedBytes,
            totalBytes,
            startedAt: Date.now(),
          });

          for (const item of fileData) {
            let storagePath = uploadedPaths.current.get(item.file);

            if (!storagePath) {
              storagePath = await uploadFileInChunks(
                item.file,
                (loadedBytes) => {
                  setUploadProgress((previous) =>
                    previous
                      ? {
                        ...previous,
                        loadedBytes:
                          bytesDoneBeforeCurrentFile + loadedBytes,
                      }
                      : previous
                  );
                }
              );

              uploadedPaths.current.set(item.file, storagePath);
              bytesDoneBeforeCurrentFile += item.file.size;
            }

            uploadedFiles.push({
              storagePath,
              originalFileName: item.file.name,
            });
          }

          setUploadProgress(null);
        } catch (uploadError) {
          console.error("Upload fallito:", uploadError);

          throw new Error(
            "Caricamento del PDF non riuscito. Controlla la connessione e riprova (per i file di grandi dimensioni serve una rete stabile)."
          );
        }

        const unicaA4 =
          numeroPDF === 1 ||
          rilegaturaUnica === rilegaturaUnicaEnum.SI;

        const singlePlasticaId =
          isA4 &&
            unicaA4 &&
            !rilegaturaVietaPlastica(rilegatura) &&
            plasticaSelectedSingle
            ? Number(plasticaSelectedSingle.id)
            : undefined;

        const files = uploadedFiles.map((item, index) => {
          if (!isA4 || unicaA4) {
            return {
              storagePath: item.storagePath,
              originalFileName: item.originalFileName,
              pages: fileData[index].pages,
              plasticaId: undefined,
              rilegatura: undefined,
            };
          }

          const settings = fileSettings[index];
          const rFile = settings?.rilegatura ?? rilegatura;

          const plasticaId =
            settings &&
              !rilegaturaVietaPlastica(rFile) &&
              settings.plastica
              ? Number(settings.plastica.id)
              : undefined;

          return {
            storagePath: item.storagePath,
            originalFileName: item.originalFileName,
            pages: fileData[index].pages,
            plasticaId,
            rilegatura: rilegaturaEnumToToken(rFile),
            inchiostro: inchiostroToToken(
              settings?.inchiostro ?? inchiostro
            ),
            pagina: paginaToToken(settings?.pagina ?? pagina),
            layout: layoutA4ToToken(
              settings?.layoutA4 ?? layoutA4
            ),
            rangeAll: settings?.rangeAll ?? true,
            rangeFrom:
              settings && !settings.rangeAll
                ? settings.rangeFrom
                : undefined,
            rangeTo:
              settings && !settings.rangeAll
                ? settings.rangeTo
                : undefined,
            numeroCopie: settings?.numeroCopie ?? 1,
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

        const numeroCopieTopLevel =
          isA4 && !unicaA4
            ? fileData.reduce(
              (sum, _, index) =>
                sum +
                Math.max(
                  0,
                  fileSettings[index]?.numeroCopie ?? 1
                ),
              0
            )
            : numeroCopie;

        const orderRequest = {
          tipo: isA4 ? "A4" : "A3",
          files,
          numeroPDF,
          numeroCopie: numeroCopieTopLevel,

          rangeAll: isA4 ? rangeAll : true,
          rangeFrom: isA4 ? rangeFrom : undefined,
          rangeTo: isA4 ? rangeTo : undefined,

          colore:
            inchiostro === inchiostroEnum.BIANCOENERO
              ? "Bianco e nero"
              : "Colore",

          pagina: paginaToken,
          inchiostro: inchiostroToToken(inchiostro),
          layout: layoutToken,

          rilegatura: isA4 ? rilegaturaToken : undefined,

          rilegaturaUnica: isA4
            ? rilegaturaUnica === rilegaturaUnicaEnum.SI
              ? "SI"
              : "NO"
            : undefined,

          plasticaId: singlePlasticaId,

          grammatura: !isA4
            ? grammatura === grammaturaEnum.CARTONCINO
              ? "Cartoncino"
              : "Normale"
            : undefined,

          plastificazione: !isA4
            ? plastificazione === plastificazioneEnum.SI
              ? "Si"
              : "No"
            : undefined,

          isStudent: !!delivery,

          delivery: delivery
            ? {
              dayLabel: delivery.dayLabel,
              timeRange: delivery.timeRange,
              dateISO: delivery.dateISO,
              weekday: delivery.weekday,
            }
            : undefined,

          metodoPagamento:
            payment?.method === "PAYPAL" ? "PAYPAL" : "CASH",
        };

        const signature = JSON.stringify(orderRequest);

        if (orderAttempt.current?.signature !== signature) {
          orderAttempt.current = {
            signature,
            requestId: crypto.randomUUID(),
          };
        }

        let saved: {
          id: string;
          totaleFinale: number;
        };

        try {
          saved = await api.post<{
            id: string;
            totaleFinale: number;
          }>("/api/orders", {
            ...orderRequest,
            requestId: orderAttempt.current.requestId,
          });
        } catch (orderError) {
          if (
            orderError instanceof ApiError &&
            (orderError.status === 403 || orderError.status === 404)
          ) {
            uploadedPaths.current = new WeakMap();
            orderAttempt.current = null;
          }

          console.error("Creazione ordine fallita:", orderError);

          throw new Error(
            "Impossibile inviare l'ordine. Il file è stato caricato correttamente: riprova tra qualche istante."
          );
        }

        setFormSubmitting(false);

        if (payment?.method !== "PAYPAL") {
          setFormSubmitted(true);
        }

        return saved;
      } catch (error) {
        setFormErrorMessage(
          error instanceof Error
            ? error.message
            : "Si è verificato un errore imprevisto. Riprova."
        );

        setFormError(true);
        setFormSubmitting(false);
        setUploadProgress(null);

        if (payment?.method === "PAYPAL") {
          throw error;
        }
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
      const timer = setTimeout(
        () => window.location.reload(),
        3000
      );

      return () => clearTimeout(timer);
    }
  }, [formSubmitted]);

  const canConfirmA4 =
    formato === formatoEnum.A4
      ? !!intervalloPagineIsValid &&
      Object.values(fileSettings).every(
        (settings) => settings.rangeValid
      )
      : true;

  /* ------------------------------------------------------------------------ */
  /* Interfaccia                                                              */
  /* ------------------------------------------------------------------------ */

  return (
    <Box
      className="pv-print-home"
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      <style>{PRINT_HOME_STYLES}</style>

      {isDraggingFile && (
        <div className="pv-print-drag-overlay">
          <div className="pv-print-drag-message">
            <IconFileText
              size={46}
              stroke={1.4}
              color="#e3c98b"
            />

            <Text
              style={{
                marginTop: 16,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 26,
                color: "#fff",
                textTransform: "uppercase",
              }}
            >
              Rilascia qui i tuoi PDF
            </Text>

            <Text
              size="sm"
              style={{
                marginTop: 8,
                color: "rgba(255,255,255,.65)",
              }}
            >
              Vengono accettati solo file PDF
            </Text>
          </div>
        </div>
      )}

      <div className="pv-print-header">
        <Header />
      </div>

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
          <Button
            variant="default"
            onClick={() => setLoginModalOpen(false)}
          >
            Annulla
          </Button>

          <Button
            color="gold"
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
          {formErrorMessage ||
            "Si è verificato un errore imprevisto. Riprova."}
        </Text>

        <Group justify="flex-end" mt="lg">
          <Button
            color="gold"
            onClick={() => setFormError(false)}
          >
            Ho capito
          </Button>
        </Group>
      </Modal>

      <Box component="main">
        <section
          className="pv-print-hero"
          aria-labelledby="pv-print-title"
        >
          <div
            className="pv-print-paper pv-print-paper--a4"
            aria-hidden="true"
          >
            <span>A4</span>
            <small>
              IDEE.
              <br />
              IN GRANDI
              <br />
              RISULTATI.
            </small>
          </div>

          <div
            className="pv-print-paper pv-print-paper--a3"
            aria-hidden="true"
          >
            <span>A3</span>
            <small>
              STESSA QUALITÀ.
              <br />
              PIÙ SPAZIO.
            </small>
          </div>

          <div className="pv-print-hero-inner">
            <div className="pv-print-intro">
              <Text className="pv-print-eyebrow">
                PHOTO &amp; VISION · STAMPA ONLINE
              </Text>

              <h1 id="pv-print-title">
                Stampa i tuoi PDF online
              </h1>

              <Text component="p" className="pv-print-subtitle">
                Dal file alla carta, in pochi minuti.
              </Text>

              <Text component="p" className="pv-print-description">
                Carica uno o più PDF, scegli formato e finiture.
                Al resto pensiamo noi.
              </Text>

              <div className="pv-print-benefits">
                <div>
                  <IconDiamond size={30} stroke={1.4} />
                  <span>
                    Qualità
                    <br />
                    professionale
                  </span>
                </div>

                <div>
                  <IconBolt size={30} stroke={1.4} />
                  <span>
                    Preventivo
                    <br />
                    immediato
                  </span>
                </div>

                <div>
                  <IconTruck size={30} stroke={1.4} />
                  <span>
                    Ritiro o
                    <br />
                    consegna
                  </span>
                </div>
              </div>
            </div>

            <div className="pv-print-upload">
              <Text component="h2">Carica i tuoi file</Text>

              <MultiInput
                ref={multiInputRef}
                onSendData={setPDFHandler}
              />
            </div>
          </div>
        </section>

        <div className="pv-print-banner">
          <Banner />
        </div>

        <ol
          className="pv-print-progress"
          aria-label="Fasi dell’ordine"
        >
          {[
            {
              title: "Carica",
              hint: "Carica i tuoi PDF",
            },
            {
              title: "Configura",
              hint: "Scegli formato e finiture",
            },
            {
              title: "Ordina",
              hint: "Controlla e conferma",
            },
          ].map((step, index) => {
            const current =
              formSubmitted || formSubmitting
                ? 2
                : fileData.length > 0
                  ? 1
                  : 0;

            return (
              <li
                key={step.title}
                className={index <= current ? "is-active" : ""}
                aria-current={
                  index === current ? "step" : undefined
                }
              >
                <span className="pv-print-progress-number">
                  {index + 1}
                </span>

                <span>
                  <strong>{step.title}</strong>
                  <small>{step.hint}</small>
                </span>
              </li>
            );
          })}
        </ol>

        <Container fluid className="pv-print-body">
          <Grid gutter={24} align="flex-start">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Box className="pv-print-configurator">
                <div className="pv-config-topbar">
                  <div>
                    <h2 className="pv-print-config-title">
                      La stampa, come la vuoi tu.
                    </h2>

                    <p>
                      Scegli i dettagli. Il preventivo si aggiorna
                      mentre configuri.
                    </p>
                  </div>

                  <span className="pv-config-counter">
                    {formato === formatoEnum.A4 ? "A4" : "A3"}
                    {" · "}
                    {numeroPDF} PDF
                  </span>
                </div>

                <div className="pv-print-settings-grid">
                  <StepSection
                    number={1}
                    title="Formato"
                    summary={
                      formato === formatoEnum.A4
                        ? "A4 · 210 × 297 mm"
                        : "A3 · 297 × 420 mm"
                    }
                    description="Il formato si applica a tutto l’ordine."
                  >
                    <OptionGroup>
                      <FormatoPicker
                        value={
                          formato === formatoEnum.A4 ? "A4" : "A3"
                        }
                        onChange={newValue}
                        bare
                      />
                    </OptionGroup>
                  </StepSection>

                  {formato === formatoEnum.A4 && (
                    <StepSection
                      number={2}
                      title="Organizza i documenti"
                      summary={
                        rilegaturaUnica === rilegaturaUnicaEnum.SI
                          ? "Un unico fascicolo"
                          : "Fascicoli separati"
                      }
                      description="Unisci i PDF oppure configura ogni fascicolo."
                    >
                      <OptionGroup>
                        <RilegaturaUnicaPicker
                          value={
                            rilegaturaUnica === rilegaturaUnicaEnum.SI
                              ? "SI"
                              : "NO"
                          }
                          disabled={numeroPDF === 1}
                          disabledHint="Disponibile soltanto per 2 o più PDF"
                          onChange={(value) =>
                            newValue(
                              value === "SI"
                                ? "Si (rilegatura unica)"
                                : "No (rilegatura unica)"
                            )
                          }
                          bare
                        />
                      </OptionGroup>
                    </StepSection>
                  )}

                  {formato === formatoEnum.A3 && (
                    <StepSection
                      number={2}
                      title="Colore e stampa"
                      summary={`${inchiostro === inchiostroEnum.COLORE
                        ? "A colori"
                        : "Bianco e nero"
                        } · ${pagina === paginaEnum.FRONTE
                          ? "Solo fronte"
                          : "Fronte-retro"
                        }`}
                      description="Colore, lati di stampa e tipo di foglio."
                    >
                      <OptionGroup label="Colore">
                        <CardGridPicker
                          title="Colore:"
                          value={
                            inchiostro === inchiostroEnum.BIANCOENERO
                              ? "Bianco e nero"
                              : "Colore"
                          }
                          onChange={newValue}
                          options={coloreCards}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Gestione pagina">
                        <CardGridPicker
                          title="Gestione pagina:"
                          value={
                            pagina === paginaEnum.FRONTE_RETRO
                              ? "Fronte-retro"
                              : "Fronte"
                          }
                          onChange={newValue}
                          options={paginaCards}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Grammatura">
                        <CardGridPicker
                          title="Grammatura:"
                          value={
                            grammatura === grammaturaEnum.CARTONCINO
                              ? "Cartoncino"
                              : "Normale"
                          }
                          onChange={newValue}
                          options={grammaturaCards}
                          cols={{ base: 2, md: 2, xl: 2 }}
                          bare
                        />
                      </OptionGroup>

                      <OptionGroup label="Plastificazione">
                        <CardGridPicker
                          title="Plastificazione:"
                          value={
                            plastificazione === plastificazioneEnum.SI
                              ? "Si (plastificazione)"
                              : "No (plastificazione)"
                          }
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
                            layoutA3 === layoutA3Enum.AUTO
                              ? "Auto"
                              : layoutA3 === layoutA3Enum.ORIZZONTALE
                                ? "Orizzontale (A3)"
                                : "Verticale (A3)"
                          }
                          onChange={newValue}
                          options={layoutA3Cards}
                          cols={{ base: 2, md: 3, xl: 3 }}
                          bare
                        />
                      </OptionGroup>
                    </StepSection>
                  )}

                  {formato === formatoEnum.A4 &&
                    isRilegaturaUnicaA4 && (
                      <>
                        <StepSection
                          number={3}
                          title="Opzioni di stampa"
                          summary={`${coloreLabel} · ${paginaLabel} · ${layoutLabel}`}
                          description="Personalizza la resa e la disposizione delle pagine."
                        >
                          <OptionGroup label="Colore">
                            <CardGridPicker
                              title="Colore:"
                              value={
                                inchiostro ===
                                  inchiostroEnum.BIANCOENERO
                                  ? "Bianco e nero"
                                  : "Colore"
                              }
                              onChange={newValue}
                              options={coloreCards}
                              bare
                            />
                          </OptionGroup>

                          <OptionGroup label="Gestione pagina">
                            <CardGridPicker
                              title="Gestione pagina:"
                              value={
                                pagina === paginaEnum.FRONTE_RETRO
                                  ? "Fronte-retro"
                                  : "Fronte"
                              }
                              onChange={newValue}
                              options={paginaCards}
                              bare
                            />
                          </OptionGroup>

                          <OptionGroup label="Layout">
                            <CardGridPicker
                              title="Layout:"
                              value={layoutA4PickerToken(layoutA4)}
                              onChange={newValue}
                              options={layoutA4Cards}
                              cols={{ base: 2, md: 4, xl: 4 }}
                              bare
                            />
                          </OptionGroup>
                        </StepSection>

                        <StepSection
                          number={4}
                          title="Rilegatura e copertina"
                          summary={rilegaturaLabel}
                          description="Scegli la finitura del tuo fascicolo."
                        >
                          <OptionGroup label="Tipo di rilegatura">
                            <CardGridPicker
                              title="Rilegatura:"
                              value={rilegaturaEnumToToken(rilegatura)}
                              onChange={newValue}
                              options={rilegaturaCards}
                              cols={{ base: 2, md: 5, xl: 5 }}
                              bare
                            />
                          </OptionGroup>

                          {plasticheLoaded && (
                            <OptionGroup>
                              {plasticaDisabled ? (
                                <Text size="sm" c="dimmed">
                                  La plastica colorata non è
                                  disponibile con rilegatura:{" "}
                                  {rilegatura ===
                                    rilegaturaEnum.CIAPPATURA
                                    ? "Ciappatura"
                                    : "Nessuna"}
                                  .
                                </Text>
                              ) : (
                                <PlasticaColorePicker
                                  label="Colore copertina"
                                  colors={plasticaOptions}
                                  value={
                                    plasticaSelectedSingle?.id ??
                                    null
                                  }
                                  onChange={setPlasticaSelectedSingle}
                                  columns={{
                                    base: 2,
                                    sm: 3,
                                    md: 4,
                                    lg: 4,
                                  }}
                                  withPreviewCard
                                  bare
                                />
                              )}
                            </OptionGroup>
                          )}
                        </StepSection>

                        <StepSection
                          number={5}
                          title="Pagine e copie"
                          summary={`${intervalloLabel} · ${numeroCopieLabel} cop.`}
                          description="Seleziona le pagine e la quantità."
                        >
                          <OptionGroup label="Pagine da stampare">
                            <IntervalloPagine
                              onSendData={setRangePagesHandler}
                              maxValue={numeroPaginePDF}
                              disable={numeroPDF >= 2}
                              errorMessage="Disponibile soltanto per un singolo PDF"
                              hideTitle
                              bare
                            />
                          </OptionGroup>

                          <OptionGroup label="Numero copie">
                            <NumeroCopie
                              value={numeroCopie}
                              onSendData={setCopiesHandler}
                              bare
                            />
                          </OptionGroup>
                        </StepSection>
                      </>
                    )}

                  {formato === formatoEnum.A4 &&
                    !isRilegaturaUnicaA4 && (
                      <StepSection
                        number={3}
                        title="Impostazioni per ciascun PDF"
                        summary={`${numeroPDF} documenti · configurazione individuale`}
                        description="Ogni file è un fascicolo a sé: colore, layout, rilegatura, copertina, pagine e copie possono essere diversi."
                      >
                        {fileData.length === 0 && (
                          <div className="pv-print-empty">
                            <IconFileText size={28} stroke={1.3} />

                            <Text fw={600}>
                              I tuoi documenti appariranno qui
                            </Text>

                            <Text size="sm">
                              Carica un PDF per scegliere colore,
                              rilegatura, pagine e copie.
                            </Text>
                          </div>
                        )}

                        <Accordion
                          variant="separated"
                          radius="md"
                          defaultValue="file-0"
                          chevronSize={16}
                          styles={{
                            panel: {
                              padding: "0 12px 14px",
                            },
                            label: {
                              padding: 0,
                            },
                          }}
                        >
                          {fileData.map((file, index) => {
                            const settings = fileSettings[index];

                            if (!settings) return null;

                            const fileVietaPlastica =
                              rilegaturaVietaPlastica(
                                settings.rilegatura
                              );

                            const summary = `${rilegaturaEnumToToken(
                              settings.rilegatura
                            )}${!fileVietaPlastica &&
                              settings.plastica
                              ? ` · ${settings.plastica.name}`
                              : ""
                              } · ${settings.numeroCopie} cop.`;

                            return (
                              <Accordion.Item
                                key={index}
                                value={`file-${index}`}
                              >
                                <Accordion.Control>
                                  <Group
                                    justify="space-between"
                                    wrap="nowrap"
                                    gap="xs"
                                  >
                                    <Text
                                      fw={700}
                                      size="sm"
                                      style={{
                                        color: "#182331",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {file.file.name}{" "}
                                      <span
                                        style={{
                                          fontWeight: 500,
                                          color: "#73808d",
                                        }}
                                      >
                                        · {file.pages} pag.
                                      </span>
                                    </Text>

                                    <Text
                                      size="xs"
                                      fw={600}
                                      style={{
                                        color: "#96773d",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {summary}
                                    </Text>
                                  </Group>
                                </Accordion.Control>

                                <Accordion.Panel>
                                  <div className="pv-file-settings">
                                    <OptionGroup label="Colore">
                                      <CardGridPicker
                                        title="Colore:"
                                        value={
                                          settings.inchiostro ===
                                            inchiostroEnum.BIANCOENERO
                                            ? "Bianco e nero"
                                            : "Colore"
                                        }
                                        onChange={(value) =>
                                          updateFileSetting(index, {
                                            inchiostro:
                                              value === "Colore"
                                                ? inchiostroEnum.COLORE
                                                : inchiostroEnum.BIANCOENERO,
                                          })
                                        }
                                        options={coloreCards}
                                        bare
                                      />
                                    </OptionGroup>

                                    <OptionGroup label="Gestione pagina">
                                      <CardGridPicker
                                        title="Gestione pagina:"
                                        value={
                                          settings.pagina ===
                                            paginaEnum.FRONTE_RETRO
                                            ? "Fronte-retro"
                                            : "Fronte"
                                        }
                                        onChange={(value) =>
                                          updateFileSetting(index, {
                                            pagina:
                                              value === "Fronte"
                                                ? paginaEnum.FRONTE
                                                : paginaEnum.FRONTE_RETRO,
                                          })
                                        }
                                        options={paginaCards}
                                        bare
                                      />
                                    </OptionGroup>

                                    <OptionGroup label="Layout">
                                      <CardGridPicker
                                        title="Layout:"
                                        value={layoutA4PickerToken(
                                          settings.layoutA4
                                        )}
                                        onChange={(token) =>
                                          updateFileSetting(index, {
                                            layoutA4:
                                              layoutA4TokenToEnum(
                                                token
                                              ),
                                          })
                                        }
                                        options={layoutA4Cards}
                                        cols={{
                                          base: 2,
                                          md: 4,
                                          xl: 4,
                                        }}
                                        bare
                                      />
                                    </OptionGroup>

                                    <OptionGroup label="Rilegatura e copertina">
                                      <Stack gap="md">
                                        <CardGridPicker
                                          title="Rilegatura:"
                                          value={rilegaturaEnumToToken(
                                            settings.rilegatura
                                          )}
                                          onChange={(token) =>
                                            updateFileSetting(
                                              index,
                                              {
                                                rilegatura:
                                                  rilegaturaTokenToEnum(
                                                    token
                                                  ),
                                              }
                                            )
                                          }
                                          options={buildRilegaturaCardsForFile(
                                            file.pages
                                          )}
                                          cols={{
                                            base: 2,
                                            md: 5,
                                            xl: 5,
                                          }}
                                          bare
                                        />

                                        {plasticheLoaded &&
                                          (fileVietaPlastica ? (
                                            <Text
                                              size="xs"
                                              c="dimmed"
                                            >
                                              Plastica non
                                              disponibile con
                                              rilegatura{" "}
                                              {settings.rilegatura ===
                                                rilegaturaEnum.CIAPPATURA
                                                ? "Ciappatura"
                                                : "Nessuna"}
                                              .
                                            </Text>
                                          ) : (
                                            <PlasticaColorePicker
                                              label="Colore copertina"
                                              colors={plasticaOptions}
                                              value={
                                                settings.plastica
                                                  ?.id ?? null
                                              }
                                              onChange={(color) =>
                                                updateFileSetting(
                                                  index,
                                                  {
                                                    plastica: color,
                                                  }
                                                )
                                              }
                                              columns={{
                                                base: 1,
                                                sm: 3,
                                                md: 4,
                                                lg: 4,
                                              }}
                                              withPreviewCard
                                              bare
                                            />
                                          ))}
                                      </Stack>
                                    </OptionGroup>

                                    <OptionGroup label="Intervallo pagine">
                                      <IntervalloPagine
                                        key={`range-${index}`}
                                        onSendData={(value) =>
                                          updateFileRange(
                                            index,
                                            value
                                          )
                                        }
                                        maxValue={file.pages}
                                        disable={false}
                                        errorMessage=""
                                        hideTitle
                                        bare
                                      />
                                    </OptionGroup>

                                    <OptionGroup label="Numero copie">
                                      <NumeroCopie
                                        key={`copies-${index}`}
                                        value={settings.numeroCopie}
                                        onSendData={(value) =>
                                          updateFileSetting(index, {
                                            numeroCopie: value,
                                          })
                                        }
                                        bare
                                      />
                                    </OptionGroup>
                                  </div>
                                </Accordion.Panel>
                              </Accordion.Item>
                            );
                          })}
                        </Accordion>
                      </StepSection>
                    )}
                </div>
              </Box>
            </Grid.Col>

            <Grid.Col
              span={{ base: 12, md: 4 }}
              className="pv-summary-column"
            >
              <Box className="pv-print-summary">
                {formato === formatoEnum.A4 ? (
                  <RiepilogoOrdine
                    numeroPDF={numeroPDF}
                    inchiostro={coloreLabel}
                    pagina={paginaLabel}
                    layout={layoutLabel}
                    rilegatura={rilegaturaLabel}
                    rilegaturaUnica={
                      rilegaturaUnica === 0 ? "Si" : "No"
                    }
                    intervalloPagine={intervalloLabel}
                    numeroCopie={numeroCopieLabel}
                    plasticheLabel={plasticheLabel}
                    plasticheExtraEuro={plasticheExtraEuro}
                    prezzo={preventivo}
                    onConfirmOrder={submitFormHandler}
                    disabled={
                      fileData.length === 0 ||
                      !canConfirmA4 ||
                      formSubmitting
                    }
                    loading={formSubmitting}
                    submitted={formSubmitted}
                    uploadProgress={uploadProgress}
                  />
                ) : (
                  <RiepilogoOrdineA3
                    numeroPDF={numeroPDF}
                    numeroPagine={numeroPaginePDF}
                    numeroCopie={numeroCopie}
                    grammatura={
                      grammatura === 1 ? "Cartoncino" : "Normale"
                    }
                    inchiostro={
                      inchiostro === 1
                        ? "Colore"
                        : "Bianco e nero"
                    }
                    pagina={
                      pagina === 1 ? "Fronte" : "Fronte-retro"
                    }
                    layout={
                      layoutA3 === 0
                        ? "Orizzontale"
                        : layoutA3 === 1
                          ? "Verticale"
                          : "Auto"
                    }
                    plastificazione={
                      plastificazione === 0 ? "Si" : "No"
                    }
                    prezzo={preventivo}
                    onConfirmOrder={submitFormHandler}
                    disabled={
                      fileData.length === 0 || formSubmitting
                    }
                    loading={formSubmitting}
                    submitted={formSubmitted}
                    uploadProgress={uploadProgress}
                  />
                )}
              </Box>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      <div className="pv-print-footer">
        <Footer />
      </div>
    </Box>
  );
};

export default PdfPrintPage;