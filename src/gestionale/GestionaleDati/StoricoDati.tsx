// src/gestionale/StoricoDati/StoricoDati.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../../backend/firebase";
import {
  collection,
  getDocs,
  getDoc,
  query,
  writeBatch,
  doc,
  updateDoc,
  deleteField,
} from "firebase/firestore";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "./StoricoDati.module.css";
import Header from "../../components/HeaderComponents/Header";

type DettaglioRow = {
  Cliente: string;
  Data: string;
  Metodo: string;
  "Prezzo Lordo (€)": string;        // lordo *base* (senza delta)
  "Variazione (€)"?: string;         // delta manuale
  "Lordo (effettivo) (€)"?: string;  // lordo + delta
  "Imponibile (€)": string;
  "IVA (€)": string;
  "Fee PayPal (€)": string;
  "Trasporto (€)": string;
  "Costi interni (€)": string;
  nFogli: number | string;
  "Margine netto (€)": string;
  Note: string;
  Congelato?: "Sì" | "No";
};

// === Costi unitari separati ===
type UnitCostsA4 = {
  foglio: number;
  biancoNero: number;
  colore: number;
  anelli: number;
  fascetta: number;
  ciappatura: number;
  spirale: number;
};

type UnitCostsA3 = {
  foglio: number;
  biancoNero: number;
  colore: number;
  plastificazione: number;
};

