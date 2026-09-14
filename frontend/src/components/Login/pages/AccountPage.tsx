import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Loader,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconCoin,
  IconDeviceFloppy,
  IconHome,
  IconKey,
  IconReceipt2,
  IconSchool,
  IconShoppingBag,
  IconUser,
} from "@tabler/icons-react";

import {
  auth,
  recoverPassword,
  updateProfile,
} from "../../../backend/auth";
import { api } from "../../../backend/apiClient";

import Header from "../../HeaderComponents/Header";
import Footer from "../../FooterComponents/Footer";

/* -------------------------------------------------------------------------- */
/* Tipi e utilità                                                             */
/* -------------------------------------------------------------------------- */

type AccountProfile = {
  displayName?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
  corsoLaurea?: string;
  annoAccademico?: string | number | null;
};

type LegacyTimestamp = {
  toDate?: () => Date;
};

type Order = {
  id: string;
  tipo?: string;
  prezzo?: number | string;
  totaleFinale?: number | string;
  timestamp?: string | null | LegacyTimestamp;
  stato?: string;
  metodoPagamento?: string;
  statoPagamento?: string;
  _tsMillis?: number;
};

const PAGE_SIZE = 10;

const fmtEuro = (value: number) =>
  value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function parsePrice(value: number | string | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getOrderDate(timestamp: Order["timestamp"]): Date | null {
  try {
    const date =
      typeof timestamp === "string"
        ? new Date(timestamp)
        : timestamp?.toDate?.();

    return date && !Number.isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

function fmtDate(timestamp: Order["timestamp"]): string {
  const date = getOrderDate(timestamp);

  return date
    ? new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date)
    : "Data non disponibile";
}

const CORSI_LAUREA_OPTIONS = [
  { value: "Medicina", label: "Medicina" },
  { value: "Odontoiatria", label: "Odontoiatria" },
  { value: "Infermieristica", label: "Infermieristica" },
  { value: "Fisioterapia", label: "Fisioterapia" },
  { value: "Biotecnologie", label: "Biotecnologie" },
  { value: "Farmacia", label: "Farmacia" },
  { value: "CTF", label: "CTF" },
  { value: "Giurisprudenza", label: "Giurisprudenza" },
  { value: "Economia", label: "Economia" },
  { value: "Ingegneria", label: "Ingegneria" },
  { value: "Lettere", label: "Lettere" },
  {
    value: "Scienze della formazione",
    label: "Scienze della formazione",
  },
  { value: "Scienze motorie", label: "Scienze motorie" },
  { value: "Altro", label: "Altro" },
];

const ANNI_CORSO_OPTIONS = [
  { value: "1", label: "1° anno" },
  { value: "2", label: "2° anno" },
  { value: "3", label: "3° anno" },
  { value: "4", label: "4° anno" },
  { value: "5", label: "5° anno" },
  { value: "6", label: "6° anno" },
];

function normalizeAnnoCorsoValue(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return ["1", "2", "3", "4", "5", "6"].includes(raw) ? raw : null;
}

function normalizeCorsoLaureaValue(value: unknown): string | null {
  const raw = String(value ?? "").trim();

  return (
    CORSI_LAUREA_OPTIONS.find(
      (option) => option.value.toLowerCase() === raw.toLowerCase()
    )?.value ?? null
  );
}

/* -------------------------------------------------------------------------- */
/* Stile                                                                      */
/* -------------------------------------------------------------------------- */

const ACCOUNT_STYLES = `
.pageBg:has(.pv-account) {
  background: #f6f3ed;
}

.pageBg:has(.pv-account)::before {
  display: none;
}

.pv-account {
  --account-dark: linear-gradient(180deg, #202223, #383a3b);
  --account-ink: #182331;
  --account-muted: #697586;
  --account-gold: #a37c32;
  --account-line: #e2e6eb;
  min-height: 100dvh;
  background: #f6f3ed;
  color: var(--account-ink);
  color-scheme: light;
  font-family: Inter, system-ui, sans-serif;
}

.pv-account *,
.pv-account *::before,
.pv-account *::after {
  box-sizing: border-box;
}

.pv-account-header {
  position: relative;
  z-index: 201;
  max-width: 1240px;
  margin: 0 auto;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 9px 24px #11182020;
}

.pv-account-main {
  max-width: 1320px;
  margin: 0 auto;
  padding: 38px 24px 48px;
}

.pv-account-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  padding: 30px;
  border: 1px solid #ffffff18;
  border-radius: 22px;
  background: var(--account-dark);
  box-shadow: 0 12px 30px #18233112;
}

.pv-account-identity {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.pv-account-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border: 1px solid #dbc18a66;
  border-radius: 19px;
  background: #d4af6a18;
  color: #ead29f;
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -.04em;
}

.pv-account-eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #dfc48d;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .15em;
}

.pv-account-hero h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -.045em;
}

.pv-account-hero p {
  margin: 9px 0 0;
  color: #c5c7ca;
  font-size: 13px;
  line-height: 1.6;
}

.pv-account .pv-account-home-button {
  min-height: 43px;
  border: 1px solid #ffffff30;
  border-radius: 11px;
  background: #ffffff0a;
  color: #fff;
}

.pv-account .pv-account-home-button:hover {
  background: #ffffff16;
}

.pv-account-notice {
  margin-top: 18px;
}

.pv-account-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 22px 0;
}

.pv-account-stat {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
  padding: 21px 24px;
  border: 1px solid var(--account-line);
  border-radius: 16px;
  background: #fff;
}

.pv-account-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 43px;
  height: 43px;
  border: 1px solid #eadfc7;
  border-radius: 12px;
  background: #f8f2e6;
  color: var(--account-gold);
}

.pv-account-stat strong {
  display: block;
  color: var(--account-ink);
  font-size: 26px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -.04em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.pv-account-stat p {
  margin: 6px 0 0;
  color: var(--account-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pv-account-grid {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
  gap: 22px;
  align-items: start;
}

.pv-account-panel {
  min-width: 0;
  border: 1px solid var(--account-line);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 5px 18px #18233104;
}

.pv-account-panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 22px 24px;
  border-bottom: 1px solid var(--account-line);
}

.pv-account-panel-heading h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -.025em;
}

.pv-account-panel-heading p {
  margin: 6px 0 0;
  color: var(--account-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pv-account-panel-content {
  padding: 24px;
}

.pv-account-form-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.pv-account .mantine-InputWrapper-label {
  margin-bottom: 7px;
  color: #354253;
  font-size: 12px;
  font-weight: 600;
}

.pv-account .mantine-Input-input {
  min-height: 44px;
  border-color: #dfe4e9;
  border-radius: 10px;
  background: #fff;
  color: var(--account-ink);
  font-size: 14px;
}

.pv-account .mantine-Input-input:focus,
.pv-account .mantine-Input-input:focus-within {
  border-color: #b89650;
}

.pv-account input[readonly] {
  background: #f4f6f8;
  color: #697586;
}

.pv-account-student {
  padding: 16px;
  border: 1px solid #e9e0ce;
  border-radius: 13px;
  background: #fcf9f2;
}

.pv-account-student-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 13px;
  color: #81612a;
  font-size: 12px;
  font-weight: 650;
}

.pv-account-student-fields {
  margin-top: 17px;
}

.pv-account-form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 6px;
}

.pv-account .pv-account-save {
  min-height: 45px;
  border: 1px solid #bc974d;
  border-radius: 11px;
  background: linear-gradient(135deg, #ebcf8e, #d3ac5c);
  color: #241d10;
  box-shadow: 0 4px 12px #a8823018;
}

.pv-account .pv-account-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #f1d89f, #dcb66a);
}

.pv-account-security {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
  padding: 20px 24px;
  border-top: 1px solid var(--account-line);
  border-radius: 0 0 20px 20px;
  background: #fafbfc;
}

.pv-account-security h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}

.pv-account-security p {
  max-width: 250px;
  margin: 5px 0 0;
  color: var(--account-muted);
  font-size: 11px;
  line-height: 1.5;
}

.pv-account .pv-account-secondary {
  border: 1px solid #ded6c5;
  border-radius: 10px;
  background: #fff;
  color: #81612a;
}

.pv-account .pv-account-secondary:hover:not(:disabled) {
  background: #f8f2e6;
}

.pv-account-count {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  min-width: 32px;
  height: 32px;
  padding: 0 9px;
  border-radius: 9px;
  background: #f3ede0;
  color: #876527;
  font-size: 12px;
  font-weight: 650;
}

.pv-account-orders {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pv-account-order {
  min-width: 0;
  padding: 17px;
  border: 1px solid #e3e7ec;
  border-radius: 14px;
  background: #fff;
  transition: border-color .18s ease, box-shadow .18s ease;
}

.pv-account-order:hover {
  border-color: #d3c19c;
  box-shadow: 0 5px 14px #18233106;
}

.pv-account-order-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.pv-account-order-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.pv-account-order-name .pv-account-icon {
  width: 36px;
  height: 42px;
  border-radius: 9px;
}

.pv-account-order-name h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.pv-account-order-date {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  color: var(--account-muted);
  font-size: 11px;
}

.pv-account-order-amount {
  flex-shrink: 0;
  color: #876225;
  font-size: 18px;
  font-weight: 650;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pv-account-order-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #edf0f3;
}

.pv-account-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.pv-account-tag {
  padding: 5px 8px;
  border-radius: 6px;
  background: #f0f3f6;
  color: #5a6776;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.pv-account-tag--paid {
  background: #edf6ef;
  color: #34734d;
}

.pv-account-tag--pending {
  background: #fbf1dc;
  color: #8d6725;
}

.pv-account-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--account-line);
}

.pv-account-pagination p {
  margin: 0;
  color: var(--account-muted);
  font-size: 11px;
}

.pv-account-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
  padding: 38px 18px;
  border: 1px dashed #ddd8cd;
  border-radius: 14px;
  background: #fcfaf6;
  text-align: center;
}

.pv-account-empty h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.pv-account-empty p {
  max-width: 290px;
  margin: 0;
  color: var(--account-muted);
  font-size: 12px;
  line-height: 1.7;
}

.pv-account-loading {
  padding: 35px;
  border: 1px solid var(--account-line);
  border-radius: 18px;
  background: #fff;
}

.pv-account-footer {
  background: var(--account-dark);
}

.pv-account-footer footer {
  background: transparent !important;
}

.pv-account-footer .mantine-SimpleGrid-root > div {
  min-width: 0 !important;
}

@media (max-width: 62em) {
  .pv-account-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .pv-account-header {
    border-radius: 0;
  }

  .pv-account-main {
    padding: 22px 14px 30px;
  }

  .pv-account-hero {
    padding: 22px 18px;
    border-radius: 17px;
  }

  .pv-account-avatar {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    font-size: 18px;
  }

  .pv-account-identity {
    align-items: flex-start;
    gap: 12px;
  }

  .pv-account-stats {
    gap: 10px;
    margin: 16px 0;
  }

  .pv-account-stat {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
  }

  .pv-account-stat strong {
    font-size: 22px;
  }

  .pv-account-panel-heading,
  .pv-account-panel-content,
  .pv-account-security {
    padding: 18px;
  }

  .pv-account-form-actions .mantine-Button-root {
    width: 100%;
  }

  .pv-account-order {
    padding: 13px;
  }

  .pv-account-order-top {
    flex-wrap: wrap;
  }

  .pv-account-pagination {
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pv-account * {
    transition: none !important;
    animation: none !important;
  }
}
  /* Header e contenuto allineati alla stessa larghezza */
.pv-account {
  --account-width: 1240px;
}

.pv-account-header {
  width: calc(100% - 48px);
  max-width: var(--account-width);
  margin-inline: auto;
  border-radius: 0 0 18px 18px;
  overflow: clip;
}

.pv-account-main {
  width: calc(100% - 48px);
  max-width: var(--account-width);
  margin-inline: auto;
  padding: 30px 0 48px;
}

/* Due colonne uguali */
.pv-account-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: stretch;
  gap: 22px;
}

.pv-account-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.pv-account-panel-heading {
  flex-shrink: 0;
  min-height: 96px;
  padding: 22px 24px;
}

.pv-account-panel-content {
  padding: 24px;
}

.pv-account-security {
  margin-top: auto;
  flex-shrink: 0;
}

/* Desktop: lo storico occupa l’altezza del pannello profilo.
   Gli ordini scorrono all’interno, la paginazione resta sotto. */
@media (min-width: 62em) {
  .pv-account-panel[aria-labelledby="account-orders-title"] {
    position: relative;
    min-height: 0;
  }

  .pv-account-panel[aria-labelledby="account-orders-title"]
    > .pv-account-panel-content {
    position: absolute;
    inset: 96px 0 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .pv-account-orders {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 2px;
    scrollbar-width: thin;
    scrollbar-color: #c6b68f transparent;
    scrollbar-gutter: stable;
  }

  .pv-account-order {
    flex-shrink: 0;
  }

  .pv-account-pagination {
    flex-shrink: 0;
    margin-top: 16px;
    padding-top: 16px;
  }

  .pv-account-empty {
    flex: 1;
    justify-content: center;
  }
}

/* Tablet e telefono: pannelli uno sotto l’altro */
@media (width < 62em) {
  .pv-account-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .pv-account-header {
    width: calc(100% - 28px);
    border-radius: 0 0 16px 16px;
  }

  .pv-account-main {
    width: calc(100% - 28px);
    padding: 22px 0 30px;
  }

  .pv-account-panel-heading {
    min-height: 88px;
    padding: 18px;
  }

  .pv-account-panel-content {
    padding: 18px;
  }
}
`;

/* -------------------------------------------------------------------------- */
/* Pagina                                                                     */
/* -------------------------------------------------------------------------- */

const AccountPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [checkingOrders, setCheckingOrders] = useState<string[]>([]);

  const [userData, setUserData] = useState<AccountProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState("");

  const [isStudente, setIsStudente] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;

    const fetchData = async () => {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      setUserData({
        displayName: user.displayName || "",
        cognome: user.cognome || "",
        email: user.email || "",
        telefono: user.telefono || "",
        corsoLaurea: user.corsoLaurea || "",
        annoAccademico: user.annoAccademico ?? "",
      });

      setIsStudente(!!user.corsoLaurea || !!user.annoAccademico);

      try {
        const rawOrders = await api.get<Order[]>("/api/orders/mine");

        const sortedOrders = rawOrders
          .map((order) => ({
            ...order,
            _tsMillis: getOrderDate(order.timestamp)?.getTime() ?? 0,
          }))
          .sort((a, b) => b._tsMillis - a._tsMillis);

        if (alive) {
          setOrders(sortedOrders);
          setOrdersError("");
        }
      } catch (err) {
        console.error(err);

        if (alive) {
          setOrdersError(
            "Non è stato possibile caricare lo storico ordini. Ricarica la pagina per riprovare."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      alive = false;
    };
  }, [navigate]);

  const totalSpent = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.metodoPagamento !== "PayPal" ||
            order.statoPagamento === "Pagato"
        )
        .reduce(
          (sum, order) =>
            sum + parsePrice(order.totaleFinale ?? order.prezzo),
          0
        ),
    [orders]
  );

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  const initials =
    [userData?.displayName, userData?.cognome]
      .map((value) => value?.trim().charAt(0) || "")
      .join("")
      .toUpperCase() || "PV";

  const emailReadonly = auth.currentUser?.email || "";

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;

    setUserData((previous) => ({
      ...(previous || {}),
      [name]: value,
    }));
  };

  const handleSelectChange = (
    name: "corsoLaurea" | "annoAccademico",
    value: string | null
  ) => {
    setUserData((previous) => ({
      ...(previous || {}),
      [name]: value || "",
    }));
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    setError("");
    setSuccess("");

    if (!auth.currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    const corsoLaurea = isStudente
      ? normalizeCorsoLaureaValue(userData?.corsoLaurea) || ""
      : "";

    const annoAccademico = isStudente
      ? normalizeAnnoCorsoValue(userData?.annoAccademico) || ""
      : "";

    if (isStudente && !corsoLaurea) {
      setError("Seleziona il corso di laurea.");
      return;
    }

    if (isStudente && !annoAccademico) {
      setError("Seleziona l’anno di corso.");
      return;
    }

    const updatedData = {
      displayName: userData?.displayName || "",
      cognome: userData?.cognome || "",
      telefono: userData?.telefono || "",
      corsoLaurea,
      annoAccademico,
    };

    try {
      setSaving(true);
      await updateProfile(updatedData);

      setUserData((previous) => ({
        ...(previous || {}),
        ...updatedData,
      }));

      setSuccess("Dati aggiornati con successo!");
    } catch (err) {
      console.error(err);
      setError("Errore durante l’aggiornamento. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (resettingPassword) return;

    setError("");
    setSuccess("");

    const user = auth.currentUser;

    if (!user?.email || !user?.telefono) {
      setError(
        "Per recuperare la password sono necessari email e telefono salvati nel profilo."
      );
      return;
    }

    try {
      setResettingPassword(true);
      await recoverPassword(user.telefono, user.email);
      setSuccess("Email per il cambio password inviata!");
    } catch (err) {
      console.error(err);
      setError("Errore durante l’invio dell’email. Riprova.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleReconcile = async (orderId: string) => {
    if (checkingOrders.includes(orderId)) return;

    setCheckingOrders((previous) => [...previous, orderId]);

    try {
      const result = await api.post<{ status: string }>(
        `/api/paypal/reconcile/${encodeURIComponent(orderId)}`
      );

      if (result.status === "COMPLETED") {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId
              ? { ...order, statoPagamento: "Pagato" }
              : order
          )
        );
      } else {
        window.alert("Il pagamento non risulta ancora completato.");
      }
    } catch (err) {
      console.error(err);
      window.alert(
        "Verifica momentaneamente non disponibile. Riprova tra poco."
      );
    } finally {
      setCheckingOrders((previous) =>
        previous.filter((id) => id !== orderId)
      );
    }
  };

  return (
    <div className="pv-account">
      <style>{ACCOUNT_STYLES}</style>

      <div className="pv-account-header">
        <Header />
      </div>

      <main className="pv-account-main">
        {loading ? (
          <div className="pv-account-loading" role="status">
            <Group gap="sm">
              <Loader color="gold" size="sm" />
              <Text size="sm" c="#657180">
                Caricamento del tuo account…
              </Text>
            </Group>
          </div>
        ) : (
          <>
            <section className="pv-account-hero">
              <div className="pv-account-identity">
                <div className="pv-account-avatar" aria-hidden="true">
                  {initials}
                </div>

                <div>
                  <span className="pv-account-eyebrow">
                    PHOTO & VISION · AREA PERSONALE
                  </span>

                  <h1>Il mio account</h1>

                  <p>
                    Gestisci il tuo profilo e ritrova tutte le tue stampe.
                  </p>
                </div>
              </div>

              <Button
                className="pv-account-home-button"
                leftSection={<IconHome size={17} />}
                onClick={() => navigate("/")}
              >
                Torna alla stampa
              </Button>
            </section>

            {(success || error) && (
              <Alert
                className="pv-account-notice"
                radius="md"
                variant="light"
                color={error ? "red" : "green"}
                role={error ? "alert" : "status"}
                icon={
                  error ? (
                    <IconAlertCircle size={18} />
                  ) : (
                    <IconCheck size={18} />
                  )
                }
              >
                {error || success}
              </Alert>
            )}

            <div className="pv-account-stats">
              <div className="pv-account-stat">
                <span className="pv-account-icon" aria-hidden="true">
                  <IconShoppingBag size={22} />
                </span>

                <div>
                  <strong>{ordersError ? "—" : orders.length}</strong>
                  <p>Ordini effettuati</p>
                </div>
              </div>

              <div className="pv-account-stat">
                <span className="pv-account-icon" aria-hidden="true">
                  <IconCoin size={22} />
                </span>

                <div>
                  <strong>
                    {ordersError ? "—" : `${fmtEuro(totalSpent)} €`}
                  </strong>
                  <p>Totale ordini confermati</p>
                </div>
              </div>
            </div>

            <div className="pv-account-grid">
              <section
                className="pv-account-panel"
                aria-labelledby="account-profile-title"
              >
                <div className="pv-account-panel-heading">
                  <div>
                    <h2 id="account-profile-title">Dati personali</h2>
                    <p>Le informazioni associate al tuo account.</p>
                  </div>

                  <span className="pv-account-icon" aria-hidden="true">
                    <IconUser size={21} />
                  </span>
                </div>

                <div className="pv-account-panel-content">
                  <form onSubmit={handleUpdate}>
                    <fieldset
                      className="pv-account-form-fieldset"
                      disabled={saving}
                      aria-label="Modifica dati personali"
                    >
                      <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                          <TextInput
                            label="Nome"
                            name="displayName"
                            autoComplete="given-name"
                            value={userData?.displayName || ""}
                            onChange={handleChange}
                            required
                          />

                          <TextInput
                            label="Cognome"
                            name="cognome"
                            autoComplete="family-name"
                            value={userData?.cognome || ""}
                            onChange={handleChange}
                            required
                          />
                        </SimpleGrid>

                        <TextInput
                          label="Email"
                          type="email"
                          autoComplete="email"
                          value={emailReadonly}
                          readOnly
                        />

                        <TextInput
                          label="Telefono"
                          name="telefono"
                          type="tel"
                          autoComplete="tel"
                          value={userData?.telefono || ""}
                          onChange={handleChange}
                          required
                        />

                        <div className="pv-account-student">
                          <div className="pv-account-student-heading">
                            <IconSchool size={19} aria-hidden="true" />
                            Profilo universitario
                          </div>

                          <Checkbox
                            label="Studente universitario (Ecotekne)"
                            checked={isStudente}
                            color="gold"
                            onChange={(event) => {
                              setIsStudente(event.currentTarget.checked);
                            }}
                            styles={{
                              label: {
                                color: "#354253",
                                fontSize: 12,
                              },
                            }}
                          />

                          {isStudente && (
                            <div className="pv-account-student-fields">
                              <SimpleGrid
                                cols={{ base: 1, sm: 2 }}
                                spacing="sm"
                              >
                                <Select
                                  label="Corso di laurea"
                                  placeholder="Seleziona corso"
                                  value={normalizeCorsoLaureaValue(
                                    userData?.corsoLaurea
                                  )}
                                  onChange={(value) =>
                                    handleSelectChange("corsoLaurea", value)
                                  }
                                  data={CORSI_LAUREA_OPTIONS}
                                  searchable
                                  clearable
                                  required
                                  disabled={saving}
                                  nothingFoundMessage="Nessun corso trovato"
                                />

                                <Select
                                  label="Anno di corso"
                                  placeholder="Seleziona anno"
                                  value={normalizeAnnoCorsoValue(
                                    userData?.annoAccademico
                                  )}
                                  onChange={(value) =>
                                    handleSelectChange(
                                      "annoAccademico",
                                      value
                                    )
                                  }
                                  data={ANNI_CORSO_OPTIONS}
                                  clearable
                                  required
                                  disabled={saving}
                                />
                              </SimpleGrid>
                            </div>
                          )}
                        </div>

                        <div className="pv-account-form-actions">
                          <Button
                            className="pv-account-save"
                            type="submit"
                            loading={saving}
                            leftSection={<IconDeviceFloppy size={17} />}
                          >
                            Salva modifiche
                          </Button>
                        </div>
                      </Stack>
                    </fieldset>
                  </form>
                </div>

                <div className="pv-account-security">
                  <div>
                    <h3>Accesso e sicurezza</h3>
                    <p>
                      Ricevi un’email per impostare una nuova password.
                    </p>
                  </div>

                  <Button
                    className="pv-account-secondary"
                    size="xs"
                    loading={resettingPassword}
                    disabled={saving}
                    leftSection={<IconKey size={15} />}
                    onClick={handlePasswordReset}
                  >
                    Cambia password
                  </Button>
                </div>
              </section>

              <section
                className="pv-account-panel"
                aria-labelledby="account-orders-title"
              >
                <div className="pv-account-panel-heading">
                  <div>
                    <h2 id="account-orders-title">Storico ordini</h2>
                    <p>Le tue stampe, dalla più recente.</p>
                  </div>

                  <span className="pv-account-count">
                    {ordersError ? "—" : orders.length}
                  </span>
                </div>

                <div className="pv-account-panel-content">
                  {ordersError ? (
                    <Alert
                      color="red"
                      radius="md"
                      icon={<IconAlertCircle size={18} />}
                    >
                      {ordersError}
                    </Alert>
                  ) : orders.length === 0 ? (
                    <div className="pv-account-empty">
                      <span
                        className="pv-account-icon"
                        aria-hidden="true"
                      >
                        <IconReceipt2 size={23} />
                      </span>

                      <h3>La tua prossima stampa parte da qui</h3>

                      <p>
                        Non hai ancora effettuato ordini. Carica un PDF
                        e scegli formato e finiture.
                      </p>

                      <Button
                        className="pv-account-save"
                        onClick={() => navigate("/")}
                      >
                        Stampa il tuo primo PDF
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="pv-account-orders">
                        {paginatedOrders.map((order) => {
                          const total = fmtEuro(
                            parsePrice(order.totaleFinale ?? order.prezzo)
                          );

                          const isPaid =
                            order.statoPagamento === "Pagato";

                          const pendingPaypal =
                            order.metodoPagamento === "PayPal" &&
                            !isPaid;

                          return (
                            <article
                              key={order.id}
                              className="pv-account-order"
                            >
                              <div className="pv-account-order-top">
                                <div className="pv-account-order-name">
                                  <span
                                    className="pv-account-icon"
                                    aria-hidden="true"
                                  >
                                    <IconReceipt2 size={19} />
                                  </span>

                                  <div>
                                    <h3>
                                      {order.tipo
                                        ? `Stampa ${order.tipo}`
                                        : "Ordine di stampa"}
                                    </h3>

                                    <div className="pv-account-order-date">
                                      <IconCalendar
                                        size={13}
                                        aria-hidden="true"
                                      />
                                      {fmtDate(order.timestamp)}
                                    </div>
                                  </div>
                                </div>

                                <span className="pv-account-order-amount">
                                  {total} €
                                </span>
                              </div>

                              <div className="pv-account-order-bottom">
                                <div className="pv-account-tags">
                                  {order.stato && (
                                    <span className="pv-account-tag">
                                      {order.stato}
                                    </span>
                                  )}

                                  {order.metodoPagamento && (
                                    <span className="pv-account-tag">
                                      {order.metodoPagamento}
                                    </span>
                                  )}

                                  {order.statoPagamento && (
                                    <span
                                      className={[
                                        "pv-account-tag",
                                        isPaid
                                          ? "pv-account-tag--paid"
                                          : pendingPaypal
                                            ? "pv-account-tag--pending"
                                            : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    >
                                      {order.statoPagamento}
                                    </span>
                                  )}
                                </div>

                                {pendingPaypal && (
                                  <Button
                                    className="pv-account-secondary"
                                    size="xs"
                                    loading={checkingOrders.includes(
                                      order.id
                                    )}
                                    onClick={() =>
                                      handleReconcile(order.id)
                                    }
                                  >
                                    Verifica pagamento
                                  </Button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>

                      <div className="pv-account-pagination">
                        <p>
                          {(page - 1) * PAGE_SIZE + 1}–
                          {Math.min(page * PAGE_SIZE, orders.length)}
                          {" di "}
                          {orders.length} ordini
                        </p>

                        {totalPages > 1 && (
                          <Pagination
                            total={totalPages}
                            value={page}
                            onChange={setPage}
                            color="gold"
                            radius="md"
                            size="sm"
                            siblings={0}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <div className="pv-account-footer">
        <Footer />
      </div>
    </div>
  );
};

export default AccountPage;