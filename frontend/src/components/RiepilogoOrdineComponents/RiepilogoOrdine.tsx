// ✅ src/components/RiepilogoOrdineComponents/RiepilogoOrdine.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "../../backend/auth";
import { api } from "../../backend/apiClient";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";

import MetodoPagamentoPicker from "../CardComponents/MetodoPagamentoPicker";
import ConsegnaSlotPicker, { type DeliverySlot } from "../CardComponents/ConsegnaSlotPicker";
import UploadProgressBar, { type UploadProgressState } from "./UploadProgressBar";

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

    // ✅ Nuovo: non rompe nulla perché opzionale
    scontoGenerale?: number;
    scontoStudenti?: number;
    subtotaleLordo?: number;
  };
  delivery?: {
    dateISO: string;
    dayLabel: string;
    timeRange: string;
    weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  };
};

type RiepilogoProps = {
  tipo?: "A4" | "A3";

  inchiostro: string;
  pagina: string;
  layout: string;
  rilegatura: string;
  rilegaturaUnica: string;
  intervalloPagine: string;

  // ✅ PLASTICHE (A4)
  plasticheLabel?: string;
  plasticheExtraEuro?: number;

  numeroCopie: number;
  numeroPDF: number;
  prezzo: string;

  onConfirmOrder: (payment: PaymentPayload) => Promise<{ id: string; totaleFinale: number } | undefined>;
  disabled?: boolean;
  submitted?: boolean;
  loading?: boolean;
  uploadProgress?: UploadProgressState | null;

  ivaRate?: number;
  transportFeeEuro?: number;
  paypalPercent?: number;
  paypalFixed?: number;

  authToken?: string;
  csrfToken?: string;

  /**
   * ✅ Nuovo:
   * - desktopStickiness=true  -> wrapper sticky su desktop
   * - desktopStickiness=false -> segue lo scroll su desktop (richiesto)
   */
  desktopStickiness?: boolean;
  stickyTopPx?: number;
};

type PayPalApproveData = { orderID: string };

const PAYPAL_CLIENT_ID = import.meta.env.REACT_APP_PAYPAL_CLIENT_ID as string;

function parseEuro(prezzo: string): number {
  const normalized = prezzo.replace(",", ".").replace(/[^\d.]/g, "");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const euro = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

declare global {
  interface Window {
    paypal?: any;
  }
}

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
  weekdays: number[];
  timeRanges: TimeRange[];
  slotsAhead: number;
  timezone?: string;
  blacklistDates?: string[];
  blacklistRanges?: BlacklistRange[];
  minLeadDays?: number;
};

/** ======= Config promo ======= */
type BasePromo = {
  enabled: boolean;
  name?: string;
  description?: string;
  percent: number;
  minPdf?: number;
  startsAt?: string;
  endsAt?: string;
};

type StudentPromo = BasePromo & {
  targetCourse?: string;
  targetEnrollmentYear?: number | null;
};

type PromoConfig = {
  generalPromo: BasePromo;
  studentPromo: StudentPromo;
};

type UserProfilePromo = {
  course: string;
  academicYear: number | null;
};

const DEFAULT_GENERAL_PROMO: BasePromo = {
  enabled: false,
  name: "Promo generale",
  description: "",
  percent: 0,
  minPdf: 1,
  startsAt: "",
  endsAt: "",
};

const DEFAULT_STUDENT_PROMO: StudentPromo = {
  enabled: false,
  name: "Promo facoltà/corso",
  description: "",
  percent: 0,
  minPdf: 1,
  targetCourse: "",
  targetEnrollmentYear: null,
  startsAt: "",
  endsAt: "",
};

const DEFAULT_PROMO_CONFIG: PromoConfig = {
  generalPromo: DEFAULT_GENERAL_PROMO,
  studentPromo: DEFAULT_STUDENT_PROMO,
};

