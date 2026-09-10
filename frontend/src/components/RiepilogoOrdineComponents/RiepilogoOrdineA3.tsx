// ✅ src/components/RiepilogoOrdineComponents/RiepilogoOrdineA3.tsx
// Aggiornato per usare:
// - ConsegnaSlotPicker ✅ (con scelta Studente Sì/No obbligatoria; slot obbligatorio solo se Sì)
// - MetodoPagamentoPicker ✅
// - Promo generale + promo facoltà/corso ✅
// Senza rimuovere nulla: il vecchio UI resta ma viene "nascosto" (render condizionale)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "../../backend/auth";
import { api } from "../../backend/apiClient";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";

import ConsegnaSlotPicker from "../CardComponents/ConsegnaSlotPicker";
import MetodoPagamentoPicker from "../CardComponents/MetodoPagamentoPicker";
import type { PaymentMethodUI } from "../CardComponents/MetodoPagamentoPicker";

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

    // ✅ opzionali: non rompono la logica esistente
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

type RiepilogoA3Props = {
  inchiostro: string;
  pagina: string;
  layout: string;
  grammatura: string;
  plastificazione: string;
  numeroCopie: number;
  numeroPDF: number;
  numeroPagine: number;
  prezzo: string;
  onConfirmOrder: (payment: PaymentPayload) => Promise<{ id: string; totaleFinale: number } | undefined>;
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

type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type DeliverySlot = {
  id: string;
  weekday: Weekday;
  dateISO: string;
  dayLabel: string;
  timeRange: string;
};

/** ======= Config promo nuova struttura ======= */
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
  targetEnrollmentYear?: number | null; // in realtà ora è anno di corso: 1,2,3...
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
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

  const singles = new Set(cfg.blacklistDates || []);
  const ranges = (cfg.blacklistRanges || []).slice();

  const isBlacklisted = (d: Date) => {
    const ymd = ymdLocal(d);
    if (singles.has(ymd)) return true;
    return ranges.some((r) => r.from <= ymd && ymd <= r.to);
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
      const id = `${weekday}-${ymdLocal(day)}-${pad2(startH)}${pad2(startM)}`;

      slots.push({
        id,
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

const SLOT_START = { hour: 12, minute: 0 };
const SLOT_END = { hour: 13, minute: 0 };

function buildUpcomingSlotsStatic(n: number, minLeadDays: number = 1): DeliverySlot[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const earliest = new Date(now);
  earliest.setDate(now.getDate() + Math.max(1, minLeadDays));

  const slots: DeliverySlot[] = [];
  const horizonDays = 120;

  for (let i = 0; i < horizonDays && slots.length < n; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);

    if (day < earliest) continue;

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
      timeRange: `${pad2(SLOT_START.hour)}:${pad2(SLOT_START.minute)}–${pad2(
        SLOT_END.hour
      )}:${pad2(SLOT_END.minute)}`,
    });
  }

  return slots.slice(0, n);
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

const RiepilogoOrdineA3: React.FC<RiepilogoA3Props> = ({
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
}) => {
  const [progress, setProgress] = useState(0);

  // ✅ adesso usa il type del picker
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodUI>(null);

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

  const deliverySlotsFromCfg = useMemo(() => buildSlotsFromConfig(deliveryCfg), [deliveryCfg]);

  const deliverySlots = useMemo(
    () =>
      deliverySlotsFromCfg.length
        ? deliverySlotsFromCfg
        : buildUpcomingSlotsStatic(6, deliveryCfg?.minLeadDays ?? 1),
    [deliverySlotsFromCfg, deliveryCfg?.minLeadDays]
  );

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
      try {
        instance.close();
      } catch {
        /* no-op */
      }
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
    totals.scontoGenerale,
    totals.scontoStudenti,
    totals.baseLordo,
    onConfirmOrder,
    selectedSlot,
    isStudent,
  ]);

  const handleConfirmOrderCash = async () => {
    // ✅ obbligatorio Sì/No
    if (isStudent === null) {
      alert("Seleziona “Sì” oppure “No”.");
      return;
    }

    // ✅ slot obbligatorio solo se Sì
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

  useEffect(() => {
    if (!loading) return;

    let current = 0;

    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 10) + 5;
      if (current >= 90) clearInterval(interval);
      else setProgress(current);
    }, 300);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (submitted) setProgress(100);
  }, [submitted]);

  const deliveryTitleSuffix =
    deliveryCfg.timeRanges?.length === 1
      ? ` (${deliveryCfg.timeRanges[0].start}–${deliveryCfg.timeRanges[0].end})`
      : "";

  return (
    <Card
      radius={24}
      p="lg"
      style={{
        background: "linear-gradient(165deg, #161311 0%, #0c1119 60%)",
        border: "1px solid rgba(212,175,106,.25)",
        boxShadow: "0 30px 60px -24px rgba(0,0,0,.7)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3} size="h4" tt="uppercase" style={{ color: "#fff", letterSpacing: ".02em", fontFamily: "'Oswald', sans-serif" }}>
            Riepilogo ordine A3
          </Title>

          {(totals.generalPromoAttiva || totals.studentPromoAttiva) && (
            <Group gap="xs">
              {totals.generalPromoAttiva && (
                <Badge variant="light" color="gold">
                  Generale -{totals.scontoGeneralePercent.toFixed(0)}%
                </Badge>
              )}

              {totals.studentPromoAttiva && (
                <Badge variant="light" color="green">
                  Studenti -{totals.scontoStudentiPercent.toFixed(0)}%
                </Badge>
              )}
            </Group>
          )}
        </Group>

        {totals.generalPromoAttiva && (
          <Alert icon={<IconInfoCircle size={18} />} color="gold" variant="light">
            {promoCfg.generalPromo.description
              ? promoCfg.generalPromo.description
              : `${promoCfg.generalPromo.name ?? "Promo generale"}: -${totals.scontoGeneralePercent.toFixed(
                0
              )}% sulle stampe A3`}
          </Alert>
        )}

        {totals.studentPromoAttiva && (
          <Alert icon={<IconInfoCircle size={18} />} color="green" variant="light">
            {promoCfg.studentPromo.description
              ? promoCfg.studentPromo.description
              : `${promoCfg.studentPromo.name ?? "Promo studenti"}: -${totals.scontoStudentiPercent.toFixed(
                0
              )}% aggiuntivo sulle stampe A3`}
          </Alert>
        )}

        <Stack gap={11} pb="sm" style={{ borderBottom: "1px solid rgba(255,255,255,.10)" }}>
          <KeyValueRowDark label="Numero PDF" value={numeroPDF} />
          <KeyValueRowDark label="Numero pagine totali" value={numeroPagine} />
          <KeyValueRowDark label="Grammatura" value={grammatura} />
          <KeyValueRowDark label="Colore" value={inchiostro} />
          <KeyValueRowDark label="Gestione pagina" value={pagina} />
          <KeyValueRowDark label="Layout" value={layout} />
          <KeyValueRowDark label="Plastificazione" value={plastificazione} />
          <KeyValueRowDark label="Numero copie" value={numeroCopie} />
        </Stack>

        {/* ✅ NUOVO: Picker consegna */}
        <ConsegnaSlotPicker
          slots={deliverySlots as DeliverySlot[]}
          selectedId={selectedSlotId}
          onChange={setSelectedSlotId}
          onStudentChange={setIsStudent}
          hint="Seleziona uno slot per procedere al pagamento."
        />

        {/* ✅ VECCHIO: Card consegna (non cancellata) - la teniamo ma la nascondiamo */}
        {false && (
          <Card withBorder radius="md" p="md">
            <Stack gap="xs">
              <Text fw={800}>Consegna{deliveryTitleSuffix}</Text>

              {!selectedSlot && (
                <Text size="sm" c="dimmed">
                  Verrai contattato/a tramite WhatsApp per decidere il luogo della consegna.
                </Text>
              )}

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {deliverySlots.map((slot) => {
                  const selected = slot.id === selectedSlotId;
                  return (
                    <Button
                      key={slot.id}
                      variant={selected ? "light" : "default"}
                      color={selected ? "yellow" : "gray"}
                      onClick={() => setSelectedSlotId(slot.id)}
                      styles={{ inner: { justifyContent: "space-between" } }}
                    >
                      <Box>
                        <Text fw={800} size="sm">
                          {slot.dayLabel}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {slot.timeRange}
                        </Text>
                      </Box>
                      {selected && (
                        <ThemeIcon variant="light" color="yellow" radius="xl" size="sm">
                          <IconCheck size={14} />
                        </ThemeIcon>
                      )}
                    </Button>
                  );
                })}
              </SimpleGrid>

              {!selectedSlot && (
                <Text size="sm" c="dimmed">
                  Seleziona uno slot per procedere al pagamento.
                </Text>
              )}
            </Stack>
          </Card>
        )}

        <Stack gap={11} py="sm" style={{ borderTop: "1px solid rgba(255,255,255,.10)", borderBottom: "1px solid rgba(255,255,255,.10)" }}>
          <Group justify="space-between">
            <Text size="xs" fw={700} tt="uppercase" style={{ color: "rgba(255,255,255,.4)", letterSpacing: ".06em" }}>
              Metodo
            </Text>
            <Badge variant="light" color={paymentMethod === "paypal" ? "blue" : "gray"}>
              {paymentMethod === "paypal" ? "PayPal" : paymentMethod === "cash" ? "Contanti" : "—"}
            </Badge>
          </Group>

          {(totals.scontoGenerale > 0 || totals.scontoStudenti > 0) && (
            <KeyValueRowDark label="Subtotale" value={`${euro(totals.baseLordo)} €`} />
          )}

          {totals.scontoGenerale > 0 && (
            <Group justify="space-between" align="baseline">
              <Text size="sm" c="green">
                {promoCfg.generalPromo.name || "Promo generale"} (-
                {totals.scontoGeneralePercent.toFixed(0)}%)
              </Text>
              <Text size="sm" c="green" fw={700}>
                - {euro(totals.scontoGenerale)} €
              </Text>
            </Group>
          )}

          {totals.scontoStudenti > 0 && (
            <Group justify="space-between" align="baseline">
              <Text size="sm" c="green">
                {promoCfg.studentPromo.name || "Promo studenti"} (-
                {totals.scontoStudentiPercent.toFixed(0)}%)
              </Text>
              <Text size="sm" c="green" fw={700}>
                - {euro(totals.scontoStudenti)} €
              </Text>
            </Group>
          )}

          <KeyValueRowDark label="Imponibile" value={`${euro(totals.base)} €`} />
          <KeyValueRowDark
            label={`IVA (${(fees.ivaRate * 100).toFixed(0)}%)`}
            value={`${euro(totals.iva)} €`}
          />
          <KeyValueRowDark label="Trasporto" value={`${euro(totals.trasporto)} €`} />

          {paymentMethod === "paypal" && (
            <KeyValueRowDark
              label={`Fee PayPal (${(fees.paypalPercent * 100).toFixed(2)}% + ${euro(
                fees.paypalFixed
              )} €)`}
              value={`${euro(totals.feePP)} €`}
            />
          )}

          <Group justify="space-between" align="baseline" pt={4}>
            <Text fw={700} tt="uppercase" style={{ color: "#fff", fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: ".02em" }}>
              Totale finale
            </Text>
            <Text
              fw={700}
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 30,
                background: "linear-gradient(180deg,#f2c94c,#c9962f)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {euro(totals.totaleDaAddebitare)} €
            </Text>
          </Group>
        </Stack>

        {/* ✅ NUOVO: Picker metodo pagamento */}
        <MetodoPagamentoPicker
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v)}
          hint="Scegli come preferisci pagare"
        />

        {/* ✅ VECCHIO: 2 bottoni (non cancellati) - li teniamo ma li nascondiamo */}
        {false && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Button
              variant={paymentMethod === "cash" ? "light" : "default"}
              onClick={() => setPaymentMethod("cash")}
            >
              💵 Contanti
              <Text component="span" c="dimmed" size="xs" ml="xs">
                Paga alla consegna
              </Text>
            </Button>

            <Button
              variant={paymentMethod === "paypal" ? "light" : "default"}
              onClick={() => setPaymentMethod("paypal")}
            >
              🟦 PayPal
              <Text component="span" c="dimmed" size="xs" ml="xs">
                Paga online
              </Text>
            </Button>
          </SimpleGrid>
        )}

        {paymentMethod === "paypal" && (
          <Card withBorder radius="md" p="md">
            <Stack gap="xs">
              <Text size="sm" c="dimmed">
                Completa il pagamento di <strong>{euro(totals.totaleDaAddebitare)} €</strong>{" "}
                con PayPal. Al termine l’ordine partirà automaticamente.
              </Text>

              {isStudent === null ? (
                <Alert color="gold" variant="light" icon={<IconInfoCircle size={18} />}>
                  Seleziona “Sì” oppure “No” per abilitare il pagamento.
                </Alert>
              ) : isStudent === true && !selectedSlot ? (
                <Alert color="gold" variant="light" icon={<IconInfoCircle size={18} />}>
                  Seleziona prima uno slot di consegna per abilitare il pagamento PayPal.
                </Alert>
              ) : (
                <Box>
                  {!paypalReady && (
                    <Group gap="sm">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">
                        Caricamento PayPal…
                      </Text>
                    </Group>
                  )}
                  <Box ref={paypalButtonsContainerRef} mt="sm" />
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {!loading && !submitted && paymentMethod === "cash" && (
          <Button
            fullWidth
            size="md"
            radius="xl"
            onClick={handleConfirmOrderCash}
            disabled={disabled || loading || submitted || !canProceedPay}
            styles={{
              root: {
                background: "linear-gradient(180deg,#f2c94c,#c9962f)",
                boxShadow: "0 16px 32px -10px rgba(242,201,76,.5)",
                height: 50,
              },
              label: { color: "#10141c", fontWeight: 700, fontSize: 15 },
            }}
          >
            Conferma ordine
          </Button>
        )}

        {loading && (
          <Stack gap="xs">
            <Text size="sm" style={{ color: "rgba(255,255,255,.55)" }}>
              Invio in corso: attendere il completamento della barra.
            </Text>
            <Progress value={progress} color="gold" />
          </Stack>
        )}

        {submitted && (
          <Alert color="gold" variant="light" icon={<IconCheck size={18} />}>
            🎉 Ordine inviato con successo!
          </Alert>
        )}
      </Stack>
    </Card>
  );
};

export default React.memo(RiepilogoOrdineA3);