import styles from "./RiepilogoOrdine.module.css";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type PaymentPayload = {
  method: "CASH" | "PAYPAL";
  confirmed: boolean;
  orderId?: string;
  captureId?: string;
  payerEmail?: string;
  amount?: number;
  breakdown?: {
    imponibile: number;
    iva: number;
    trasporto: number;
    feePayPal: number;
  };
  delivery?: {
    dateISO: string;          // es. 2025-10-27T12:00:00+02:00
    dayLabel: string;         // es. "Lunedì 27 Ott"
    timeRange: string;        // "12:00–13:00"
    weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Lun ... 7=Dom
  };
};

type RiepilogoA3Props = {
  inchiostro: string;
  pagina: string;
  layout: string;
  grammatura: string;
  plastificazione: string;
  numeroCopie: number;
  numeroPDF: number;
  numeroPagine: number;
  prezzo: string; // "12,50" o "12.50"
  onConfirmOrder: (payment: PaymentPayload) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  submitted?: boolean;

  ivaRate?: number;
  transportFeeEuro?: number;
  paypalPercent?: number;
  paypalFixed?: number;

  authToken?: string;
  csrfToken?: string;
};

type PayPalApproveData = { orderID: string };

const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID as string;
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
const API = (API_BASE || "").replace(/\/+$/, "");

function parseEuro(prezzo: string): number {
  const normalized = prezzo.replace(",", ".").replace(/[^\d.]/g, "");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}
const round2 = (n: number) => Math.round(n * 100) / 100;
const euro = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

declare global { interface Window { paypal?: any; } }

const FEES_COLLECTION = "configTasse";
const FEES_DOC = "fees";

type Fees = {
  ivaRate: number;
  transportFeeEuro: number;
  paypalPercent: number;
  paypalFixed: number;
};

/** ======= Config consegne (da Firestore) ======= */
type TimeRange = { start: string; end: string };
type BlacklistRange = { from: string; to: string };
type DeliveryConfig = {
  weekdays: number[];            // 1..7 (1=Lun ... 7=Dom)
  timeRanges: TimeRange[];       // una o più fasce orarie
  slotsAhead: number;            // quanti slot totali generare
  timezone?: string;             // es. "Europe/Rome"
  blacklistDates?: string[];     // YYYY-MM-DD
  blacklistRanges?: BlacklistRange[]; // intervalli inclusivi [from,to] in YYYY-MM-DD
  minLeadDays?: number;          // NEW: giorni minimi di preavviso (>=1 per escludere oggi)
};
const COLL_CONS = "configConsegne";
const DOC_CONS = "settings";

/** ======= Slot di consegna ======= */
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type DeliverySlot = {
  id: string;
  weekday: Weekday;      // 1..7
  dateISO: string;       // ISO con orario start locale
  dayLabel: string;      // "Lunedì 27 Ott"
  timeRange: string;     // "12:00–13:00"
};