/** ======= Utility date ======= */
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const DAY_FULL_IT: Record<Weekday, string> = {
  1: "Lunedì",
  2: "Martedì",
  3: "Mercoledì",
  4: "Giovedì",
  5: "Venerdì",
  6: "Sabato",
  7: "Domenica",
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function itShortMonth(d: Date): string {
  return d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
}

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

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${y}-${m}-${dd}`;
}

function weekdayToJs(weekday: Weekday): number {
  return weekday === 7 ? 0 : weekday;
}

const normalizeText = (value?: string | null) => (value || "").trim().toLowerCase();

function isBasePromoActiveToday(promo: BasePromo, numeroPDF: number): boolean {
  if (!promo.enabled) return false;
  if (numeroPDF < (promo.minPdf ?? 1)) return false;
  if (!Number.isFinite(promo.percent) || promo.percent <= 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYmd = ymdLocal(today);

  if (promo.startsAt && todayYmd < promo.startsAt) return false;
  if (promo.endsAt && todayYmd > promo.endsAt) return false;

  return true;
}

function isStudentPromoActiveToday(
  promo: StudentPromo,
  numeroPDF: number,
  userProfile: UserProfilePromo | null
): boolean {
  if (!isBasePromoActiveToday(promo, numeroPDF)) return false;
  if (!userProfile) return false;

  const userCourse = normalizeText(userProfile.course);
  const targetCourse = normalizeText(promo.targetCourse);

  if (!userCourse || !targetCourse) return false;

  const courseMatches =
    userCourse === targetCourse ||
    userCourse.includes(targetCourse) ||
    targetCourse.includes(userCourse);

  if (!courseMatches) return false;

  return Number(userProfile.academicYear) === Number(promo.targetEnrollmentYear);
}

function normalizeBasePromo(data: Partial<BasePromo> | undefined, fallback: BasePromo): BasePromo {
  return {
    enabled: typeof data?.enabled === "boolean" ? data.enabled : fallback.enabled,
    name: typeof data?.name === "string" ? data.name : fallback.name,
    description:
      typeof data?.description === "string" ? data.description : fallback.description,
    percent: typeof data?.percent === "number" ? data.percent : fallback.percent,
    minPdf: typeof data?.minPdf === "number" ? data.minPdf : fallback.minPdf,
    startsAt: typeof data?.startsAt === "string" ? data.startsAt : fallback.startsAt,
    endsAt: typeof data?.endsAt === "string" ? data.endsAt : fallback.endsAt,
  };
}

function normalizeStudentPromo(
  data: Partial<StudentPromo> | undefined,
  fallback: StudentPromo
): StudentPromo {
  return {
    ...normalizeBasePromo(data, fallback),
    targetCourse:
      typeof data?.targetCourse === "string" ? data.targetCourse : fallback.targetCourse,
    targetEnrollmentYear:
      typeof data?.targetEnrollmentYear === "number"
        ? data.targetEnrollmentYear
        : fallback.targetEnrollmentYear,
  };
}

function buildSlotsFromConfig(cfg: DeliveryConfig): DeliverySlot[] {
  const weekdays = (Array.isArray(cfg.weekdays) && cfg.weekdays.length
    ? cfg.weekdays
    : [1, 3, 5]
  ).map((w) => Math.min(7, Math.max(1, Number(w)))) as Weekday[];

  const timeRanges =
    Array.isArray(cfg.timeRanges) && cfg.timeRanges.length
      ? cfg.timeRanges
      : [{ start: "12:00", end: "13:00" }];

  const slotsAhead = Math.max(1, Number(cfg.slotsAhead) || 6);
  const minLeadDays = Math.max(1, Number(cfg.minLeadDays) || 1);

  const blacklistDates = new Set(cfg.blacklistDates || []);
  const blacklistRanges = (cfg.blacklistRanges || []).slice();

  const isBlacklisted = (d: Date) => {
    const ymd = ymdLocal(d);
    if (blacklistDates.has(ymd)) return true;
    return blacklistRanges.some((r) => r.from <= ymd && ymd <= r.to);
  };

  const slots: DeliverySlot[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const earliest = new Date(now);
  earliest.setDate(now.getDate() + minLeadDays);

  const horizonDays = 120;

  for (let i = 0; i < horizonDays && slots.length < slotsAhead; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);

    if (day < earliest) continue;

    const jsDay = day.getDay();
    const weekday: Weekday = (jsDay === 0 ? 7 : (jsDay as 1 | 2 | 3 | 4 | 5 | 6)) as Weekday;

    if (!weekdays.some((w) => weekdayToJs(w) === jsDay)) continue;
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

      slots.push({
        id: `${weekday}-${ymdLocal(day)}-${pad2(startH)}${pad2(startM)}`,
        weekday,
        dateISO,
        dayLabel: label,
        timeRange: `${pad2(startH)}:${pad2(startM)}–${pad2(endH)}:${pad2(endM)}`,
      });

      if (slots.length >= slotsAhead) break;
    }
  }

  return slots.slice(0, slotsAhead);
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} style={{ textAlign: "right" }}>
        {value}
      </Text>
    </Group>
  );
}

/** Stessa riga label/valore di KeyValueRow, ma leggibile sulla card scura del riepilogo. */
function KeyValueRowDark({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Group justify="space-between" align="baseline" wrap="nowrap">
      <Text size="sm" style={{ color: "rgba(255,255,255,.55)" }}>
        {label}
      </Text>
      <Text size="sm" fw={600} style={{ textAlign: "right", color: "#fff" }}>
        {value}
      </Text>
    </Group>
  );
}

const RiepilogoOrdine: React.FC<RiepilogoProps> = ({
  tipo = "A4",

  inchiostro,
  pagina,
  layout,
  rilegatura,
  rilegaturaUnica,
  intervalloPagine,

  plasticheLabel,
  plasticheExtraEuro,

  numeroCopie,
  numeroPDF,
  prezzo,
  onConfirmOrder,
  disabled = false,
  submitted = false,
  loading = false,
  uploadProgress = null,

  ivaRate = 0.22,
  transportFeeEuro = 1,
  paypalPercent = 0.0349,
  paypalFixed = 0.35,

  authToken,
  csrfToken,

  // ✅ default: su desktop NON sticky (segue scroll)
  desktopStickiness = true,
  stickyTopPx = 24,
}) => {
  // ✅ default cash
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "paypal">("cash");

  const [paypalReady, setPaypalReady] = useState(false);
  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);

  const [fees, setFees] = useState<Fees>({
    ivaRate,
    transportFeeEuro,
    paypalPercent,
    paypalFixed,
  });

  const [deliveryCfg, setDeliveryCfg] = useState<DeliveryConfig>({
    weekdays: [1, 3, 5],
    timeRanges: [{ start: "12:00", end: "13:00" }],
    slotsAhead: 6,
    timezone: "Europe/Rome",
    blacklistDates: [],
    blacklistRanges: [],
    minLeadDays: 1,
  });

  useEffect(() => {
    let alive = true;
    api.get<Partial<DeliveryConfig>>("/api/public/delivery-config", { auth: false })
      .then((d) => {
        if (!alive) return;
        setDeliveryCfg({
          weekdays: Array.isArray(d.weekdays) && d.weekdays.length ? (d.weekdays as number[]) : [1, 3, 5],
          timeRanges:
            Array.isArray(d.timeRanges) && d.timeRanges.length
              ? (d.timeRanges as TimeRange[])
              : [{ start: "12:00", end: "13:00" }],
          slotsAhead: typeof d.slotsAhead === "number" ? d.slotsAhead : 6,
          timezone: typeof d.timezone === "string" && d.timezone ? d.timezone : "Europe/Rome",
          blacklistDates: Array.isArray(d.blacklistDates) ? (d.blacklistDates as string[]) : [],
          blacklistRanges: Array.isArray(d.blacklistRanges) ? (d.blacklistRanges as BlacklistRange[]) : [],
          minLeadDays: typeof d.minLeadDays === "number" ? d.minLeadDays : 1,
        });
      })
      .catch((err) => console.error("Errore lettura config consegne:", err));
    return () => { alive = false; };
  }, []);

  const [promoCfg, setPromoCfg] = useState<PromoConfig>(DEFAULT_PROMO_CONFIG);
  const [userProfilePromo, setUserProfilePromo] = useState<UserProfilePromo | null>(null);

  useEffect(() => {
    let alive = true;
    api.get<Partial<PromoConfig>>("/api/public/promo-config", { auth: false })
      .then((d) => {
        if (!alive) return;
        setPromoCfg({
          generalPromo: normalizeBasePromo(d.generalPromo, DEFAULT_GENERAL_PROMO),
          studentPromo: normalizeStudentPromo(d.studentPromo, DEFAULT_STUDENT_PROMO),
        });
      })
      .catch((err) => console.error("Errore lettura promo:", err));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged((user) => {
      setUserProfilePromo(
        user ? { course: user.corsoLaurea || "", academicYear: user.annoAccademico ? Number(user.annoAccademico) : null } : null
      );
    });
    return () => unsub();
  }, []);

  const deliverySlots = useMemo(() => buildSlotsFromConfig(deliveryCfg), [deliveryCfg]);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const selectedSlot = useMemo(
    () => deliverySlots.find((s) => s.id === selectedSlotId) || null,
    [deliverySlots, selectedSlotId]
  );

  // ✅ obbligatorio: Sì/No (slot obbligatorio solo se Sì)
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  const canProceedPay = useMemo(() => {
    return isStudent !== null && (isStudent === false || (isStudent === true && !!selectedSlot));
  }, [isStudent, selectedSlot]);

  useEffect(() => {
    let alive = true;
    api.get<Partial<Fees>>("/api/public/fees-config", { auth: false })
      .then((d) => {
        if (!alive) return;
        setFees({
          ivaRate: typeof d.ivaRate === "number" ? d.ivaRate : ivaRate,
          transportFeeEuro: typeof d.transportFeeEuro === "number" ? d.transportFeeEuro : transportFeeEuro,
          paypalPercent: typeof d.paypalPercent === "number" ? d.paypalPercent : paypalPercent,
          paypalFixed: typeof d.paypalFixed === "number" ? d.paypalFixed : paypalFixed,
        });
      })
      .catch(() => setFees({ ivaRate, transportFeeEuro, paypalPercent, paypalFixed }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const baseLordo = round2(parseEuro(prezzo));

    const generalPromo = promoCfg.generalPromo;
    const studentPromo = promoCfg.studentPromo;

    const generalPromoAttiva = isBasePromoActiveToday(generalPromo, numeroPDF);
    const studentPromoAttiva = isStudentPromoActiveToday(
      studentPromo,
      numeroPDF,
      userProfilePromo
    );

    const scontoGeneralePercent = generalPromoAttiva ? generalPromo.percent : 0;
    const scontoGenerale =
      scontoGeneralePercent > 0 ? round2(baseLordo * (scontoGeneralePercent / 100)) : 0;

    const baseDopoScontoGenerale = round2(baseLordo - scontoGenerale);

    const scontoStudentiPercent = studentPromoAttiva ? studentPromo.percent : 0;
    const scontoStudenti =
      scontoStudentiPercent > 0
        ? round2(baseDopoScontoGenerale * (scontoStudentiPercent / 100))
        : 0;

    const base = round2(baseDopoScontoGenerale - scontoStudenti);

    const iva = round2(base * fees.ivaRate);

    // ✅ trasporto solo se consegna = Sì
    const trasporto = isStudent === true ? round2(fees.transportFeeEuro) : 0;

    const subTotale = round2(base + iva + trasporto);

    const feePP =
      paymentMethod === "paypal"
        ? round2(subTotale * fees.paypalPercent + fees.paypalFixed)
        : 0;

    const totaleContanti = subTotale;
    const totalePayPal = round2(subTotale + feePP);
    const totaleDaAddebitare = paymentMethod === "paypal" ? totalePayPal : totaleContanti;

    return {
      baseLordo,
      base,

      generalPromoAttiva,
      studentPromoAttiva,

      scontoGenerale,
      scontoGeneralePercent,

      scontoStudenti,
      scontoStudentiPercent,

      iva,
      trasporto,
      subTotale,
      feePP,
      totaleContanti,
      totalePayPal,
      totaleDaAddebitare,
    };
  }, [prezzo, fees, paymentMethod, promoCfg, numeroPDF, isStudent, userProfilePromo]);

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
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      PAYPAL_CLIENT_ID
    )}&currency=EUR&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => console.error("Impossibile caricare PayPal SDK");
    document.body.appendChild(script);
  }, [paymentMethod]);

  const localOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (paymentMethod !== "paypal" || !paypalButtonsContainerRef.current || submitted) return;

    paypalButtonsContainerRef.current.innerHTML = "";

    // ✅ Abilitazione PayPal: obbligatorio Sì/No; slot obbligatorio solo se Sì
    if (isStudent === null) return;
    if (isStudent === true && !selectedSlot) return;
    if (!paypalReady) return;

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },

      createOrder: async () => {
        const prepared = await onConfirmOrder({
          method: "PAYPAL", confirmed: false, delivery: selectedSlot || undefined,
        });
        if (!prepared) throw new Error("Completa i dati dell'ordine prima di pagare");
        localOrderIdRef.current = prepared.id;
        const data = await api.post<{ orderId: string }>("/api/paypal/create-order", {
          localOrderId: prepared.id,
        });
        return data.orderId;
      },

      onApprove: async (data: PayPalApproveData) => {
        try {
          const cap = await api.post<{
            status: string;
            orderId?: string;
            captureId?: string;
            payerEmail?: string;
            amount?: string | number;
          }>("/api/paypal/capture-order", { localOrderId: localOrderIdRef.current, orderId: data.orderID });

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
                scontoGenerale: totals.scontoGenerale,
                scontoStudenti: totals.scontoStudenti,
                subtotaleLordo: totals.baseLordo,
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
        } catch {
          alert("Si è verificato un errore durante il pagamento.");
        }
      },

      onError: () => {
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsContainerRef.current);

    return () => {
      try {
        instance.close();
      } catch {
        /* noop */
      }
    };
  }, [
    paymentMethod,
    paypalReady,
    submitted,
    totals,
    onConfirmOrder,
    selectedSlot,
    isStudent,
  ]);

  const handleConfirmOrderCash = async () => {
    if (isStudent === null) {
      alert("Seleziona “Sì” oppure “No”.");
      return;
    }

    if (isStudent === true && !selectedSlot) {
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
        scontoGenerale: totals.scontoGenerale,
        scontoStudenti: totals.scontoStudenti,
        subtotaleLordo: totals.baseLordo,
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
  };

  const plasticheLabelClean = (plasticheLabel ?? "").trim();
  const showPlastiche = tipo === "A4" && plasticheLabelClean.length > 0;

  // ✅ wrapper: sticky SOLO se desktopStickiness=true
  const wrapperStyle = {
    "--pv-order-top": `${stickyTopPx}px`,
  } as React.CSSProperties;

  return (
    <aside
      className="pv-order"
      data-sticky={desktopStickiness ? "true" : "false"}
      style={wrapperStyle}
      aria-label={`Riepilogo ordine ${tipo}`}
      aria-busy={loading}
    >
      <header className="pv-order-header">
        <div>
          <span className="pv-order-eyebrow">LA TUA STAMPA</span>
          <h2>Riepilogo ordine</h2>
          <p>Controlla le tue scelte e completa l’ordine.</p>
        </div>

        <span className="pv-order-format">{tipo}</span>
      </header>

      <div
        className="pv-order-body"
        tabIndex={0}
        role="region"
        aria-label="Dettagli e opzioni dell’ordine"
      >
        <div className="pv-order-stats">
          <div>
            <strong>{numeroPDF}</strong>
            <span>PDF caricati</span>
          </div>

          <div>
            <strong>{numeroCopie}</strong>
            <span>Copie</span>
          </div>

          <div>
            <strong>{tipo}</strong>
            <span>Formato</span>
          </div>
        </div>

        <details className="pv-order-details" open>
          <summary>
            <span>Configurazione di stampa</span>
            <span className="pv-order-chevron" aria-hidden="true">
              ⌄
            </span>
          </summary>

          <dl className="pv-order-list">
            <div>
              <dt>Colore</dt>
              <dd>{inchiostro}</dd>
            </div>

            <div>
              <dt>Layout</dt>
              <dd>{layout}</dd>
            </div>

            <div>
              <dt>Gestione pagina</dt>
              <dd>{pagina}</dd>
            </div>

            <div>
              <dt>Rilegatura</dt>
              <dd>{rilegatura}</dd>
            </div>

            <div>
              <dt>Rilegatura unica</dt>
              <dd>{rilegaturaUnica}</dd>
            </div>

            {showPlastiche && (
              <div>
                <dt>Copertina</dt>
                <dd>{plasticheLabelClean}</dd>
              </div>
            )}

            <div>
              <dt>Pagine</dt>
              <dd>{intervalloPagine}</dd>
            </div>
          </dl>
        </details>

        {(totals.generalPromoAttiva || totals.studentPromoAttiva) && (
          <div className="pv-order-promos">
            {totals.generalPromoAttiva && (
              <div className="pv-order-promo">
                <IconCheck size={17} aria-hidden="true" />

                <div>
                  <strong>
                    {promoCfg.generalPromo.name || "Promo generale"}
                    {" "}−{totals.scontoGeneralePercent.toFixed(0)}%
                  </strong>

                  {promoCfg.generalPromo.description && (
                    <p>{promoCfg.generalPromo.description}</p>
                  )}
                </div>
              </div>
            )}

            {totals.studentPromoAttiva && (
              <div className="pv-order-promo">
                <IconCheck size={17} aria-hidden="true" />

                <div>
                  <strong>
                    {promoCfg.studentPromo.name || "Promo studenti"}
                    {" "}−{totals.scontoStudentiPercent.toFixed(0)}%
                  </strong>

                  {promoCfg.studentPromo.description && (
                    <p>{promoCfg.studentPromo.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <section className="pv-order-section">
          <h3>
            <span className="pv-order-step">01</span>
            Ritiro e consegna
          </h3>

          <ConsegnaSlotPicker
            slots={deliverySlots}
            selectedId={selectedSlotId}
            onChange={setSelectedSlotId}
            onStudentChange={setIsStudent}
            disabled={loading || submitted}
            hint="Seleziona uno slot per procedere al pagamento."
          />
        </section>

        <section className="pv-order-section">
          <h3>
            <span className="pv-order-step">02</span>
            Metodo di pagamento
          </h3>

          <fieldset
            className="pv-order-payment"
            disabled={loading || submitted}
          >
            <legend className="pv-order-sr-only">
              Metodo di pagamento
            </legend>

            <MetodoPagamentoPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </fieldset>
        </section>

        <section className="pv-order-section">
          <h3>Dettaglio importi</h3>

          <dl className="pv-order-list pv-order-prices">
            <div>
              <dt>Stampa e finiture</dt>
              <dd>{euro(totals.baseLordo)} €</dd>
            </div>

            {totals.scontoGenerale > 0 && (
              <div className="pv-order-discount">
                <dt>{promoCfg.generalPromo.name || "Promo generale"}</dt>
                <dd>−{euro(totals.scontoGenerale)} €</dd>
              </div>
            )}

            {totals.scontoStudenti > 0 && (
              <div className="pv-order-discount">
                <dt>{promoCfg.studentPromo.name || "Promo studenti"}</dt>
                <dd>−{euro(totals.scontoStudenti)} €</dd>
              </div>
            )}

            {(totals.scontoGenerale > 0 || totals.scontoStudenti > 0) && (
              <div>
                <dt>Imponibile scontato</dt>
                <dd>{euro(totals.base)} €</dd>
              </div>
            )}

            {paymentMethod === "paypal" && (
              <div>
                <dt>
                  Commissione PayPal
                  <small>
                    {(fees.paypalPercent * 100).toFixed(2)}%
                    {" + "}
                    {euro(fees.paypalFixed)} €
                  </small>
                </dt>

                <dd>{euro(totals.feePP)} €</dd>
              </div>
            )}
          </dl>
        </section>

        {paymentMethod === "paypal" && !submitted && (
          <section className="pv-order-paypal">
            <p>
              Completa il pagamento di{" "}
              <strong>{euro(totals.totaleDaAddebitare)} €</strong>
              {" "}con PayPal.
            </p>

            {isStudent === null ? (
              <Alert
                color="gold"
                variant="light"
                icon={<IconInfoCircle size={18} />}
              >
                Seleziona “Sì” oppure “No” nella sezione consegna.
              </Alert>
            ) : isStudent === true && !selectedSlot ? (
              <Alert
                color="gold"
                variant="light"
                icon={<IconInfoCircle size={18} />}
              >
                Seleziona uno slot di consegna per abilitare PayPal.
              </Alert>
            ) : (
              <Box>
                {!paypalReady && (
                  <Group gap="sm">
                    <Loader size="sm" color="gold" />
                    <Text size="sm" c="dimmed">
                      Caricamento PayPal…
                    </Text>
                  </Group>
                )}

                <Box ref={paypalButtonsContainerRef} mt="sm" />
              </Box>
            )}
          </section>
        )}
      </div>

      <footer className="pv-order-footer">
        <div className="pv-order-total">
          <div>
            <span>Totale ordine</span>
            <small>IVA inclusa</small>
          </div>

          <strong aria-live="polite" aria-atomic="true">
            {euro(totals.totaleDaAddebitare)}
            <span> €</span>
          </strong>
        </div>

        {!loading && !submitted && paymentMethod === "cash" && (
          <>
            <button
              type="button"
              className="pv-order-confirm"
              onClick={handleConfirmOrderCash}
              disabled={disabled || !canProceedPay}
            >
              <span>Conferma ordine</span>
              <span aria-hidden="true">→</span>
            </button>

            <p className="pv-order-footnote">
              {numeroPDF === 0
                ? "Carica almeno un PDF per iniziare."
                : isStudent === null
                  ? "Completa la scelta nella sezione consegna."
                  : isStudent === true && !selectedSlot
                    ? "Scegli uno slot di consegna."
                    : disabled
                      ? "Completa le impostazioni dei PDF per continuare."
                      : "Pagamento in contanti."}
            </p>
          </>
        )}

        {!loading && !submitted && paymentMethod === "paypal" && (
          <p className="pv-order-footnote">
            Usa il pulsante PayPal nel riepilogo per completare il pagamento.
          </p>
        )}

        {loading && (
          <UploadProgressBar uploadProgress={uploadProgress} />
        )}

        {submitted && (
          <div className="pv-order-success" role="status">
            <IconCheck size={20} aria-hidden="true" />
            Ordine inviato con successo!
          </div>
        )}
      </footer>
    </aside>
  );
};

export default React.memo(RiepilogoOrdine);