const StoricoDati: React.FC = () => {
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [ricercaUtente, setRicercaUtente] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("Tutti");

  // Anteprima DETTAGLIO
  const [detailA4, setDetailA4] = useState<DettaglioRow[]>([]);
  const [detailA3, setDetailA3] = useState<DettaglioRow[]>([]);
  const [totaleA4, setTotaleA4] = useState(0);
  const [totaleA3, setTotaleA3] = useState(0);

  // Modal eliminazione
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deleteItems, setDeleteItems] = useState<any[]>([]);
  const [deleteSummary, setDeleteSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  // Popup successo eliminazione
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteSuccessInfo, setDeleteSuccessInfo] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  // Config tasse (da configTasse/fees)
  const [ivaRate, setIvaRate] = useState<number>(0.22);       // 22%
  const [ppPercent, setPpPercent] = useState<number>(0.0349); // 3.49%
  const [ppFixed, setPpFixed] = useState<number>(0.35);       // €
  const [transportFeeEuro, setTransportFeeEuro] = useState<number>(1); // €
  const [configsReady, setConfigsReady] = useState(false);
  const autoTriggerRef = useRef(false);

  // === Freeze modal state ===
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeItems, setFreezeItems] = useState<any[]>([]);
  const [freezeSummary, setFreezeSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [freezing, setFreezing] = useState(false);
  // Popup successo freeze
  const [showFreezeSuccess, setShowFreezeSuccess] = useState(false);
  const [freezeSuccessInfo, setFreezeSuccessInfo] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  // Costi unitari
  const [unitA4, setUnitA4] = useState<UnitCostsA4>({
    foglio: 0, biancoNero: 0, colore: 0, anelli: 0, fascetta: 0, ciappatura: 0, spirale: 0,
  });
  const [unitA3, setUnitA3] = useState<UnitCostsA3>({
    foglio: 0, biancoNero: 0, colore: 0, plastificazione: 0,
  });

  // Costi extra configurabili
  const [extrasA4, setExtrasA4] = useState<any[]>([]);
  const [extrasA3, setExtrasA3] = useState<any[]>([]);

  // === Edit modal (variazione manuale) ===
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDelta, setEditDelta] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [editDocRef, setEditDocRef] = useState<any>(null); // firestore doc ref corrente


  const [docsA4, setDocsA4] = useState<any[]>([]);
  const [docsA3, setDocsA3] = useState<any[]>([]);


  // ------- Helpers -------
  const getManualDelta = (row: any) =>
    Number.isFinite(row?.manualAdjustment?.delta) ? Number(row.manualAdjustment.delta) : 0;

  const getManualReason = (row: any) =>
    (row?.manualAdjustment?.reason ?? "").toString();

 const normalize = useCallback((s?: string) =>
  (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim(),
[],);

const matchesUtente = useCallback((ordine: any) => {
  const raw = ricercaUtente?.trim();
  if (!raw) return true;

  const q = normalize(raw).replace(/\s+/g, " ");
  const tokens = q.split(" ").filter(Boolean);

  const nome = normalize(ordine?.nome);
  const cognome = normalize(ordine?.cognome);
  const email = normalize(ordine?.email);
  const telefono = (ordine?.telefono ?? "").toString().replace(/\D/g, "");

  const full = `${nome} ${cognome}`.trim();
  const fullRev = `${cognome} ${nome}`.trim();

  const haystacks = [nome, cognome, full, fullRev, email, telefono];
  return tokens.every((t) => haystacks.some((h) => h.includes(t)));
}, [ricercaUtente, normalize]);

  const resetFiltri = () => {
    setDataInizio("");
    setDataFine("");
    setRicercaUtente("");
    setFiltroTipo("Tutti");
    setDetailA4([]);
    setDetailA3([]);
    setTotaleA4(0);
    setTotaleA3(0);
  };

  const formatFilename = (base: string) => {
    const parts: string[] = [base];
    if (ricercaUtente.trim()) {
      const nomePulito = ricercaUtente.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
      parts.push(nomePulito);
    }
    if (dataInizio) parts.push("dal_" + dataInizio);
    if (dataFine) parts.push("al_" + dataFine);
    return parts.join("_") + ".xlsx";
  };

  const withinDateRange = useCallback((ts: Date | undefined | null) => {
  const inizio = dataInizio ? new Date(dataInizio) : null;
  const fine = dataFine ? new Date(dataFine + "T23:59:59") : null;
  if (!ts) return false;
  if (inizio && ts < inizio) return false;
  if (fine && ts > fine) return false;
  return true;
}, [dataInizio, dataFine]);

const getRowMillis = useCallback((row: any) => {
  const ts = row?.timestamp?.toDate?.();
  return ts instanceof Date ? ts.getTime() : 0;
}, []);

  // Apri la modale per editare
  const openEdit = (docRef: any, data: any) => {
    setEditDocRef(docRef);
    setEditDelta(
      Number.isFinite(data?.manualAdjustment?.delta)
        ? String(Number(data.manualAdjustment.delta))
        : ""
    );
    setEditReason((data?.manualAdjustment?.reason ?? "").toString());
    setShowEditModal(true);
  };

  // Salva su Firestore
  const saveEdit = async () => {
    try {
      if (!editDocRef) return;
      const deltaNum = Number(editDelta);
      const hasDelta = !Number.isNaN(deltaNum) && deltaNum !== 0;
      const reason = (editReason || "").trim();

      if (!hasDelta && !reason) {
        // cancella il blocco manualAdjustment se vuoto
        await updateDoc(editDocRef, { manualAdjustment: deleteField() });
      } else {
        await updateDoc(editDocRef, {
          manualAdjustment: {
            delta: hasDelta ? Number(deltaNum.toFixed(2)) : 0,
            reason,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      setShowEditModal(false);
      setEditDocRef(null);
      setEditDelta("");
      setEditReason("");
      // ricarica l’anteprima per riflettere i nuovi totali
      await generaAnteprima();
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio della variazione.");
    }
  };


  // ======== Config (IVA, PayPal, Costi unitari + Extra) ========
  useEffect(() => {
    (async () => {
      try {
        // Tasse
        const tasseRef = doc(db, "configTasse", "fees");
        const tasseSnap = await getDoc(tasseRef);
        if (tasseSnap.exists()) {
          const t: any = tasseSnap.data();
          if (typeof t.ivaRate === "number") setIvaRate(t.ivaRate);
          if (typeof t.paypalPercent === "number") setPpPercent(t.paypalPercent);
          if (typeof t.paypalFixed === "number") setPpFixed(t.paypalFixed);
          if (typeof t.transportFeeEuro === "number") setTransportFeeEuro(t.transportFeeEuro);
        }

        const normalizeExtras = (arr: any[]) =>
          (Array.isArray(arr) ? arr : [])
            .map((x: any) => ({
              attivo: Boolean(x?.attivo ?? true),
              nome: String(x?.nome ?? ""),
              unita: String(x?.unita ?? "per_ordine").toLowerCase().trim(),
              costo: Number(x?.costo ?? 0) || 0,
              campo: (x?.campo ?? "") ? String(x.campo).trim() : "",
              match: (x?.match ?? "") ? String(x.match).trim() : "",
            }))
            .filter((x) => x.nome.trim().length > 0);

        // ===== A4 =====
        const a4Ref = doc(db, "configA4", "costi");
        const a4Snap = await getDoc(a4Ref);
        if (a4Snap.exists()) {
          const d: any = a4Snap.data();
          const i = d?.interni ?? {};
          setUnitA4({
            foglio: Number(i?.foglio ?? d?.foglio ?? 0) || 0,
            biancoNero: Number(i?.biancoNero ?? d?.biancoNero ?? 0) || 0,
            colore: Number(i?.colore ?? d?.colore ?? 0) || 0,
            anelli: Number(i?.anelli ?? d?.anelli ?? 0) || 0,
            fascetta: Number(i?.fascetta ?? d?.fascetta ?? 0) || 0,
            ciappatura: Number(i?.ciappatura ?? d?.ciappatura ?? 0) || 0,
            spirale: Number(i?.spirale ?? d?.spirale ?? 0) || 0,
          });
          setExtrasA4(normalizeExtras(d?.costiAcquisto));
        } else {
          setExtrasA4([]);
        }

        // ===== A3 =====
        const a3Ref = doc(db, "configA3", "costi");
        const a3Snap = await getDoc(a3Ref);
        if (a3Snap.exists()) {
          const d: any = a3Snap.data();
          const i = d?.interni ?? {};
          setUnitA3({
            foglio: Number(i?.foglio ?? d?.foglio ?? d?.grammaturaNormale ?? 0) || 0,
            biancoNero: Number(i?.biancoNero ?? d?.biancoNero ?? 0) || 0,
            colore: Number(i?.colore ?? d?.colore ?? 0) || 0,
            plastificazione: Number(i?.plastificazione ?? d?.plastificazione ?? 0) || 0,
          });
          setExtrasA3(normalizeExtras(d?.costiAcquisto));
        } else {
          setExtrasA3([]);
        }
      } catch (e) {
        console.error("Errore caricamento config tasse/costi interni", e);
      } finally {
        setConfigsReady(true);
      }
    })();
  }, []);

  // ======== Helpers economici ========
  const num = (v: any, d = 0) => (typeof v === "number" ? v : Number(v ?? d)) || d;

  const detectMetodo = (row: any): "PayPal" | "Contanti" | "n/d" => {
    const raw = (row?.metodoPagamento ?? row?.metodo ?? "").toString().toLowerCase();
    if (raw.includes("paypal")) return "PayPal";
    if (raw.includes("cash") || raw.includes("contanti")) return "Contanti";
    if (row?.orderId || row?.captureId || row?.payerEmail) return "PayPal";
    if (typeof row?.statoPagamento === "string" && row.statoPagamento.toLowerCase().includes("consegna")) return "Contanti";
    return "n/d";
  };

  const detectTransport = (row: any): number => {
    if (Number.isFinite(row?.breakdown?.trasporto)) return Number(row.breakdown.trasporto);
    if (Number.isFinite(row?.trasporto)) return Number(row.trasporto);
    if (Number.isFinite(row?.totaleFinale)) return 0;
    return transportFeeEuro;
  };

  const getLordo = (row: any): number => {
    if (Number.isFinite(row?.breakdown?.totaleFinale)) {
      return Number(row.breakdown.totaleFinale);
    }
    if (Number.isFinite(row?.totaleFinale)) {
      return Number(row.totaleFinale);
    }
    const imp = Number.isFinite(row?.imponibile)
      ? Number(row.imponibile)
      : num(row?.breakdown?.imponibile, num(row?.prezzo, 0));
    const tr = detectTransport(row);
    return imp * (1 + ivaRate) + tr;
  };

  const paypalFeeOf = (row: any, lordo: number, metodo: string) => {
    if (Number.isFinite(row?.breakdown?.feePayPal)) return Number(row.breakdown.feePayPal);
    if (Number.isFinite(row?.paypalFee)) return Number(row.paypalFee);
    return metodo === "PayPal" ? lordo * ppPercent + ppFixed : 0;
  };

  const sumNFogli = (data: any) => {
    if (Number.isFinite(data?.nFogli)) return Number(data.nFogli);
    if (Array.isArray(data?.righe)) {
      return data.righe.reduce((acc: number, r: any) => acc + (Number(r?.fogli) || 0), 0);
    }
    const pagine = Number(data?.pagineTotali ?? data?.pagine ?? 0);
    const fronteRetro = String(data?.pagina || "").toLowerCase().includes("retro");
    let fogli = pagine > 0 ? (fronteRetro ? pagine / 2 : pagine) : 0;
    const copie = Number(data?.copie ?? data?.numeroCopie ?? 1);
    if (copie > 1) fogli *= copie;
    return Math.round(fogli) || 0;
  };

  const getCopie = (row: any) =>
    Number(row?.copie ?? row?.numeroCopie ?? 1) || 1;

  const isRilegaturaUnicaA4 = (row: any) => {
    const unica = String(row?.rilegaturaUnica ?? "").toLowerCase();
    return ["si", "sì", "true", "on", "1"].some((k) => unica.includes(k));
  };

  const splitColoriBN = (row: any, nFogli: number) => {
    const paginaStr = String(row?.pagina ?? row?.gestionePagina ?? "").toLowerCase();
    const isFronteRetro = paginaStr.includes("retro");
    const sidesPerSheet = isFronteRetro ? 2 : 1;

    const inkStr = String(row?.inchiostro ?? row?.colore ?? "").toLowerCase();
    if (inkStr.includes("color")) {
      return { nColore: nFogli * sidesPerSheet, nBN: 0 };
    }
    return { nColore: 0, nBN: nFogli * sidesPerSheet };
  };

  const quantitaRilegaturaA4 = (row: any) => {
    const r = `${row?.rilegatura ?? ""} ${row?.fascetta ?? ""}`.toLowerCase();
    const fascicoli = numFascicoliA4(row);
    return {
      nAnelli: r.includes("anelli") ? fascicoli : 0,
      nSpirali: r.includes("spirale") ? fascicoli : 0,
      nFascetta: r.includes("fascetta") ? fascicoli : 0,
      nCiappature: r.includes("ciappatura") || r.includes("punti") ? fascicoli : 0,
    };
  };

  const numFascicoliA4 = (row: any) => (isRilegaturaUnicaA4(row) ? 1 : getCopie(row));

  const calcCostiInterni = (tipo: "A4" | "A3", lordo: number, nFogli: number, row: any) => {
    if (Number.isFinite(row?.breakdown?.costiInterni)) {
      return Number(row.breakdown.costiInterni);
    }
    if (tipo === "A3") {
      const { nColore, nBN } = splitColoriBN(row, nFogli);
      let tot =
        (unitA3.foglio || 0) * (nFogli || 0) +
        (unitA3.colore || 0) * (nColore || 0) +
        (unitA3.biancoNero || 0) * (nBN || 0);

      const plastStr = String(row?.plastificazioneKey ?? row?.plastificazione ?? "").toLowerCase();
      const doPlast = plastStr.includes("si");
      if (doPlast && (unitA3.plastificazione || 0) > 0) {
        const nPagine = (Number(row?.pagine ?? row?.pagineTotali ?? 0) || 0) * (Number(row?.copie ?? row?.numeroCopie ?? 1) || 1);
        tot += (unitA3.plastificazione || 0) * nPagine;
      }

      if (Array.isArray(extrasA3)) {
        const copie = getCopie(row);
        for (const x of extrasA3) {
          if (!x?.attivo) continue;
          const rawUnita = String(x?.unita ?? "").toLowerCase();
          const val = Number(x?.costo ?? 0) || 0;

          const campo = (x?.campo ?? "").toString().trim();
          const match = (x?.match ?? "").toString().trim().toLowerCase();

          if (!campo || !match) {
            if (!rawUnita.includes("percent")) continue;
            tot += lordo * (val / 100);
            continue;
          }

          const sorgente = (row?.[campo] ?? "").toString().toLowerCase();
          if (!sorgente.includes(match)) continue;

          if (rawUnita.includes("percent")) tot += lordo * (val / 100);
          else if (rawUnita.includes("ordine")) tot += val;
          else if (rawUnita.includes("fascicolo")) tot += val * (copie || 0);
          else if (rawUnita.includes("foglio")) tot += val * (nFogli || 0);
        }
      }

      return Number.isFinite(tot) ? tot : 0;
    }

    const { nColore, nBN } = splitColoriBN(row, nFogli);
    const { nAnelli, nSpirali, nFascetta, nCiappature } = quantitaRilegaturaA4(row);
    const fascicoli = numFascicoliA4(row);

    let tot =
      (unitA4.foglio || 0) * (nFogli || 0) +
      (unitA4.colore || 0) * (nColore || 0) +
      (unitA4.biancoNero || 0) * (nBN || 0) +
      (unitA4.anelli || 0) * (nAnelli || 0) +
      (unitA4.spirale || 0) * (nSpirali || 0) +
      (unitA4.fascetta || 0) * (nFascetta || 0) +
      (unitA4.ciappatura || 0) * (nCiappature || 0);

    const extras = extrasA4;
    if (Array.isArray(extras)) {
      for (const x of extras) {
        if (!x?.attivo) continue;
        const rawUnita = String(x?.unita ?? "").toLowerCase();
        const val = Number(x?.costo ?? 0) || 0;

        const campo = (x?.campo ?? "").toString().trim();
        const match = (x?.match ?? "").toString().trim().toLowerCase();

        if (!campo || !match) {
          if (!rawUnita.includes("percent")) continue;
          tot += lordo * (val / 100);
          continue;
        }

        const sorgente = (row?.[campo] ?? "").toString().toLowerCase();
        if (!sorgente.includes(match)) continue;

        if (rawUnita.includes("percent")) tot += lordo * (val / 100);
        else if (rawUnita.includes("ordine")) tot += val;
        else if (rawUnita.includes("fascicolo")) tot += val * (fascicoli || 0);
        else if (rawUnita.includes("foglio")) tot += val * (nFogli || 0);
      }
    }

    return Number.isFinite(tot) ? tot : 0;
  };

  /**
   * Calcolo coerente per un ordine (usa i campi salvati quando esistono).
   * Margine: (lordo - trasporto) - IVA - costi interni - fee PayPal
   */
  const computeMetrics = (row: any, tipo: "A4" | "A3") => {
    const ts = row.timestamp?.toDate?.();
    const metodo = detectMetodo(row);
    const delta = getManualDelta(row);

    const br = row?.breakdown;

    if (br && typeof br === "object") {
      const lordoBase =
        Number.isFinite(br.totaleFinale)
          ? Number(br.totaleFinale)
          : Number((br.imponibile || 0) + (br.iva || 0) + (br.trasporto || 0));

      const lordoEff = lordoBase + delta;

      const dettaglio: DettaglioRow = {
        Cliente: `${row.nome || ""} ${row.cognome || ""}`.trim(),
        Data: ts?.toLocaleString("it-IT") || "",
        Metodo: metodo,
        "Prezzo Lordo (€)": lordoBase.toFixed(2),
        "Variazione (€)": delta ? delta.toFixed(2) : "",
        "Lordo (effettivo) (€)": lordoEff.toFixed(2),
        "Imponibile (€)": Number(br.imponibile || 0).toFixed(2),
        "IVA (€)": Number(br.iva || 0).toFixed(2),
        "Fee PayPal (€)": Number(br.feePayPal || 0).toFixed(2),
        "Trasporto (€)": Number(br.trasporto || 0).toFixed(2),
        "Costi interni (€)": Number(br.costiInterni || 0).toFixed(2),
        nFogli: Number.isFinite(br.nFogli) ? Number(br.nFogli) : "",
        "Margine netto (€)": (
          (lordoEff - Number(br.trasporto || 0) - Number(br.iva || 0) - Number(br.costiInterni || 0) - Number(br.feePayPal || 0))
        ).toFixed(2),
        Note: getManualReason(row),
        Congelato: "Sì",
      };

      return { dettaglio, lordoEff };
    }

    // ----- Legacy (non congelato) -----
    const lordoBase = getLordo(row);
    const trasporto = detectTransport(row);

    let imponibile: number | undefined =
      Number.isFinite(row?.imponibile) ? Number(row.imponibile)
        : Number.isFinite(row?.breakdown?.imponibile) ? Number(row.breakdown.imponibile)
          : undefined;

    let iva: number | undefined =
      Number.isFinite(row?.iva) ? Number(row.iva)
        : Number.isFinite(row?.breakdown?.iva) ? Number(row.breakdown.iva)
          : undefined;

    if (!Number.isFinite(imponibile) || !Number.isFinite(iva)) {
      const base = Math.max(lordoBase - trasporto, 0);
      const imp = base / (1 + ivaRate);
      imponibile = imp;
      iva = base - imp;
    }

    const nFogli = sumNFogli(row);
    const fee = paypalFeeOf(row, lordoBase, metodo);
    const interni = calcCostiInterni(tipo, lordoBase, nFogli, row);

    const lordoEff = lordoBase + delta;
    const margineEff = (lordoEff - trasporto) - (iva || 0) - interni - fee;

    const dettaglio: DettaglioRow = {
      Cliente: `${row.nome || ""} ${row.cognome || ""}`.trim(),
      Data: ts?.toLocaleString("it-IT") || "",
      Metodo: metodo,
      "Prezzo Lordo (€)": lordoBase.toFixed(2),
      "Variazione (€)": delta ? delta.toFixed(2) : "",
      "Lordo (effettivo) (€)": lordoEff.toFixed(2),
      "Imponibile (€)": (imponibile || 0).toFixed(2),
      "IVA (€)": (iva || 0).toFixed(2),
      "Fee PayPal (€)": fee.toFixed(2),
      "Trasporto (€)": trasporto.toFixed(2),
      "Costi interni (€)": interni.toFixed(2),
      nFogli: nFogli || "",
      "Margine netto (€)": margineEff.toFixed(2),
      Note: getManualReason(row) || (nFogli ? "" : "nFogli assente: per_foglio=0"),
      Congelato: "No",
    };

    return { dettaglio, lordoEff };
  };

  // ------- Export (COMPLETO: 3 fogli) -------
  const exportOrdini = async (tipo: "A4" | "A3") => {
    const baseRef = collection(db, "ArchivioOrdini");
    const snapshot = await getDocs(query(baseRef));

    const docs = snapshot.docs
      .map(d => d.data())
      .filter(data => data.tipo === tipo && matchesUtente(data))
      .filter(data => withinDateRange(data?.timestamp?.toDate?.()))
      .sort((a, b) => getRowMillis(b) - getRowMillis(a));

    const listSimple: any[] = [];
    const listDetail: DettaglioRow[] = [];

    let totLordoEff = 0;
    let totImponibile = 0;
    let totIva = 0;
    let totPp = 0;
    let totTrasporto = 0;
    let totInterni = 0;
    let totMargine = 0;

    for (const data of docs) {
      const { dettaglio, lordoEff } = computeMetrics(data, tipo);

      totLordoEff += lordoEff;
      totImponibile += Number(dettaglio["Imponibile (€)"]);
      totIva += Number(dettaglio["IVA (€)"]);
      totPp += Number(dettaglio["Fee PayPal (€)"]);
      totTrasporto += Number(dettaglio["Trasporto (€)"]);
      totInterni += Number(dettaglio["Costi interni (€)"]);
      totMargine += Number(dettaglio["Margine netto (€)"]);

      const ts = data?.timestamp?.toDate?.();
      listSimple.push({
        Nome: data.nome || "",
        Cognome: data.cognome || "",
        Email: data.email || "",
        Telefono: data.telefono || "",
        Data: ts instanceof Date ? ts.toLocaleString("it-IT") : "",
        Prezzo: lordoEff.toFixed(2), // effettivo
        Tipo: tipo,
      });

      listDetail.push(dettaglio);
    }

    if (tipo === "A4") {
      setDetailA4(listDetail);
      setTotaleA4(totLordoEff);
    } else {
      setDetailA3(listDetail);
      setTotaleA3(totLordoEff);
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(listSimple);
    XLSX.utils.book_append_sheet(wb, ws1, `Ordini_${tipo}`);

    const ws2 = XLSX.utils.json_to_sheet(listDetail);
    XLSX.utils.book_append_sheet(wb, ws2, `Dettaglio_${tipo}`);

    const summary = [
      { Voce: `RIEPILOGO ${tipo}`, Valore: "" },
      { Voce: "Ricavi lordi (effettivi)", Valore: totLordoEff.toFixed(2) + " €" },
      { Voce: "Imponibile", Valore: totImponibile.toFixed(2) + " €" },
      { Voce: `IVA (${(ivaRate * 100).toFixed(2)}%)`, Valore: totIva.toFixed(2) + " €" },
      { Voce: "Fee PayPal", Valore: totPp.toFixed(2) + " €" },
      { Voce: "Trasporto", Valore: totTrasporto.toFixed(2) + " €" },
      { Voce: "Costi interni", Valore: totInterni.toFixed(2) + " €" },
      { Voce: "Margine netto", Valore: totMargine.toFixed(2) + " €" },
    ];
    const ws3 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws3, `Riepilogo_${tipo}`);

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, formatFilename(`storico_${tipo}_completo`));
  };

  // ------- Export elenco utenti -------
  const exportUtenti = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const utenti: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      utenti.push({
        Nome: data.displayName || "",
        Cognome: data.cognome || "",
        Email: data.email || "",
        Telefono: data.telefono || "",
        Corso: data.corsoLaurea || "",
        Anno: data.annoAccademico || "",
        Ruolo: data.ruolo || "PublicUser",
      });
    });

    if (utenti.length === 0) {
      alert("Nessun utente trovato.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(utenti);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Utenti");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, formatFilename("utenti_registrati"));
  };

  const generaAnteprima = useCallback(async () => {
  const baseRef = collection(db, "ArchivioOrdini");
  const snapshot = await getDocs(query(baseRef));

  const all = snapshot.docs
    .map((d) => ({ ref: d.ref, data: d.data() }))
    .filter(({ data }) => {
      if (!matchesUtente(data)) return false;
      const ts = data.timestamp?.toDate?.();
      if (!withinDateRange(ts)) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = a.data?.timestamp?.toDate?.();
      const tb = b.data?.timestamp?.toDate?.();
      const ma = ta instanceof Date ? ta.getTime() : 0;
      const mb = tb instanceof Date ? tb.getTime() : 0;
      return mb - ma;
    });

  // A4
  if (filtroTipo === "Tutti" || filtroTipo === "A4") {
    const rowsA4: DettaglioRow[] = [];
    let totA4 = 0;
    const refsA4: any[] = [];

    for (const { ref, data } of all) {
      if (data.tipo !== "A4") continue;
      const { dettaglio, lordoEff } = computeMetrics(data, "A4");
      rowsA4.push(dettaglio);
      refsA4.push({ ref, data });
      totA4 += lordoEff;
    }
    setDetailA4(rowsA4);
    setDocsA4(refsA4);
    setTotaleA4(totA4);
  } else {
    setDetailA4([]);
    setDocsA4([]);
    setTotaleA4(0);
  }

  // A3
  if (filtroTipo === "Tutti" || filtroTipo === "A3") {
    const rowsA3: DettaglioRow[] = [];
    let totA3 = 0;
    const refsA3: any[] = [];

    for (const { ref, data } of all) {
      if (data.tipo !== "A3") continue;
      const { dettaglio, lordoEff } = computeMetrics(data, "A3");
      rowsA3.push(dettaglio);
      refsA3.push({ ref, data });
      totA3 += lordoEff;
    }
    setDetailA3(rowsA3);
    setDocsA3(refsA3);
    setTotaleA3(totA3);
  } else {
    setDetailA3([]);
    setDocsA3([]);
    setTotaleA3(0);
  }
}, [
  filtroTipo,
  matchesUtente,
  withinDateRange,
  // i calcoli dipendono da queste config (usate da computeMetrics -> calcCostiInterni, ecc.)
  ivaRate, ppPercent, ppFixed, transportFeeEuro,
  unitA4, unitA3, extrasA4, extrasA3,
  // helper stabile
  getRowMillis,
]);


  // Trigger automatico iniziale quando le config sono pronte
  useEffect(() => {
    if (!configsReady) return;
    if (autoTriggerRef.current) return;
    autoTriggerRef.current = true;
    const t = setTimeout(() => {
      generaAnteprima();
    }, 200);
    return () => clearTimeout(t);
  }, [configsReady, generaAnteprima]);

  // ------- Eliminazione con conferma -------
  const openDeleteModal = async () => {
    const baseRef = collection(db, "ArchivioOrdini");
    const snapshot = await getDocs(query(baseRef));

    const items: any[] = [];
    let total = 0;

    snapshot.forEach((d) => {
      const data = d.data();
      if (!matchesUtente(data)) return;
      if (filtroTipo !== "Tutti" && data.tipo !== filtroTipo) return;
      const ts = data.timestamp?.toDate?.();
      if (!withinDateRange(ts)) return;

      const tipo: "A4" | "A3" = data.tipo === "A3" ? "A3" : "A4";
      const { lordoEff } = computeMetrics(data, tipo);
      total += isNaN(lordoEff) ? 0 : lordoEff;
      items.push(d);
    });

    setDeleteItems(items);
    setDeleteSummary({ count: items.length, total });
    setConfirmDeleteText("");
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (confirmDeleteText.trim().toUpperCase() !== "ELIMINA") {
      alert('Per confermare, digita esattamente "ELIMINA" nel campo di testo.');
      return;
    }
    if (deleteItems.length === 0) {
      alert("Non ci sono dati da eliminare con i filtri correnti.");
      setShowDeleteModal(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      deleteItems.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();

      setShowDeleteModal(false);
      setDeleteSuccessInfo({ ...deleteSummary });
      setShowDeleteSuccess(true);

      setDeleteItems([]);
      setDeleteSummary({ count: 0, total: 0 });
      await generaAnteprima();
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore durante l'eliminazione.");
    }
  };

  // ------- Freeze workflow -------
  const openFreezeModal = async () => {
    const baseRef = collection(db, "ArchivioOrdini");
    const snapshot = await getDocs(query(baseRef));

    const items: any[] = [];
    let total = 0;

    snapshot.forEach((d) => {
      const data = d.data();
      if (filtroTipo !== "Tutti" && data.tipo !== filtroTipo) return;
      if (!matchesUtente(data)) return;

      const ts = data.timestamp?.toDate?.();
      if (!withinDateRange(ts)) return;

      if (data.breakdown && typeof data.breakdown === "object") return;

      const l = getLordo(data);
      const lordo = Number.isFinite(l) ? Number(l) : 0;

      total += lordo;
      items.push(d);
    });

    setFreezeItems(items);
    setFreezeSummary({ count: items.length, total });
    setShowFreezeModal(true);
  };

  const confirmFreeze = async () => {
    if (!freezeItems.length) {
      alert("Non ci sono ordini da congelare con i filtri correnti.");
      setShowFreezeModal(false);
      return;
    }

    try {
      setFreezing(true);

      const CHUNK = 450;
      for (let i = 0; i < freezeItems.length; i += CHUNK) {
        const group = freezeItems.slice(i, i + CHUNK);
        const batch = writeBatch(db);

        for (const d of group) {
          const data = d.data();
          const tipo: "A4" | "A3" = data.tipo === "A3" ? "A3" : "A4";

          const metodo = detectMetodo(data);
          const lordo = getLordo(data);
          const trasporto = detectTransport(data);

          const ivaToUse = Number.isFinite(data?.ivaRate) ? Number(data.ivaRate) : ivaRate;
          let imponibile = Number.isFinite(data?.imponibile) ? Number(data.imponibile)
            : Number.isFinite(data?.breakdown?.imponibile) ? Number(data.breakdown.imponibile)
              : (lordo - trasporto) / (1 + ivaToUse);
          imponibile = Math.max(imponibile, 0);
          const iva = (lordo - trasporto) - imponibile;

          const nFogli = sumNFogli(data);
          const feePayPal = paypalFeeOf(data, lordo, metodo);
          const costiInterni = calcCostiInterni(tipo, lordo, nFogli, data);

          const snapshotConfig: any = {
            savedAt: new Date().toISOString(),
            tipo,
            ivaRate,
            paypalPercent: ppPercent,
            paypalFixed: ppFixed,
            transportFeeEuro,
          };
          if (tipo === "A4") {
            snapshotConfig.unitA4 = { ...unitA4 };
            snapshotConfig.extrasA4 = Array.isArray(extrasA4) ? extrasA4 : [];
          } else {
            snapshotConfig.unitA3 = { ...unitA3 };
            snapshotConfig.extrasA3 = Array.isArray(extrasA3) ? extrasA3 : [];
          }
          if (data.breakdown && typeof data.breakdown === "object") continue;

          batch.update(d.ref, {
            pricingSnapshot: snapshotConfig,
            breakdown: {
              imponibile: Number(imponibile.toFixed(2)),
              iva: Number(iva.toFixed(2)),
              feePayPal: Number(feePayPal.toFixed(2)),
              trasporto: Number(trasporto.toFixed(2)),
              costiInterni: Number(costiInterni.toFixed(2)),
              totaleFinale: Number(lordo.toFixed(2)),
              nFogli: Number(nFogli || 0),
            },
            frozen: true,
            frozenAt: new Date().toISOString(),
          });
        }

        await batch.commit();
      }

      setShowFreezeModal(false);
      setFreezeItems([]);
      setFreezeSummary({ count: 0, total: 0 });
      await generaAnteprima();
      setFreezeSuccessInfo({ count: freezeSummary.count, total: freezeSummary.total });
      setShowFreezeSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Errore durante il congelamento.");
    } finally {
      setFreezing(false);
    }
  };

  // ------- KPI derivati -------
  const countA4 = detailA4.length;
  const countA3 = detailA3.length;
  const totalAll = (totaleA4 || 0) + (totaleA3 || 0);
  const countAll = countA4 + countA3;

  return (
    <div className={styles.page}>
      <Header />

      {/* Header e badge */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>📦 Storico Dati</h2>
          <p className={styles.pageSubtitle}>
            Esporta, filtra, anteprima ed elimina in sicurezza (digita <code>ELIMINA</code> per confermare).
          </p>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeNeutral}`}>ArchivioOrdini</span>
          <span className={`${styles.badge} ${styles.badgeGold}`}>{filtroTipo}</span>
        </div>
      </div>

      {/* KPI */}
      <section className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Totale ordini</div>
          <div className={styles.kpiValue}>{countAll}</div>
          <div className={styles.kpiHint}>A4: {countA4} • A3: {countA3}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Incassato (tutti + IVA)</div>
          <div className={styles.kpiValue}>{totalAll.toFixed(2)} €</div>
          <div className={styles.kpiHint}>A4: {totaleA4.toFixed(2)} € • A3: {totaleA3.toFixed(2)} €</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Periodo</div>
          <div className={styles.kpiValue}>
            {dataInizio || "inizio"} → {dataFine || "fine"}
          </div>
          <div className={styles.kpiHint}>{ricercaUtente ? `Utente: ${ricercaUtente}` : "Tutti gli utenti"}</div>
        </div>
      </section>

      {/* Card filtri */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Filtri</h3>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${filtroTipo === "Tutti" ? styles.tabActive : ""}`}
              onClick={() => setFiltroTipo("Tutti")}
            >
              Tutti
            </button>
            <button
              className={`${styles.tab} ${filtroTipo === "A4" ? styles.tabActive : ""}`}
              onClick={() => setFiltroTipo("A4")}
            >
              A4
            </button>
            <button
              className={`${styles.tab} ${filtroTipo === "A3" ? styles.tabActive : ""}`}
              onClick={() => setFiltroTipo("A3")}
            >
              A3
            </button>
          </div>
        </div>

        <div className={styles.filterGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Dal</label>
            <input
              type="date"
              value={dataInizio}
              onChange={(e) => setDataInizio(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>Al</label>
            <input
              type="date"
              value={dataFine}
              onChange={(e) => setDataFine(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.filterGroup} style={{ gridColumn: "span 2" }}>
            <label className={styles.label}>Cerca Utente</label>
            <input
              type="text"
              placeholder="Nome, Cognome, Email, Telefono"
              value={ricercaUtente}
              onChange={(e) => setRicercaUtente(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.actionsRow}>
          <div className={styles.actionsLeft}>
            <button
              className={styles.button}
              onClick={generaAnteprima}
              disabled={!configsReady}
              title={!configsReady ? "Attendi il caricamento delle configurazioni…" : "Mostra risultati"}
            >
              🔍 Aggiorna risultati
            </button>
            <button className={styles.buttonAlt} onClick={resetFiltri}>♻️ Resetta</button>
          </div>
          <div className={styles.actionsRight}>
            <button className={styles.buttonAlt} onClick={() => exportUtenti()}>📥 Esporta utenti</button>
            <button className={styles.buttonAlt} onClick={() => exportOrdini("A4")}>📄 Esporta A4</button>
            <button className={styles.buttonAlt} onClick={() => exportOrdini("A3")}>📄 Esporta A3</button>
            <button
              className={styles.buttonDanger}
              onClick={openDeleteModal}
              title="Elimina tutti gli ordini che corrispondono ai filtri attuali"
            >
              🗑️ Elimina filtrati
            </button>
            <button
              className={styles.buttonAlt}
              onClick={openFreezeModal}
              title="Crea e salva breakdown + pricingSnapshot per gli ordini filtrati che ne sono sprovvisti"
            >
              ❄️ Congela ordini filtrati
            </button>
          </div>
        </div>
      </section>

      {/* RISULTATI: tabella DETTAGLIO */}
      <section className={styles.resultsGrid}>
        {(filtroTipo === "Tutti" || filtroTipo === "A4") && (
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <h4 className={styles.resultTitle}>Dettaglio A4</h4>
              <div className={styles.resultMeta}>
                <span className={`${styles.badge} ${styles.badgeGold}`}>{detailA4.length}</span>
                <span className={styles.totalChip}>Totale lordo: {totaleA4.toFixed(2)} €</span>
              </div>
            </div>

            <div className={styles.tableScroll}>
              {detailA4.length ? (
                <div className={styles.table}>
                  <div className={`${styles.tr} ${styles.thRow}`}>
                    <div className={styles.th}>Cliente</div>
                    <div className={styles.th}>Data</div>
                    <div className={styles.th}>Metodo</div>
                    <div className={styles.th}>Prezzo Lordo (€)</div>
                    <div className={styles.th}>Variazione (€)</div>
                    <div className={styles.th}>Lordo (effettivo) (€)</div>
                    <div className={styles.th}>Imponibile (€)</div>
                    <div className={styles.th}>IVA (€)</div>
                    <div className={styles.th}>Fee PayPal (€)</div>
                    <div className={styles.th}>Trasporto (€)</div>
                    <div className={styles.th}>Costi interni (€)</div>
                    <div className={styles.th}>nFogli</div>
                    <div className={styles.th}>Margine netto (€)</div>
                    <div className={styles.th}>Congelato</div>
                    <div className={styles.th}>Note / Azioni</div>
                  </div>

                  {detailA4.map((row, idx) => (
                    <div key={idx} className={styles.tr}>
                      <div className={styles.td} data-label="Cliente">{row.Cliente}</div>
                      <div className={styles.td} data-label="Data">{row.Data}</div>
                      <div className={styles.td} data-label="Metodo">{row.Metodo}</div>
                      <div className={styles.td} data-label="Prezzo Lordo (€)">{row["Prezzo Lordo (€)"]}</div>
                      <div className={styles.td} data-label="Variazione (€)">{row["Variazione (€)"] || ""}</div>
                      <div className={styles.td} data-label="Lordo (effettivo) (€)">{row["Lordo (effettivo) (€)"] || row["Prezzo Lordo (€)"]}</div>
                      <div className={styles.td} data-label="Imponibile (€)">{row["Imponibile (€)"]}</div>
                      <div className={styles.td} data-label="IVA (€)">{row["IVA (€)"]}</div>
                      <div className={styles.td} data-label="Fee PayPal (€)">{row["Fee PayPal (€)"]}</div>
                      <div className={styles.td} data-label="Trasporto (€)">{row["Trasporto (€)"]}</div>
                      <div className={styles.td} data-label="Costi interni (€)">{row["Costi interni (€)"]}</div>
                      <div className={styles.td} data-label="nFogli">{row.nFogli}</div>
                      <div className={styles.td} data-label="Margine netto (€)">{row["Margine netto (€)"]}</div>
                      <div className={styles.td} data-label="Congelato">{row.Congelato || "No"}</div>
                      <div className={styles.td} data-label="Note / Azioni">
                        <span>{row.Note}</span>
                        {docsA4[idx]?.ref && (
                          <button
                            className={styles.buttonAlt}
                            title="Modifica variazione"
                            onClick={() => openEdit(docsA4[idx].ref, docsA4[idx].data)}
                          >
                            ✏️ Modifica
                          </button>
                        )}
                      </div>                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Nessun risultato A4. Applica i filtri e premi “Mostra risultati”.
                </div>
              )}
            </div>
          </div>
        )}

        {(filtroTipo === "Tutti" || filtroTipo === "A3") && (
          <div className={styles.resultCard}>
            <div className={styles.resultHeader}>
              <h4 className={styles.resultTitle}>Dettaglio A3</h4>
              <div className={styles.resultMeta}>
                <span className={`${styles.badge} ${styles.badgeGold}`}>{detailA3.length}</span>
                <span className={styles.totalChip}>Totale lordo: {totaleA3.toFixed(2)} €</span>
              </div>
            </div>

            <div className={styles.tableScroll}>
              {detailA3.length ? (
                <div className={styles.table}>
                  <div className={`${styles.tr} ${styles.thRow}`}>
                    <div className={styles.th}>Cliente</div>
                    <div className={styles.th}>Data</div>
                    <div className={styles.th}>Metodo</div>
                    <div className={styles.th}>Prezzo Lordo (€)</div>
                    <div className={styles.th}>Variazione (€)</div>
                    <div className={styles.th}>Lordo (effettivo) (€)</div>
                    <div className={styles.th}>Imponibile (€)</div>
                    <div className={styles.th}>IVA (€)</div>
                    <div className={styles.th}>Fee PayPal (€)</div>
                    <div className={styles.th}>Trasporto (€)</div>
                    <div className={styles.th}>Costi interni (€)</div>
                    <div className={styles.th}>nFogli</div>
                    <div className={styles.th}>Margine netto (€)</div>
                    <div className={styles.th}>Congelato</div>
                    <div className={styles.th}>Note / Azioni</div>
                  </div>

                  {detailA3.map((row, idx) => (
                    <div key={idx} className={styles.tr}>
                      <div className={styles.td} data-label="Cliente">{row.Cliente}</div>
                      <div className={styles.td} data-label="Data">{row.Data}</div>
                      <div className={styles.td} data-label="Metodo">{row.Metodo}</div>
                      <div className={styles.td} data-label="Prezzo Lordo (€)">{row["Prezzo Lordo (€)"]}</div>
                      <div className={styles.td} data-label="Variazione (€)">{row["Variazione (€)"] || ""}</div>
                      <div className={styles.td} data-label="Lordo (effettivo) (€)">{row["Lordo (effettivo) (€)"] || row["Prezzo Lordo (€)"]}</div>
                      <div className={styles.td} data-label="Imponibile (€)">{row["Imponibile (€)"]}</div>
                      <div className={styles.td} data-label="IVA (€)">{row["IVA (€)"]}</div>
                      <div className={styles.td} data-label="Fee PayPal (€)">{row["Fee PayPal (€)"]}</div>
                      <div className={styles.td} data-label="Trasporto (€)">{row["Trasporto (€)"]}</div>
                      <div className={styles.td} data-label="Costi interni (€)">{row["Costi interni (€)"]}</div>
                      <div className={styles.td} data-label="nFogli">{row.nFogli}</div>
                      <div className={styles.td} data-label="Margine netto (€)">{row["Margine netto (€)"]}</div>
                      <div className={styles.td} data-label="Congelato">{row.Congelato || "No"}</div>
                      <div className={styles.td} data-label="Note / Azioni">
                        <span>{row.Note}</span>
                        {docsA3[idx]?.ref && (
                          <button
                            className={styles.buttonAlt}
                            title="Modifica variazione"
                            onClick={() => openEdit(docsA3[idx].ref, docsA3[idx].data)}
                          >
                            ✏️ Modifica
                          </button>
                        )}
                      </div>                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Nessun risultato A3. Applica i filtri e premi “Mostra risultati”.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Modal eliminazione */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Conferma Eliminazione</h3>
            <p className={styles.modalText}>
              Verranno eliminati <strong>{deleteSummary.count}</strong> documenti da <code>ArchivioOrdini</code>
              {filtroTipo !== "Tutti" ? <> (tipo: <strong>{filtroTipo}</strong>)</> : null}
              {dataInizio || dataFine ? <> nel periodo <strong>{dataInizio || "inizio"}</strong> — <strong>{dataFine || "fine"}</strong></> : null}
              {ricercaUtente ? <> per utente: <strong>{ricercaUtente}</strong></> : null}.
            </p>
            <p className={styles.modalText}>
              Totale economico coinvolto: <strong>{deleteSummary.total.toFixed(2)} €</strong>
            </p>
            <p className={styles.modalWarn}>Azione IRREVERSIBILE. Per confermare, digita "ELIMINA":</p>
            <input
              className={styles.modalInput}
              placeholder='Scrivi "ELIMINA"'
              value={confirmDeleteText}
              onChange={(e) => setConfirmDeleteText(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button className={styles.buttonAlt} onClick={() => setShowDeleteModal(false)}>Annulla</button>
              <button
                className={styles.buttonDanger}
                onClick={confirmDelete}
                disabled={confirmDeleteText.trim().toUpperCase() !== "ELIMINA"}
                title='Digita "ELIMINA" per abilitare'
              >
                Conferma Eliminazione
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal congelamento */}
      {showFreezeModal && (
        <div className={styles.modalOverlay} onClick={() => !freezing && setShowFreezeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Conferma Congelamento</h3>
            <p className={styles.modalText}>
              Verranno <strong>congelati</strong> <strong>{freezeSummary.count}</strong> documenti in <code>ArchivioOrdini</code>
              {filtroTipo !== "Tutti" ? <> (tipo: <strong>{filtroTipo}</strong>)</> : null}
              {dataInizio || dataFine ? <> nel periodo <strong>{dataInizio || "inizio"}</strong> — <strong>{dataFine || "fine"}</strong></> : null}
              {ricercaUtente ? <> per utente: <strong>{ricercaUtente}</strong></> : null}.
            </p>
            <p className={styles.modalText}>
              Totale lordo stimato coinvolto: <strong>{freezeSummary.total.toFixed(2)} €</strong>
            </p>
            <p className={styles.modalWarn}>
              L’operazione scriverà <code>pricingSnapshot</code> e <code>breakdown</code> negli ordini selezionati. L’azione è idempotente: gli ordini già congelati verranno ignorati.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.buttonAlt} onClick={() => !freezing && setShowFreezeModal(false)} disabled={freezing}>
                Annulla
              </button>
              <button
                className={styles.buttonDanger}
                onClick={confirmFreeze}
                disabled={freezing || freezeItems.length === 0}
                title={freezeItems.length === 0 ? "Nessun ordine da congelare" : "Conferma"}
              >
                {freezing ? "Sto congelando..." : "Conferma Congelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal successo congelamento */}
      {showFreezeSuccess && (
        <div className={styles.modalOverlay} onClick={() => setShowFreezeSuccess(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>✅ Congelamento completato</h3>
            <p className={styles.modalText}>
              Sono stati congelati <strong>{freezeSuccessInfo.count}</strong> ordini.
            </p>
            <p className={styles.modalText}>
              Totale lordo coinvolto: <strong>{freezeSuccessInfo.total.toFixed(2)} €</strong>
            </p>
            <div className={styles.modalActions}>
              <button className={styles.button} onClick={() => setShowFreezeSuccess(false)}>
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal successo eliminazione */}
      {showDeleteSuccess && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteSuccess(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>🗑️ Eliminazione completata</h3>
            <p className={styles.modalText}>
              Sono stati eliminati <strong>{deleteSuccessInfo.count}</strong> documenti.
            </p>
            <p className={styles.modalText}>
              Totale lordo coinvolto: <strong>{deleteSuccessInfo.total.toFixed(2)} €</strong>
            </p>
            <div className={styles.modalActions}>
              <button className={styles.button} onClick={() => setShowDeleteSuccess(false)}>
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifica variazione */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>✏️ Modifica variazione importo</h3>
            <p className={styles.modalText}>
              Imposta una <strong>Variazione (€)</strong> (positiva o negativa). Questa cifra viene
              sommata al <em>Prezzo Lordo</em> per ottenere il <em>Lordo effettivo</em> e incide direttamente sul
              margine (non ricalcola IVA/fee).
            </p>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <div className={styles.filterGroup}>
                <label className={styles.label}>Variazione (€)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={editDelta}
                  onChange={(e) => setEditDelta(e.target.value)}
                  placeholder="es. -2.50 o 3.00"
                />
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.label}>Motivo (opzionale)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="sconto, integrazione, arrotondamento…"
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.buttonAlt} onClick={() => setShowEditModal(false)}>Annulla</button>
              <button className={styles.button} onClick={saveEdit}>Salva</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoricoDati;
