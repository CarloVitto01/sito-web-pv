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

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import Header from "../../components/HeaderComponents/Header";

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";

import {
  IconArchive,
  IconCheck,
  IconDownload,
  IconEdit,
  IconRefresh,
  IconSearch,
  IconSnowflake,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";

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
  // ⬇️ subito dopo gli state: ivaRate, ppPercent, ppFixed, transportFeeEuro, unitA4, unitA3, extrasA4, extrasA3
  const configRef = useRef({
    ivaRate,
    ppPercent,
    ppFixed,
    transportFeeEuro,
    unitA4,
    unitA3,
    extrasA4,
    extrasA3,
  });

  useEffect(() => {
    configRef.current = {
      ivaRate,
      ppPercent,
      ppFixed,
      transportFeeEuro,
      unitA4,
      unitA3,
      extrasA4,
      extrasA3,
    };
  }, [ivaRate, ppPercent, ppFixed, transportFeeEuro, unitA4, unitA3, extrasA4, extrasA3]);


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
  const computeMetrics = useCallback((row: any, tipo: "A4" | "A3") => {
    const cfg = configRef.current;

    // Helpers *locali* che usano cfg (così non servono deps esterne)
    const _detectMetodo = (r: any): "PayPal" | "Contanti" | "n/d" => {
      const raw = (r?.metodoPagamento ?? r?.metodo ?? "").toString().toLowerCase();
      if (raw.includes("paypal")) return "PayPal";
      if (raw.includes("cash") || raw.includes("contanti")) return "Contanti";
      if (r?.orderId || r?.captureId || r?.payerEmail) return "PayPal";
      if (typeof r?.statoPagamento === "string" && r.statoPagamento.toLowerCase().includes("consegna")) return "Contanti";
      return "n/d";
    };

    const _detectTransport = (r: any): number => {
      if (Number.isFinite(r?.breakdown?.trasporto)) return Number(r.breakdown.trasporto);
      if (Number.isFinite(r?.trasporto)) return Number(r.trasporto);
      if (Number.isFinite(r?.totaleFinale)) return 0;
      return cfg.transportFeeEuro;
    };

    const _getLordo = (r: any): number => {
      if (Number.isFinite(r?.breakdown?.totaleFinale)) return Number(r.breakdown.totaleFinale);
      if (Number.isFinite(r?.totaleFinale)) return Number(r.totaleFinale);
      const imp = Number.isFinite(r?.imponibile)
        ? Number(r.imponibile)
        : (Number.isFinite(r?.breakdown?.imponibile) ? Number(r.breakdown.imponibile) : 0);
      const tr = _detectTransport(r);
      return imp * (1 + cfg.ivaRate) + tr;
    };

    const _paypalFeeOf = (r: any, lordo: number, metodo: string) => {
      if (Number.isFinite(r?.breakdown?.feePayPal)) return Number(r.breakdown.feePayPal);
      if (Number.isFinite(r?.paypalFee)) return Number(r.paypalFee);
      return metodo === "PayPal" ? lordo * cfg.ppPercent + cfg.ppFixed : 0;
    };

    const _sumNFogli = (data: any) => {
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

    const _getCopie = (r: any) => Number(r?.copie ?? r?.numeroCopie ?? 1) || 1;

    const _splitColoriBN = (r: any, nFogli: number) => {
      const paginaStr = String(r?.pagina ?? r?.gestionePagina ?? "").toLowerCase();
      const isFronteRetro = paginaStr.includes("retro");
      const sidesPerSheet = isFronteRetro ? 2 : 1;
      const inkStr = String(r?.inchiostro ?? r?.colore ?? "").toLowerCase();
      if (inkStr.includes("color")) {
        return { nColore: nFogli * sidesPerSheet, nBN: 0 };
      }
      return { nColore: 0, nBN: nFogli * sidesPerSheet };
    };

    const _isRilegaturaUnicaA4 = (r: any) => {
      const unica = String(r?.rilegaturaUnica ?? "").toLowerCase();
      return ["si", "sì", "true", "on", "1"].some((k) => unica.includes(k));
    };
    const _numFascicoliA4 = (r: any) => (_isRilegaturaUnicaA4(r) ? 1 : _getCopie(r));

    const _quantitaRilegaturaA4 = (r: any) => {
      const s = `${r?.rilegatura ?? ""} ${r?.fascetta ?? ""}`.toLowerCase();
      const fascicoli = _numFascicoliA4(r);
      return {
        nAnelli: s.includes("anelli") ? fascicoli : 0,
        nSpirali: s.includes("spirale") ? fascicoli : 0,
        nFascetta: s.includes("fascetta") ? fascicoli : 0,
        nCiappature: s.includes("ciappatura") || s.includes("punti") ? fascicoli : 0,
      };
    };

    const _calcCostiInterni = (tipoLoc: "A4" | "A3", lordo: number, nFogli: number, r: any) => {
      if (Number.isFinite(r?.breakdown?.costiInterni)) return Number(r.breakdown.costiInterni);

      if (tipoLoc === "A3") {
        const { nColore, nBN } = _splitColoriBN(r, nFogli);
        let tot =
          (cfg.unitA3.foglio || 0) * (nFogli || 0) +
          (cfg.unitA3.colore || 0) * (nColore || 0) +
          (cfg.unitA3.biancoNero || 0) * (nBN || 0);

        const plastStr = String(r?.plastificazioneKey ?? r?.plastificazione ?? "").toLowerCase();
        const doPlast = plastStr.includes("si");
        if (doPlast && (cfg.unitA3.plastificazione || 0) > 0) {
          const nPagine = (Number(r?.pagine ?? r?.pagineTotali ?? 0) || 0) * (Number(r?.copie ?? r?.numeroCopie ?? 1) || 1);
          tot += (cfg.unitA3.plastificazione || 0) * nPagine;
        }

        if (Array.isArray(cfg.extrasA3)) {
          const copie = _getCopie(r);
          for (const x of cfg.extrasA3) {
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

            const sorgente = (r?.[campo] ?? "").toString().toLowerCase();
            if (!sorgente.includes(match)) continue;

            if (rawUnita.includes("percent")) tot += lordo * (val / 100);
            else if (rawUnita.includes("ordine")) tot += val;
            else if (rawUnita.includes("fascicolo")) tot += val * (copie || 0);
            else if (rawUnita.includes("foglio")) tot += val * (nFogli || 0);
          }
        }

        return Number.isFinite(tot) ? tot : 0;
      }

      // A4
      const { nColore, nBN } = _splitColoriBN(r, nFogli);
      const { nAnelli, nSpirali, nFascetta, nCiappature } = _quantitaRilegaturaA4(r);
      const fascicoli = _numFascicoliA4(r);

      let tot =
        (cfg.unitA4.foglio || 0) * (nFogli || 0) +
        (cfg.unitA4.colore || 0) * (nColore || 0) +
        (cfg.unitA4.biancoNero || 0) * (nBN || 0) +
        (cfg.unitA4.anelli || 0) * (nAnelli || 0) +
        (cfg.unitA4.spirale || 0) * (nSpirali || 0) +
        (cfg.unitA4.fascetta || 0) * (nFascetta || 0) +
        (cfg.unitA4.ciappatura || 0) * (nCiappature || 0);

      if (Array.isArray(cfg.extrasA4)) {
        for (const x of cfg.extrasA4) {
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

          const sorgente = (r?.[campo] ?? "").toString().toLowerCase();
          if (!sorgente.includes(match)) continue;

          if (rawUnita.includes("percent")) tot += lordo * (val / 100);
          else if (rawUnita.includes("ordine")) tot += val;
          else if (rawUnita.includes("fascicolo")) tot += val * (fascicoli || 0);
          else if (rawUnita.includes("foglio")) tot += val * (nFogli || 0);
        }
      }

      return Number.isFinite(tot) ? tot : 0;
    };

    // ====== INIZIO LOGICA ORIGINALE ======
    const ts = row.timestamp?.toDate?.();
    const metodo = _detectMetodo(row);
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
    const lordoBase = _getLordo(row);
    const trasporto = _detectTransport(row);

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
      const imp = base / (1 + cfg.ivaRate);
      imponibile = imp;
      iva = base - imp;
    }

    const nFogli = _sumNFogli(row);
    const fee = _paypalFeeOf(row, lordoBase, metodo);
    const interni = _calcCostiInterni(tipo, lordoBase, nFogli, row);

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
  }, []);

  // Crea rapidamente un worksheet da un array di oggetti
  const addSheetFromJson = (wb: ExcelJS.Workbook, name: string, rows: any[]) => {
    const ws = wb.addWorksheet(name);
    if (!rows?.length) return ws;

    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(12, h.length + 2),
    }));

    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    return ws;
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
    const wb = new ExcelJS.Workbook();
    addSheetFromJson(wb, `Ordini_${tipo}`, listSimple);
    addSheetFromJson(wb, `Dettaglio_${tipo}`, listDetail);
    addSheetFromJson(wb, `Riepilogo_${tipo}`, summary);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, formatFilename(`storico_${tipo}_completo`));
  }

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
    const wb = new ExcelJS.Workbook();
    addSheetFromJson(wb, "Utenti", utenti);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
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
  }, [filtroTipo, matchesUtente, withinDateRange, computeMetrics]);


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
  // ------- KPI derivati -------
  const countA4 = detailA4.length;
  const countA3 = detailA3.length;
  const totalAll = (totaleA4 || 0) + (totaleA3 || 0);
  const countAll = countA4 + countA3;

  const renderDetailTable = (
    tipo: "A4" | "A3",
    rows: DettaglioRow[],
    docs: any[],
    totale: number
  ) => {
    const headers = [
      "Cliente",
      "Data",
      "Metodo",
      "Prezzo Lordo (€)",
      "Variazione (€)",
      "Lordo (effettivo) (€)",
      "Imponibile (€)",
      "IVA (€)",
      "Fee PayPal (€)",
      "Trasporto (€)",
      "Costi interni (€)",
      "nFogli",
      "Margine netto (€)",
      "Congelato",
      "Note / Azioni",
    ];

    return (
      <Card
        withBorder
        radius="xl"
        p="lg"
        bg="rgba(255,255,255,0.04)"
        style={{ borderColor: "rgba(255,255,255,0.10)" }}
      >
        <Group justify="space-between" align="flex-start" mb="md">
          <Stack gap={4}>
            <Title order={4} c="black">
              Dettaglio {tipo}
            </Title>
            <Text size="sm" c="dimmed">
              Anteprima economica degli ordini filtrati
            </Text>
          </Stack>

          <Group gap="xs">
            <Badge variant="light" color="yellow">
              {rows.length} ordini
            </Badge>
            <Badge variant="filled" color="dark">
              Totale lordo: {totale.toFixed(2)} €
            </Badge>
          </Group>
        </Group>

        {rows.length ? (
          <ScrollArea h={520} offsetScrollbars scrollbarSize={8}>
            <Table.ScrollContainer minWidth={1500}>
              <Table
                striped
                highlightOnHover
                verticalSpacing="sm"
                horizontalSpacing="md"
                withTableBorder
                withColumnBorders
                styles={{
                  table: {
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.10)",
                  },
                  th: {
                    color: "black",
                    background: "rgba(255,255,255,0.08)",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  },
                  td: {
                    color: "rgba(0, 0, 0, 0.86)",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    {headers.map((h) => (
                      <Table.Th key={h}>{h}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {rows.map((row, idx) => (
                    <Table.Tr key={`${tipo}-${idx}`}>
                      <Table.Td>{row.Cliente || "-"}</Table.Td>
                      <Table.Td>{row.Data || "-"}</Table.Td>
                      <Table.Td>{row.Metodo || "-"}</Table.Td>
                      <Table.Td>{row["Prezzo Lordo (€)"]}</Table.Td>
                      <Table.Td>{row["Variazione (€)"] || "-"}</Table.Td>
                      <Table.Td>
                        {row["Lordo (effettivo) (€)"] || row["Prezzo Lordo (€)"]}
                      </Table.Td>
                      <Table.Td>{row["Imponibile (€)"]}</Table.Td>
                      <Table.Td>{row["IVA (€)"]}</Table.Td>
                      <Table.Td>{row["Fee PayPal (€)"]}</Table.Td>
                      <Table.Td>{row["Trasporto (€)"]}</Table.Td>
                      <Table.Td>{row["Costi interni (€)"]}</Table.Td>
                      <Table.Td>{row.nFogli || "-"}</Table.Td>
                      <Table.Td>
                        <Text
                          fw={700}
                          c={Number(row["Margine netto (€)"]) >= 0 ? "green.4" : "red.4"}
                        >
                          {row["Margine netto (€)"]}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="light"
                          color={row.Congelato === "Sì" ? "green" : "gray"}
                        >
                          {row.Congelato || "No"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="xs" c="dimmed" maw={220} truncate>
                            {row.Note || "-"}
                          </Text>

                          {docs[idx]?.ref && (
                            <Tooltip label="Modifica variazione">
                              <Button
                                size="xs"
                                variant="light"
                                color="yellow"
                                leftSection={<IconEdit size={14} />}
                                onClick={() => openEdit(docs[idx].ref, docs[idx].data)}
                              >
                                Modifica
                              </Button>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </ScrollArea>
        ) : (
          <Paper radius="lg" p="xl" bg="rgba(255,255,255,0.04)" ta="center">
            <Text c="dimmed">
              Nessun risultato {tipo}. Applica i filtri e aggiorna i risultati.
            </Text>
          </Paper>
        )}
      </Card>
    );
  };


  return (
    <Box
      mih="100vh"
      bg="#050505"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(234,179,8,0.16), transparent 34%), linear-gradient(180deg, #050505 0%, #111111 100%)",
      }}
    >
      <Header />

      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header pagina */}
          <Group justify="space-between" align="flex-start">
            <Stack gap={6}>
              <Title order={2} c="white">
                📦 Storico Dati
              </Title>
              <Text c="dimmed" maw={760}>
                Esporta, filtra, visualizza anteprime economiche, congela breakdown ed elimina ordini in sicurezza.
              </Text>
            </Stack>

            <Group gap="xs">
              <Badge variant="light" color="gray" size="lg">
                ArchivioOrdini
              </Badge>
              <Badge variant="filled" color="yellow" size="lg">
                {filtroTipo}
              </Badge>
            </Group>
          </Group>

          {/* KPI */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Card
              withBorder
              radius="xl"
              p="lg"
              bg="rgba(255,255,255,0.04)"
              style={{ borderColor: "rgba(255,255,255,0.10)" }}
            >
              <Text size="sm" c="dimmed">
                Totale ordini
              </Text>
              <Title order={2} c="black" mt={6}>
                {countAll}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                A4: {countA4} • A3: {countA3}
              </Text>
            </Card>

            <Card
              withBorder
              radius="xl"
              p="lg"
              bg="rgba(255,255,255,0.04)"
              style={{ borderColor: "rgba(255,255,255,0.10)" }}
            >
              <Text size="sm" c="dimmed">
                Incassato totale
              </Text>
              <Title order={2} c="black" mt={6}>
                {totalAll.toFixed(2)} €
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                A4: {totaleA4.toFixed(2)} € • A3: {totaleA3.toFixed(2)} €
              </Text>
            </Card>

            <Card
              withBorder
              radius="xl"
              p="lg"
              bg="rgba(255,255,255,0.04)"
              style={{ borderColor: "rgba(255,255,255,0.10)" }}
            >
              <Text size="sm" c="dimmed">
                Periodo
              </Text>
              <Title order={3} c="black" mt={6}>
                {dataInizio || "inizio"} → {dataFine || "fine"}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                {ricercaUtente ? `Utente: ${ricercaUtente}` : "Tutti gli utenti"}
              </Text>
            </Card>
          </SimpleGrid>

          {/* Filtri */}
          <Paper
            withBorder
            radius="xl"
            p="lg"
            bg="rgba(255,255,255,0.04)"
            style={{ borderColor: "rgba(255,255,255,0.10)" }}
          >
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Title order={4} c="black">
                    Filtri
                  </Title>
                  <Text size="sm" c="dimmed">
                    Seleziona periodo, utente e formato ordine.
                  </Text>
                </Stack>

                <SegmentedControl
                  value={filtroTipo}
                  onChange={(value) => setFiltroTipo(value)}
                  data={[
                    { label: "Tutti", value: "Tutti" },
                    { label: "A4", value: "A4" },
                    { label: "A3", value: "A3" },
                  ]}
                />
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                <TextInput
                  label="Dal"
                  type="date"
                  value={dataInizio}
                  onChange={(e) => setDataInizio(e.currentTarget.value)}
                  styles={{
                    label: { color: "black" },
                    input: {
                      background: "rgba(255,255,255,0.06)",
                      color: "black",
                      borderColor: "rgba(255,255,255,0.16)",
                    },
                  }}
                />

                <TextInput
                  label="Al"
                  type="date"
                  value={dataFine}
                  onChange={(e) => setDataFine(e.currentTarget.value)}
                  styles={{
                    label: { color: "black" },
                    input: {
                      background: "rgba(255,255,255,0.06)",
                      color: "black",
                      borderColor: "rgba(255,255,255,0.16)",
                    },
                  }}
                />

                <Box style={{ gridColumn: "span 2" }}>
                  <TextInput
                    label="Cerca utente"
                    placeholder="Nome, cognome, email, telefono"
                    value={ricercaUtente}
                    onChange={(e) => setRicercaUtente(e.currentTarget.value)}
                    styles={{
                      label: { color: "black" },
                      input: {
                        background: "rgba(255,255,255,0.06)",
                        color: "black",
                        borderColor: "rgba(255,255,255,0.16)",
                      },
                    }}
                  />
                </Box>
              </SimpleGrid>

              <Group justify="space-between" align="center">
                <Group>
                  <Button
                    leftSection={<IconSearch size={16} />}
                    onClick={generaAnteprima}
                    disabled={!configsReady}
                    title={!configsReady ? "Attendi il caricamento delle configurazioni…" : "Aggiorna risultati"}
                  >
                    Aggiorna risultati
                  </Button>

                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconRefresh size={16} />}
                    onClick={resetFiltri}
                  >
                    Resetta
                  </Button>
                </Group>

                <Group>
                  <Button
                    variant="light"
                    color="blue"
                    leftSection={<IconUsers size={16} />}
                    onClick={exportUtenti}
                  >
                    Esporta utenti
                  </Button>

                  <Button
                    variant="light"
                    color="yellow"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => exportOrdini("A4")}
                  >
                    Esporta A4
                  </Button>

                  <Button
                    variant="light"
                    color="yellow"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => exportOrdini("A3")}
                  >
                    Esporta A3
                  </Button>

                  <Button
                    variant="light"
                    color="cyan"
                    leftSection={<IconSnowflake size={16} />}
                    onClick={openFreezeModal}
                  >
                    Congela filtrati
                  </Button>

                  <Button
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={openDeleteModal}
                  >
                    Elimina filtrati
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Paper>

          {/* Risultati */}
          <Stack gap="lg">
            {(filtroTipo === "Tutti" || filtroTipo === "A4") &&
              renderDetailTable("A4", detailA4, docsA4, totaleA4)}

            {(filtroTipo === "Tutti" || filtroTipo === "A3") &&
              renderDetailTable("A3", detailA3, docsA3, totaleA3)}
          </Stack>
        </Stack>
      </Container>

      {/* Modal eliminazione */}
      <Modal
        opened={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Conferma eliminazione"
        centered
        radius="lg"
      >
        <Stack>
          <Text>
            Verranno eliminati <strong>{deleteSummary.count}</strong> documenti da{" "}
            <code>ArchivioOrdini</code>.
          </Text>

          <Text>
            Totale economico coinvolto: <strong>{deleteSummary.total.toFixed(2)} €</strong>
          </Text>

          <Text c="red" fw={700}>
            Azione irreversibile. Per confermare, digita ELIMINA.
          </Text>

          <TextInput
            placeholder='Scrivi "ELIMINA"'
            value={confirmDeleteText}
            onChange={(e) => setConfirmDeleteText(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={() => setShowDeleteModal(false)}>
              Annulla
            </Button>

            <Button
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={confirmDelete}
              disabled={confirmDeleteText.trim().toUpperCase() !== "ELIMINA"}
            >
              Conferma eliminazione
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal congelamento */}
      <Modal
        opened={showFreezeModal}
        onClose={() => !freezing && setShowFreezeModal(false)}
        title="Conferma congelamento"
        centered
        radius="lg"
      >
        <Stack>
          <Text>
            Verranno congelati <strong>{freezeSummary.count}</strong> documenti in{" "}
            <code>ArchivioOrdini</code>.
          </Text>

          <Text>
            Totale lordo stimato coinvolto: <strong>{freezeSummary.total.toFixed(2)} €</strong>
          </Text>

          <Text c="dimmed">
            L’operazione scriverà <code>pricingSnapshot</code> e <code>breakdown</code>. Gli ordini già
            congelati verranno ignorati.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={() => !freezing && setShowFreezeModal(false)}
              disabled={freezing}
            >
              Annulla
            </Button>

            <Button
              color="cyan"
              leftSection={<IconSnowflake size={16} />}
              onClick={confirmFreeze}
              disabled={freezing || freezeItems.length === 0}
              loading={freezing}
            >
              Conferma congelamento
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal successo congelamento */}
      <Modal
        opened={showFreezeSuccess}
        onClose={() => setShowFreezeSuccess(false)}
        title="Congelamento completato"
        centered
        radius="lg"
      >
        <Stack>
          <Text>
            Sono stati congelati <strong>{freezeSuccessInfo.count}</strong> ordini.
          </Text>

          <Text>
            Totale lordo coinvolto: <strong>{freezeSuccessInfo.total.toFixed(2)} €</strong>
          </Text>

          <Group justify="flex-end">
            <Button leftSection={<IconCheck size={16} />} onClick={() => setShowFreezeSuccess(false)}>
              Ok
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal successo eliminazione */}
      <Modal
        opened={showDeleteSuccess}
        onClose={() => setShowDeleteSuccess(false)}
        title="Eliminazione completata"
        centered
        radius="lg"
      >
        <Stack>
          <Text>
            Sono stati eliminati <strong>{deleteSuccessInfo.count}</strong> documenti.
          </Text>

          <Text>
            Totale lordo coinvolto: <strong>{deleteSuccessInfo.total.toFixed(2)} €</strong>
          </Text>

          <Group justify="flex-end">
            <Button leftSection={<IconCheck size={16} />} onClick={() => setShowDeleteSuccess(false)}>
              Ok
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal modifica variazione */}
      <Modal
        opened={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Modifica variazione importo"
        centered
        radius="lg"
        size="lg"
      >
        <Stack>
          <Text c="dimmed">
            Imposta una variazione positiva o negativa. Verrà sommata al Prezzo Lordo per ottenere
            il Lordo effettivo e inciderà sul margine, senza ricalcolare IVA o fee.
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Variazione (€)"
              type="number"
              step="0.01"
              value={editDelta}
              onChange={(e) => setEditDelta(e.currentTarget.value)}
              placeholder="es. -2.50 o 3.00"
            />

            <TextInput
              label="Motivo"
              value={editReason}
              onChange={(e) => setEditReason(e.currentTarget.value)}
              placeholder="sconto, integrazione, arrotondamento…"
            />
          </SimpleGrid>

          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={() => setShowEditModal(false)}>
              Annulla
            </Button>

            <Button leftSection={<IconArchive size={16} />} onClick={saveEdit}>
              Salva
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default StoricoDati;