/** ======= Utility date ======= */
const DAY_FULL_IT: Record<Weekday, string> = {
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato",
  7: "Domenica",
};
function pad2(n: number) { return String(n).padStart(2, "0"); }
function itShortMonth(d: Date): string {
  return d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
}
/** ISO con offset locale, non “Z” */
function toTZDateISO(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  const tzOffsetMin = -d.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(tzOffsetMin);
  const HHoff = pad2(Math.floor(abs / 60));
  const MMoff = pad2(abs % 60);
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const DD = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${MM}-${DD}T${HH}:${mi}:${ss}${sign}${HHoff}:${MMoff}`;
}
/** YYYY-MM-DD in LOCALE (no UTC) */
function ymdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
/** weekday(1..7) -> JS getDay (0..6) */
function weekdayToJs(weekday: Weekday): number {
  return weekday === 7 ? 0 : weekday; // 7=Dom -> 0
}

/** ======= Generazione slot: cronologica + blacklist locale + lead time ======= */
function buildSlotsFromConfig(cfg: DeliveryConfig): DeliverySlot[] {
  const weekdays = (Array.isArray(cfg.weekdays) && cfg.weekdays.length ? cfg.weekdays : [1, 3, 5])
    .map(w => Math.min(7, Math.max(1, Number(w)))) as Weekday[];
  const timeRanges = Array.isArray(cfg.timeRanges) && cfg.timeRanges.length
    ? cfg.timeRanges
    : [{ start: "12:00", end: "13:00" }];
  const slotsAhead = Math.max(1, Number(cfg.slotsAhead) || 6);

  const minLeadDays = Math.max(1, Number(cfg.minLeadDays) || 1); // NEW

  const singles = new Set(cfg.blacklistDates || []);
  const ranges = (cfg.blacklistRanges || []).slice();

  const isBlacklisted = (d: Date) => {
    const ymd = ymdLocal(d);
    if (singles.has(ymd)) return true;
    return ranges.some(r => r.from <= ymd && ymd <= r.to);
  };

  const slots: DeliverySlot[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // oggi escluso: prima data selezionabile = oggi + minLeadDays
  const earliest = new Date(now);
  earliest.setDate(now.getDate() + minLeadDays);

  const horizonDays = 120; // margine per molte esclusioni
  for (let i = 0; i < horizonDays && slots.length < slotsAhead; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);

    // rispetta lead time (esclude oggi)
    if (day < earliest) continue;

    const jsDay = day.getDay(); // 0..6
    const weekday: Weekday = (jsDay === 0 ? 7 : (jsDay as 1 | 2 | 3 | 4 | 5 | 6)) as Weekday;

    if (!weekdays.some(w => weekdayToJs(w) === jsDay)) continue;
    if (isBlacklisted(day)) continue;

    for (const tr of timeRanges) {
      const [sh, sm] = String(tr.start || "12:00").split(":").map(Number);
      const [eh, em] = String(tr.end || "13:00").split(":").map(Number);
      const startH = Number.isFinite(sh) ? sh : 12;
      const startM = Number.isFinite(sm) ? sm : 0;
      const endH = Number.isFinite(eh) ? eh : 13;
      const endM = Number.isFinite(em) ? em : 0;

      const dateISO = toTZDateISO(day, startH, startM);
      const label = `${DAY_FULL_IT[weekday]} ${day.getDate()} ${itShortMonth(day)}`;
      const id = `${weekday}-${ymdLocal(day)}-${pad2(startH)}${pad2(startM)}`;

      slots.push({
        id,
        weekday,
        dateISO,
        dayLabel: label,
        timeRange: `${pad2(startH)}:${pad2(startM)}–${pad2(endH)}:${pad2(endM)}`
      });

      if (slots.length >= slotsAhead) break;
    }
  }

  return slots.slice(0, slotsAhead);
}

/** ======= Fallback statico Lun/Mer/Ven 12–13 (rispetta lead time) ======= */
const SLOT_START = { hour: 12, minute: 0 };
const SLOT_END = { hour: 13, minute: 0 };

function buildUpcomingSlotsStatic(n: number, minLeadDays: number = 1): DeliverySlot[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const earliest = new Date(now);
  earliest.setDate(now.getDate() + Math.max(1, minLeadDays)); // NEW

  const slots: DeliverySlot[] = [];
  const horizonDays = 120;
  for (let i = 0; i < horizonDays && slots.length < n; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);

    if (day < earliest) continue; // NEW: esclude oggi

    const jsDay = day.getDay();
    const weekday: Weekday = (jsDay === 0 ? 7 : (jsDay as 1 | 2 | 3 | 4 | 5 | 6)) as Weekday;
    if (![1, 3, 5].includes(weekday)) continue;

    const dateISO = toTZDateISO(day, SLOT_START.hour, SLOT_START.minute);
    const label = `${DAY_FULL_IT[weekday]} ${day.getDate()} ${itShortMonth(day)}`;
    slots.push({
      id: `${weekday}-${ymdLocal(day)}`,
      weekday,
      dateISO,
      dayLabel: label,
      timeRange: `${pad2(SLOT_START.hour)}:${pad2(SLOT_START.minute)}–${pad2(SLOT_END.hour)}:${pad2(SLOT_END.minute)}`
    });
  }
  return slots.slice(0, n);
}

const RiepilogoOrdineA3 = ({
  inchiostro,
  pagina,
  layout,
  grammatura,
  plastificazione,
  numeroCopie,
  numeroPDF,
  numeroPagine,
  prezzo,
  onConfirmOrder,
  disabled = false,
  loading = false,
  submitted = false,

  ivaRate = 0.22,
  transportFeeEuro = 1,
  paypalPercent = 0.0349,
  paypalFixed = 0.35,

  authToken,
  csrfToken,
}: RiepilogoA3Props) => {
  const [progress, setProgress] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "paypal" | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);

  if (!API_BASE) {
    console.warn("REACT_APP_API_BASE_URL non impostata. Configura l'endpoint API e ricompila.");
  }

  const [fees, setFees] = useState<Fees>({
    ivaRate,
    transportFeeEuro,
    paypalPercent,
    paypalFixed,
  });

  /** ======= Lettura live configurazione consegne dal gestionale ======= */
  const [deliveryCfg, setDeliveryCfg] = useState<DeliveryConfig>({
    weekdays: [1, 3, 5],
    timeRanges: [{ start: "12:00", end: "13:00" }],
    slotsAhead: 6,
    timezone: "Europe/Rome",
    blacklistDates: [],
    blacklistRanges: [],
    minLeadDays: 1, // NEW: oggi non selezionabile
  });

  useEffect(() => {
    const ref = doc(db, COLL_CONS, DOC_CONS);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<DeliveryConfig>;
        setDeliveryCfg({
          weekdays: Array.isArray(d.weekdays) && d.weekdays.length ? (d.weekdays as number[]) : [1, 3, 5],
          timeRanges: Array.isArray(d.timeRanges) && d.timeRanges.length ? (d.timeRanges as TimeRange[]) : [{ start: "12:00", end: "13:00" }],
          slotsAhead: typeof d.slotsAhead === "number" ? d.slotsAhead : 6,
          timezone: typeof d.timezone === "string" && d.timezone ? d.timezone : "Europe/Rome",
          blacklistDates: Array.isArray(d.blacklistDates) ? (d.blacklistDates as string[]) : [],
          blacklistRanges: Array.isArray(d.blacklistRanges) ? (d.blacklistRanges as BlacklistRange[]) : [],
          minLeadDays: typeof d.minLeadDays === "number" ? d.minLeadDays : 1, // NEW
        });
      }
    });
    return () => unsub();
  }, []);

  /** ======= Slots consegna dinamici + fallback statico (rispetta lead time) ======= */
  const deliverySlotsFromCfg = useMemo<DeliverySlot[]>(
    () => buildSlotsFromConfig(deliveryCfg),
    [deliveryCfg]
  );
  const deliverySlots = useMemo<DeliverySlot[]>(
    () => (deliverySlotsFromCfg.length
      ? deliverySlotsFromCfg
      : buildUpcomingSlotsStatic(6, deliveryCfg?.minLeadDays ?? 1)),
    [deliverySlotsFromCfg, deliveryCfg?.minLeadDays]
  );

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const selectedSlot = useMemo(
    () => deliverySlots.find(s => s.id === selectedSlotId) || null,
    [deliverySlots, selectedSlotId]
  );

  // ======= Tasse =======
  useEffect(() => {
    const ref = doc(db, FEES_COLLECTION, FEES_DOC);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<Fees>;
        setFees({
          ivaRate: typeof d.ivaRate === "number" ? d.ivaRate : ivaRate,
          transportFeeEuro: typeof d.transportFeeEuro === "number" ? d.transportFeeEuro : transportFeeEuro,
          paypalPercent: typeof d.paypalPercent === "number" ? d.paypalPercent : paypalPercent,
          paypalFixed: typeof d.paypalFixed === "number" ? d.paypalFixed : paypalFixed,
        });
      } else {
        setFees({ ivaRate, transportFeeEuro, paypalPercent, paypalFixed });
      }
    });
    return () => unsub();
  }, [ivaRate, transportFeeEuro, paypalPercent, paypalFixed]);

  const totals = useMemo(() => {
    const base = round2(parseEuro(prezzo));
    const iva = round2(base * fees.ivaRate);
    const trasporto = round2(fees.transportFeeEuro);
    const subTotale = round2(base + iva + trasporto);
    const feePP = paymentMethod === "paypal"
      ? round2(subTotale * fees.paypalPercent + fees.paypalFixed)
      : 0;
    const totaleContanti = subTotale;
    const totalePayPal = round2(subTotale + feePP);
    const totaleDaAddebitare = paymentMethod === "paypal" ? totalePayPal : totaleContanti;

    return {
      base, iva, trasporto, subTotale, feePP, totaleContanti, totalePayPal, totaleDaAddebitare,
    };
  }, [prezzo, fees, paymentMethod]);

  // Carica PayPal SDK quando serve
  useEffect(() => {
    if (paymentMethod !== "paypal") return;

    if (window.paypal) {
      setPaypalReady(true);
      return;
    }

    if (!PAYPAL_CLIENT_ID) {
      console.error("PAYPAL_CLIENT_ID mancante");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=EUR&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => console.error("Impossibile caricare PayPal SDK");
    document.body.appendChild(script);
  }, [paymentMethod]);

  // Helper fetch JSON robusto
  const fetchJSON = useCallback(async <T,>(url: string, body: unknown): Promise<T> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`HTTP ${res.status} su ${url}. Body:`, text.slice(0, 500));
      throw new Error(`Request failed (${res.status})`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      console.error(`Risposta non JSON da ${url}:`, text.slice(0, 500));
      throw new Error("Risposta non JSON dal server");
    }
  }, [authToken, csrfToken]);

  // Render PayPal Buttons
  useEffect(() => {
    if (paymentMethod !== "paypal" || !paypalButtonsContainerRef.current || submitted) return;

    paypalButtonsContainerRef.current.innerHTML = "";

    if (!selectedSlot) {
      const div = document.createElement("div");
      div.className = styles["hint"];
      div.textContent = "Seleziona prima uno slot di consegna per abilitare il pagamento PayPal.";
      paypalButtonsContainerRef.current.appendChild(div);
      return;
    }

    if (!paypalReady) return;

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },

      createOrder: async () => {
        const data = await fetchJSON<{ orderId: string }>(
          `${API}/api/paypal/create-order`,
          { amount: totals.totaleDaAddebitare.toFixed(2), currency: "EUR" }
        );
        if (!data?.orderId || typeof data.orderId !== "string") {
          throw new Error("Risposta backend priva di orderId");
        }
        return data.orderId;
      },

      onApprove: async (data: PayPalApproveData) => {
        try {
          const cap = await fetchJSON<{
            status: string;
            orderId?: string;
            captureId?: string;
            payerEmail?: string;
            amount?: string | number;
          }>(
            `${API}/api/paypal/capture-order`,
            { orderId: data.orderID }
          );

          if (cap.status === "COMPLETED") {
            await onConfirmOrder({
              method: "PAYPAL",
              confirmed: true,
              orderId: cap.orderId,
              captureId: cap.captureId,
              payerEmail: cap.payerEmail,
              amount: Number(cap.amount),
              breakdown: {
                imponibile: totals.base,
                iva: totals.iva,
                trasporto: totals.trasporto,
                feePayPal: totals.feePP,
              },
              delivery: selectedSlot
                ? {
                  dateISO: selectedSlot.dateISO,
                  dayLabel: selectedSlot.dayLabel,
                  timeRange: selectedSlot.timeRange,
                  weekday: selectedSlot.weekday,
                }
                : undefined,
            });
          } else {
            alert("Pagamento non completato: " + cap.status);
          }
        } catch (e) {
          console.error(e);
          alert("Si è verificato un errore durante il pagamento.");
        }
      },

      onError: (err: unknown) => {
        console.error("PayPal error:", err);
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsContainerRef.current);

    return () => {
      try { instance.close(); } catch { /* no-op */ }
    };
  }, [
    paymentMethod,
    paypalReady,
    submitted,
    totals.totaleDaAddebitare,
    totals.base,
    totals.iva,
    totals.trasporto,
    totals.feePP,
    onConfirmOrder,
    fetchJSON,
    selectedSlot,
  ]);

  const handleConfirmOrderCash = async () => {
    if (!selectedSlot) {
      alert("Seleziona prima uno slot di consegna.");
      return;
    }
    await onConfirmOrder({
      method: "CASH",
      confirmed: false,
      amount: totals.totaleContanti,
      breakdown: {
        imponibile: totals.base,
        iva: totals.iva,
        trasporto: totals.trasporto,
        feePayPal: 0,
      },
      delivery: {
        dateISO: selectedSlot.dateISO,
        dayLabel: selectedSlot.dayLabel,
        timeRange: selectedSlot.timeRange,
        weekday: selectedSlot.weekday,
      },
    });
  };

  // Barra di caricamento (solo UI)
  useEffect(() => {
    if (loading) {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 10) + 5;
        if (current >= 90) {
          clearInterval(interval);
        } else {
          setProgress(current);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => { if (submitted) setProgress(100); }, [submitted]);

  return (
    <div className={styles["riepilogo-container"]}>
      <h3 className={styles["riepilogo-title"]}>📋 Riepilogo Ordine A3</h3>

      <div className={`${styles["price-card"]} ${styles["details-card"]}`}>
        <div className={styles["price-header"]}>Dettagli ordine</div>

        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Numero PDF</span>
          <span className={styles["price-value"]}>{numeroPDF}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Numero pagine totali</span>
          <span className={styles["price-value"]}>{numeroPagine}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Grammatura</span>
          <span className={styles["price-value"]}>{grammatura}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Colore</span>
          <span className={styles["price-value"]}>{inchiostro}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Gestione pagina</span>
          <span className={styles["price-value"]}>{pagina}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Layout</span>
          <span className={styles["price-value"]}>{layout}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Plastificazione</span>
          <span className={styles["price-value"]}>{plastificazione}</span>
        </div>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Numero copie</span>
          <span className={styles["price-value"]}>{numeroCopie}</span>
        </div>
      </div>

      {/* Consegna */}
      <div className={`${styles["price-card"]} ${styles["delivery-card"]}`}>
        <div className={styles["price-header"]}>
          Consegna
          {deliveryCfg.timeRanges?.length === 1
            ? ` (${deliveryCfg.timeRanges[0].start}–${deliveryCfg.timeRanges[0].end})`
            : ""}
        </div>
        {!selectedSlot && (
          <p className={styles["hint"]}>Verrai contattato/a tramite WhatsApp per decidere il luogo della consegna.</p>
        )}
        <div className={styles["slots-grid"]} role="listbox" aria-label="Seleziona uno slot di consegna">
          {deliverySlots.map(slot => {
            const selected = slot.id === selectedSlotId;
            return (
              <button
                key={slot.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`${styles["slot-card"]} ${selected ? styles["slot-selected"] : ""}`}
                onClick={() => setSelectedSlotId(slot.id)}
              >
                <span className={styles["slot-day"]}>{slot.dayLabel}</span>
                <span className={styles["slot-time"]}>{slot.timeRange}</span>
              </button>
            );
          })}
        </div>
        {!selectedSlot && (
          <p className={styles["hint"]}>Seleziona uno slot per procedere al pagamento.</p>
        )}
      </div>

      {/* Totali */}
      <div className={`${styles["price-card"]} ${styles["price-left"]}`}>
        {paymentMethod === "paypal" && (
          <div className={`${styles["price-row"]} ${styles["price-fee-paypal"]}`}>
            <span className={styles["price-label"]}>
              Fee PayPal ({(fees.paypalPercent * 100).toFixed(2)}% + {euro(fees.paypalFixed)} €)
            </span>
            <span className={styles["price-value"]}>{euro(totals.feePP)} €</span>
          </div>
        )}

        <div className={`${styles["price-row"]} ${styles["price-total"]}`}>
          <span className={styles["price-label"]}>
            Totale(IVA Incl.) {paymentMethod === "paypal" ? "PayPal" : "Contanti"}
          </span>
          <span className={styles["price-value"]}>{euro(totals.totaleDaAddebitare)} €</span>
        </div>
      </div>

      {/* Metodi di pagamento */}
      <div className={styles["payment-box"]} role="group" aria-label="Seleziona metodo di pagamento">
        <button
          type="button"
          className={`${styles["pay-button"]} ${paymentMethod === "cash" ? styles["selected"] : ""}`}
          onClick={() => setPaymentMethod("cash")}
          aria-pressed={paymentMethod === "cash"}
        >
          💵 Contanti
          <span className={styles["pay-subtext"]}>Paga in contanti alla consegna</span>
        </button>

        <button
          type="button"
          className={`${styles["pay-button"]} ${paymentMethod === "paypal" ? styles["selected"] : ""}`}
          onClick={() => setPaymentMethod("paypal")}
          aria-pressed={paymentMethod === "paypal"}
        >
          🟦 PayPal
          <span className={styles["pay-subtext"]}>Paga con PayPal</span>
        </button>
      </div>

      {/* Flusso PayPal */}
      {paymentMethod === "paypal" && (
        <div className={styles["paypal-flow"]}>
          <p className={styles["hint"]}>
            Completa il pagamento di <strong>{euro(totals.totaleDaAddebitare)} €</strong> con PayPal. Al termine l’ordine partirà automaticamente.
          </p>
          <div ref={paypalButtonsContainerRef} />
        </div>
      )}

      {/* Pulsante Conferma (solo contanti) */}
      {!loading && !submitted && paymentMethod === "cash" && (
        <button
          className={styles["confirm-button"]}
          onClick={handleConfirmOrderCash}
          disabled={disabled || loading || submitted || !selectedSlot}
          title={!selectedSlot ? "Seleziona uno slot di consegna" : "Conferma Ordine"}
        >
          ✅ Conferma Ordine
        </button>
      )}

      {loading && (
        <>
          <p className={styles.loadingText}>Invio in corso: attendere il completamento della barra.</p>
          <div className={styles.loader}>
            <div className={styles.loaderBar} style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {submitted && <div className={styles.successMessage}>🎉 Ordine inviato con successo!</div>}
    </div>
  );
};

export default RiepilogoOrdineA3;
