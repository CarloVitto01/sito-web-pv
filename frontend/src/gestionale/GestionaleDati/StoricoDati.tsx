// src/gestionale/StoricoDati/StoricoDati.tsx
import React, { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../../backend/apiClient";

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

// === Modello dati dal backend (GET /api/storico) ===
type OrderFile = {
  id: number;
  fileIndex: number;
  originalFileName: string;
  pages: number;
  downloadUrl: string;
  plasticaId: number | null;
  plasticaName: string | null;
  rilegatura: string | null;
  inchiostro: string | null;
  pagina: string | null;
  layout: string | null;
  pagineLabel: string | null;
  numeroCopie: number | null;
};

type OrderResponse = {
  id: string;
  tipo: "A4" | "A3";
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  numeroPDF: number;
  numeroCopie: number;
  pagine: string;
  colore: string;
  pagina: string;
  inchiostro: string;
  layout: string;
  rilegatura: string;
  rilegaturaUnica: string;
  grammatura: string;
  plastificazione: string;
  deliveryDayLabel: string | null;
  deliveryTimeRange: string | null;
  deliveryDateISO: string | null;
  metodoPagamento: string;
  statoPagamento: string;
  prezzoLordo: number;
  scontoGenerale: number;
  scontoStudenti: number;
  imponibile: number;
  iva: number;
  trasporto: number;
  paypalFee: number;
  totaleFinale: number;
  costiInterni: number | null;
  frozen: boolean;
  manualAdjustmentDelta: number | null;
  manualAdjustmentReason: string | null;
  timestamp: string;
  files: OrderFile[];
};

// Utente registrato (GET /api/users, già usato in GestionaleUtenti/GestioneAccessi)
type UtenteExport = {
  id: string;
  displayName?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  ruolo?: string;
  corsoLaurea?: string;
  annoAccademico?: string;
};

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
  "Costi interni (€)": string;       // "-" se l'ordine non è ancora stato congelato
  "Margine netto (€)": string;       // "-" se l'ordine non è ancora stato congelato
  Note: string;
  Congelato?: "Sì" | "No";
};

const StoricoDati: React.FC = () => {
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [ricercaUtente, setRicercaUtente] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("Tutti");

  // Tutti gli ordini caricati dal backend (A4 + A3)
  const [allOrders, setAllOrders] = useState<OrderResponse[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Anteprima DETTAGLIO
  const [detailA4, setDetailA4] = useState<DettaglioRow[]>([]);
  const [detailA3, setDetailA3] = useState<DettaglioRow[]>([]);
  const [ordersA4, setOrdersA4] = useState<OrderResponse[]>([]);
  const [ordersA3, setOrdersA3] = useState<OrderResponse[]>([]);
  const [totaleA4, setTotaleA4] = useState(0);
  const [totaleA3, setTotaleA3] = useState(0);

  // Modal eliminazione
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [deleteItems, setDeleteItems] = useState<OrderResponse[]>([]);
  const [deleteSummary, setDeleteSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  // Popup successo eliminazione
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteSuccessInfo, setDeleteSuccessInfo] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  // === Freeze modal state ===
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeItems, setFreezeItems] = useState<OrderResponse[]>([]);
  const [freezeSummary, setFreezeSummary] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [freezing, setFreezing] = useState(false);
  // Popup successo freeze
  const [showFreezeSuccess, setShowFreezeSuccess] = useState(false);
  const [freezeSuccessInfo, setFreezeSuccessInfo] = useState<{ count: number; total: number }>({ count: 0, total: 0 });

  // === Edit modal (variazione manuale) ===
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDelta, setEditDelta] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  // ------- Helpers -------
  const getManualDelta = (order: OrderResponse) =>
    typeof order.manualAdjustmentDelta === "number" && Number.isFinite(order.manualAdjustmentDelta)
      ? order.manualAdjustmentDelta
      : 0;

  const getManualReason = (order: OrderResponse) => order.manualAdjustmentReason ?? "";

  const normalize = useCallback((s?: string) =>
    (s ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim(),
    [],);

  const matchesUtente = useCallback((order: OrderResponse) => {
    const raw = ricercaUtente?.trim();
    if (!raw) return true;

    const q = normalize(raw).replace(/\s+/g, " ");
    const tokens = q.split(" ").filter(Boolean);

    const nome = normalize(order?.nome);
    const cognome = normalize(order?.cognome);
    const email = normalize(order?.email);
    const telefono = (order?.telefono ?? "").toString().replace(/\D/g, "");

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
    setOrdersA4([]);
    setOrdersA3([]);
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

  const getRowMillis = useCallback((order: OrderResponse) => {
    const ms = order?.timestamp ? Date.parse(order.timestamp) : NaN;
    return Number.isFinite(ms) ? ms : 0;
  }, []);

  const applyFilters = useCallback((orders: OrderResponse[]) => {
    return orders
      .filter((o) => matchesUtente(o))
      .filter((o) => withinDateRange(o?.timestamp ? new Date(o.timestamp) : null))
      .sort((a, b) => getRowMillis(b) - getRowMillis(a));
  }, [matchesUtente, withinDateRange, getRowMillis]);

  const detectMetodo = (order: OrderResponse): string => {
    const raw = (order?.metodoPagamento ?? "").toString().toLowerCase();
    if (raw.includes("paypal")) return "PayPal";
    if (raw.includes("cash") || raw.includes("contanti")) return "Contanti";
    if ((order?.statoPagamento ?? "").toString().toLowerCase().includes("consegna")) return "Contanti";
    return order?.metodoPagamento || "n/d";
  };

  // Apri la modale per editare
  const openEdit = (order: OrderResponse) => {
    setEditOrderId(order.id);
    setEditDelta(
      typeof order.manualAdjustmentDelta === "number" && Number.isFinite(order.manualAdjustmentDelta)
        ? String(order.manualAdjustmentDelta)
        : ""
    );
    setEditReason(order.manualAdjustmentReason ?? "");
    setShowEditModal(true);
  };

  // Salva la rettifica manuale sul backend
  const saveEdit = async () => {
    try {
      if (!editOrderId) return;
      const deltaNum = Number(editDelta);
      const hasDelta = !Number.isNaN(deltaNum) && deltaNum !== 0;
      const reason = (editReason || "").trim();

      await api.patch<OrderResponse>(`/api/storico/${editOrderId}/manual-adjustment`, {
        delta: hasDelta ? Number(deltaNum.toFixed(2)) : 0,
        reason,
      });

      setShowEditModal(false);
      setEditOrderId(null);
      setEditDelta("");
      setEditReason("");
      // ricarica l’anteprima per riflettere i nuovi totali
      await refresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiError ? err.message : "Errore durante il salvataggio della variazione.";
      alert(msg);
    }
  };

  /**
   * Calcolo metriche per un ordine, usando direttamente i campi economici piatti
   * dell'OrderResponse (niente più breakdown/pricingSnapshot annidati).
   * Costi interni e margine sono disponibili solo dopo il congelamento
   * (il backend li calcola in POST /api/storico/{id}/freeze).
   */
  const computeMetrics = useCallback((order: OrderResponse): { dettaglio: DettaglioRow; lordoEff: number } => {
    const delta = getManualDelta(order);
    const lordoBase = Number(order.totaleFinale) || 0;
    const lordoEff = lordoBase + delta;
    const ts = order.timestamp ? new Date(order.timestamp) : null;
    const metodo = detectMetodo(order);

    const hasInterni = order.costiInterni !== null && order.costiInterni !== undefined && Number.isFinite(order.costiInterni);
    const interni = hasInterni ? Number(order.costiInterni) : 0;
    const margine = hasInterni
      ? lordoEff - Number(order.trasporto || 0) - Number(order.iva || 0) - interni - Number(order.paypalFee || 0)
      : null;

    const dettaglio: DettaglioRow = {
      Cliente: `${order.nome || ""} ${order.cognome || ""}`.trim(),
      Data: ts ? ts.toLocaleString("it-IT") : "",
      Metodo: metodo,
      "Prezzo Lordo (€)": lordoBase.toFixed(2),
      "Variazione (€)": delta ? delta.toFixed(2) : "",
      "Lordo (effettivo) (€)": lordoEff.toFixed(2),
      "Imponibile (€)": Number(order.imponibile || 0).toFixed(2),
      "IVA (€)": Number(order.iva || 0).toFixed(2),
      "Fee PayPal (€)": Number(order.paypalFee || 0).toFixed(2),
      "Trasporto (€)": Number(order.trasporto || 0).toFixed(2),
      "Costi interni (€)": hasInterni ? interni.toFixed(2) : "-",
      "Margine netto (€)": margine !== null ? margine.toFixed(2) : "-",
      Note: getManualReason(order),
      Congelato: order.frozen ? "Sì" : "No",
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
    const filtered = applyFilters(allOrders).filter((o) => o.tipo === tipo);

    const listSimple: any[] = [];
    const listDetail: DettaglioRow[] = [];

    let totLordoEff = 0;
    let totImponibile = 0;
    let totIva = 0;
    let totPp = 0;
    let totTrasporto = 0;
    let totInterni = 0;
    let totMargine = 0;

    for (const order of filtered) {
      const { dettaglio, lordoEff } = computeMetrics(order);

      totLordoEff += lordoEff;
      totImponibile += Number(dettaglio["Imponibile (€)"]) || 0;
      totIva += Number(dettaglio["IVA (€)"]) || 0;
      totPp += Number(dettaglio["Fee PayPal (€)"]) || 0;
      totTrasporto += Number(dettaglio["Trasporto (€)"]) || 0;
      totInterni += Number(dettaglio["Costi interni (€)"]) || 0;
      totMargine += Number(dettaglio["Margine netto (€)"]) || 0;

      const ts = order.timestamp ? new Date(order.timestamp) : null;
      listSimple.push({
        Nome: order.nome || "",
        Cognome: order.cognome || "",
        Email: order.email || "",
        Telefono: order.telefono || "",
        Data: ts ? ts.toLocaleString("it-IT") : "",
        Prezzo: lordoEff.toFixed(2), // effettivo
        Tipo: tipo,
      });

      listDetail.push(dettaglio);
    }

    if (tipo === "A4") {
      setDetailA4(listDetail);
      setOrdersA4(filtered);
      setTotaleA4(totLordoEff);
    } else {
      setDetailA3(listDetail);
      setOrdersA3(filtered);
      setTotaleA3(totLordoEff);
    }

    const summary = [
      { Voce: `RIEPILOGO ${tipo}`, Valore: "" },
      { Voce: "Ricavi lordi (effettivi)", Valore: totLordoEff.toFixed(2) + " €" },
      { Voce: "Imponibile", Valore: totImponibile.toFixed(2) + " €" },
      { Voce: "IVA", Valore: totIva.toFixed(2) + " €" },
      { Voce: "Fee PayPal", Valore: totPp.toFixed(2) + " €" },
      { Voce: "Trasporto", Valore: totTrasporto.toFixed(2) + " €" },
      { Voce: "Costi interni (solo ordini congelati)", Valore: totInterni.toFixed(2) + " €" },
      { Voce: "Margine netto (solo ordini congelati)", Valore: totMargine.toFixed(2) + " €" },
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
    try {
      const users = await api.get<UtenteExport[]>("/api/users");

      if (!users || users.length === 0) {
        alert("Nessun utente trovato.");
        return;
      }

      const utenti = users.map((u) => ({
        Nome: u.displayName || "",
        Cognome: u.cognome || "",
        Email: u.email || "",
        Telefono: u.telefono || "",
        Corso: u.corsoLaurea || "",
        Anno: u.annoAccademico || "",
        Ruolo: u.ruolo || "PublicUser",
      }));

      const wb = new ExcelJS.Workbook();
      addSheetFromJson(wb, "Utenti", utenti);

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, formatFilename("utenti_registrati"));
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiError ? err.message : "Errore durante l'esportazione utenti.";
      alert(msg);
    }
  };

  // Filtra allOrders coi filtri correnti e aggiorna le tabelle di anteprima.
  // Accetta opzionalmente un array di ordini "freschi" (usato subito dopo un fetch,
  // per evitare di dipendere dallo stato asincrono).
  const generaAnteprima = useCallback((source?: OrderResponse[]) => {
    const list = source ?? allOrders;
    const filtered = applyFilters(list);

    if (filtroTipo === "Tutti" || filtroTipo === "A4") {
      const a4 = filtered.filter((o) => o.tipo === "A4");
      const rows: DettaglioRow[] = [];
      let tot = 0;
      for (const order of a4) {
        const { dettaglio, lordoEff } = computeMetrics(order);
        rows.push(dettaglio);
        tot += lordoEff;
      }
      setDetailA4(rows);
      setOrdersA4(a4);
      setTotaleA4(tot);
    } else {
      setDetailA4([]);
      setOrdersA4([]);
      setTotaleA4(0);
    }

    if (filtroTipo === "Tutti" || filtroTipo === "A3") {
      const a3 = filtered.filter((o) => o.tipo === "A3");
      const rows: DettaglioRow[] = [];
      let tot = 0;
      for (const order of a3) {
        const { dettaglio, lordoEff } = computeMetrics(order);
        rows.push(dettaglio);
        tot += lordoEff;
      }
      setDetailA3(rows);
      setOrdersA3(a3);
      setTotaleA3(tot);
    } else {
      setDetailA3([]);
      setOrdersA3([]);
      setTotaleA3(0);
    }
  }, [allOrders, filtroTipo, applyFilters, computeMetrics]);

  // Carica lo storico ordini dal backend
  const fetchOrders = useCallback(async (): Promise<OrderResponse[]> => {
    try {
      const data = await api.get<OrderResponse[]>("/api/storico");
      setAllOrders(data || []);
      return data || [];
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiError ? err.message : "Errore nel caricamento dello storico ordini.";
      alert(msg);
      return [];
    }
  }, []);

  // Refetch + riapplica i filtri correnti (usato dopo freeze/rettifica/delete e dal bottone "Aggiorna risultati")
  const refresh = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await fetchOrders();
      generaAnteprima(data);
    } finally {
      setPreviewLoading(false);
    }
  }, [fetchOrders, generaAnteprima]);

  // Caricamento iniziale al mount
  useEffect(() => {
    (async () => {
      setPreviewLoading(true);
      try {
        const data = await fetchOrders();
        generaAnteprima(data);
      } finally {
        setPreviewLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- Eliminazione con conferma -------
  const openDeleteModal = () => {
    const filtered = applyFilters(allOrders).filter((o) => filtroTipo === "Tutti" || o.tipo === filtroTipo);

    let total = 0;
    for (const order of filtered) {
      const { lordoEff } = computeMetrics(order);
      total += Number.isFinite(lordoEff) ? lordoEff : 0;
    }

    setDeleteItems(filtered);
    setDeleteSummary({ count: filtered.length, total });
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
      // Non esiste un endpoint di eliminazione bulk: eliminiamo un ordine alla volta.
      await Promise.all(deleteItems.map((order) => api.delete(`/api/storico/${order.id}`)));

      setShowDeleteModal(false);
      setDeleteSuccessInfo({ ...deleteSummary });
      setShowDeleteSuccess(true);

      setDeleteItems([]);
      setDeleteSummary({ count: 0, total: 0 });
      await refresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiError ? err.message : "Si è verificato un errore durante l'eliminazione.";
      alert(msg);
    }
  };

  // ------- Freeze workflow -------
  const openFreezeModal = () => {
    const filtered = applyFilters(allOrders).filter((o) => filtroTipo === "Tutti" || o.tipo === filtroTipo);
    const items = filtered.filter((o) => !o.frozen);

    let total = 0;
    for (const order of items) {
      const delta = getManualDelta(order);
      total += (Number(order.totaleFinale) || 0) + delta;
    }

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

      // Non esiste un endpoint di congelamento bulk: congeliamo un ordine alla volta.
      await Promise.all(freezeItems.map((order) => api.post<OrderResponse>(`/api/storico/${order.id}/freeze`)));

      setShowFreezeModal(false);
      setFreezeSuccessInfo({ ...freezeSummary });
      setShowFreezeSuccess(true);

      setFreezeItems([]);
      setFreezeSummary({ count: 0, total: 0 });
      await refresh();
    } catch (err) {
      console.error(err);
      const msg = err instanceof ApiError ? err.message : "Errore durante il congelamento.";
      alert(msg);
    } finally {
      setFreezing(false);
    }
  };

  // ------- KPI derivati -------
  const countA4 = detailA4.length;
  const countA3 = detailA3.length;
  const totalAll = (totaleA4 || 0) + (totaleA3 || 0);
  const countAll = countA4 + countA3;

  const renderDetailTable = (
    tipo: "A4" | "A3",
    rows: DettaglioRow[],
    orders: OrderResponse[],
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
                    <Table.Tr key={`${tipo}-${orders[idx]?.id ?? idx}`}>
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
                      <Table.Td>
                        <Text
                          fw={700}
                          c={
                            row["Margine netto (€)"] === "-"
                              ? "dimmed"
                              : Number(row["Margine netto (€)"]) >= 0
                                ? "green.4"
                                : "red.4"
                          }
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

                          {orders[idx] && (
                            <Tooltip label="Modifica variazione">
                              <Button
                                size="xs"
                                variant="light"
                                color="yellow"
                                leftSection={<IconEdit size={14} />}
                                onClick={() => openEdit(orders[idx])}
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
                Esporta, filtra, visualizza anteprime economiche, congela i costi interni ed elimina ordini in sicurezza.
              </Text>
            </Stack>

            <Group gap="xs">
              <Badge variant="light" color="gray" size="lg">
                Storico Ordini
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
                    onClick={() => refresh()}
                    loading={previewLoading}
                    title="Aggiorna risultati"
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
              renderDetailTable("A4", detailA4, ordersA4, totaleA4)}

            {(filtroTipo === "Tutti" || filtroTipo === "A3") &&
              renderDetailTable("A3", detailA3, ordersA3, totaleA3)}
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
            Verranno eliminati <strong>{deleteSummary.count}</strong> ordini dallo storico.
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
            Verranno congelati <strong>{freezeSummary.count}</strong> ordini.
          </Text>

          <Text>
            Totale lordo stimato coinvolto: <strong>{freezeSummary.total.toFixed(2)} €</strong>
          </Text>

          <Text c="dimmed">
            L’operazione calcolerà i costi interni (margine) per ciascun ordine. Gli ordini già
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
            Sono stati eliminati <strong>{deleteSuccessInfo.count}</strong> ordini.
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
