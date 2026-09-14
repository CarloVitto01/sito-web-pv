import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Group, Loader, Text } from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";

import { onAuthStateChanged } from "../../backend/auth";
import { api } from "../../backend/apiClient";

import ConsegnaSlotPicker, {
  type DeliverySlot,
  type Weekday,
} from "../CardComponents/ConsegnaSlotPicker";

import MetodoPagamentoPicker, {
  type PaymentMethodUI,
} from "../CardComponents/MetodoPagamentoPicker";

import UploadProgressBar, {
  type UploadProgressState,
} from "./UploadProgressBar";

/* -------------------------------------------------------------------------- */
/* Tipi                                                                       */
/* -------------------------------------------------------------------------- */

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
    scontoGenerale?: number;
    scontoStudenti?: number;
    subtotaleLordo?: number;
  };
  delivery?: {
    dateISO: string;
    dayLabel: string;
    timeRange: string;
    weekday: Weekday;
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

  onConfirmOrder: (
    payment: PaymentPayload
  ) => Promise<{ id: string; totaleFinale: number } | undefined>;

  disabled?: boolean;
  loading?: boolean;
  submitted?: boolean;
  uploadProgress?: UploadProgressState | null;

  ivaRate?: number;
  transportFeeEuro?: number;
  paypalPercent?: number;
  paypalFixed?: number;

  // Compatibilità con le chiamate esistenti.
  authToken?: string;
  csrfToken?: string;
};

type PayPalApproveData = {
  orderID: string;
};

type Fees = {
  ivaRate: number;
  transportFeeEuro: number;
  paypalPercent: number;
  paypalFixed: number;
};

type TimeRange = {
  start: string;
  end: string;
};

type BlacklistRange = {
  from: string;
  to: string;
};

type DeliveryConfig = {
  weekdays: number[];
  timeRanges: TimeRange[];
  slotsAhead: number;
  timezone?: string;
  blacklistDates?: string[];
  blacklistRanges?: BlacklistRange[];
  minLeadDays?: number;
};

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

declare global {
  interface Window {
    paypal?: any;
  }
}

/* -------------------------------------------------------------------------- */
/* Configurazioni predefinite                                                 */
/* -------------------------------------------------------------------------- */

const PAYPAL_CLIENT_ID = import.meta.env
  .REACT_APP_PAYPAL_CLIENT_ID as string;

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

const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  weekdays: [1, 3, 5],
  timeRanges: [{ start: "12:00", end: "13:00" }],
  slotsAhead: 6,
  timezone: "Europe/Rome",
  blacklistDates: [],
  blacklistRanges: [],
  minLeadDays: 1,
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

/* -------------------------------------------------------------------------- */
/* Formattazione                                                              */
/* -------------------------------------------------------------------------- */

function parseEuro(prezzo: string): number {
  const normalized = prezzo.replace(",", ".").replace(/[^\d.]/g, "");
  const value = parseFloat(normalized);
  return isNaN(value) ? 0 : value;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const euro = (value: number) =>
  value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function itShortMonth(date: Date): string {
  return date
    .toLocaleDateString("it-IT", { month: "short" })
    .replace(".", "");
}

function ymdLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function toTZDateISO(
  date: Date,
  hour: number,
  minute: number
): string {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);

  const offsetMinutes = -result.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);

  const offsetHours = pad2(Math.floor(absoluteOffset / 60));
  const offsetRemainder = pad2(absoluteOffset % 60);

  return (
    `${ymdLocal(result)}T` +
    `${pad2(result.getHours())}:` +
    `${pad2(result.getMinutes())}:` +
    `${pad2(result.getSeconds())}` +
    `${sign}${offsetHours}:${offsetRemainder}`
  );
}

function weekdayToJs(weekday: Weekday): number {
  return weekday === 7 ? 0 : weekday;
}

const normalizeText = (value?: string | null) =>
  (value || "").trim().toLowerCase();

/* -------------------------------------------------------------------------- */
/* Promozioni                                                                 */
/* -------------------------------------------------------------------------- */

function isBasePromoActiveToday(
  promo: BasePromo,
  numeroPDF: number
): boolean {
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

  return (
    Number(userProfile.academicYear) ===
    Number(promo.targetEnrollmentYear)
  );
}

function normalizeBasePromo(
  data: Partial<BasePromo> | undefined,
  fallback: BasePromo
): BasePromo {
  return {
    enabled:
      typeof data?.enabled === "boolean"
        ? data.enabled
        : fallback.enabled,
    name: typeof data?.name === "string" ? data.name : fallback.name,
    description:
      typeof data?.description === "string"
        ? data.description
        : fallback.description,
    percent:
      typeof data?.percent === "number"
        ? data.percent
        : fallback.percent,
    minPdf:
      typeof data?.minPdf === "number"
        ? data.minPdf
        : fallback.minPdf,
    startsAt:
      typeof data?.startsAt === "string"
        ? data.startsAt
        : fallback.startsAt,
    endsAt:
      typeof data?.endsAt === "string"
        ? data.endsAt
        : fallback.endsAt,
  };
}

function normalizeStudentPromo(
  data: Partial<StudentPromo> | undefined,
  fallback: StudentPromo
): StudentPromo {
  return {
    ...normalizeBasePromo(data, fallback),
    targetCourse:
      typeof data?.targetCourse === "string"
        ? data.targetCourse
        : fallback.targetCourse,
    targetEnrollmentYear:
      typeof data?.targetEnrollmentYear === "number"
        ? data.targetEnrollmentYear
        : fallback.targetEnrollmentYear,
  };
}

/* -------------------------------------------------------------------------- */
/* Slot di consegna                                                           */
/* -------------------------------------------------------------------------- */

function buildSlotsFromConfig(cfg: DeliveryConfig): DeliverySlot[] {
  const weekdays = (
    Array.isArray(cfg.weekdays) && cfg.weekdays.length
      ? cfg.weekdays
      : [1, 3, 5]
  ).map((value) =>
    Math.min(7, Math.max(1, Number(value)))
  ) as Weekday[];

  const timeRanges =
    Array.isArray(cfg.timeRanges) && cfg.timeRanges.length
      ? cfg.timeRanges
      : [{ start: "12:00", end: "13:00" }];

  const slotsAhead = Math.max(1, Number(cfg.slotsAhead) || 6);
  const minLeadDays = Math.max(1, Number(cfg.minLeadDays) || 1);

  const singles = new Set(cfg.blacklistDates || []);
  const ranges = (cfg.blacklistRanges || []).slice();

  const isBlacklisted = (date: Date): boolean => {
    const ymd = ymdLocal(date);
    if (singles.has(ymd)) return true;
    return ranges.some((range) => range.from <= ymd && ymd <= range.to);
  };

  const slots: DeliverySlot[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const earliest = new Date(now);
  earliest.setDate(now.getDate() + minLeadDays);

  for (let index = 0; index < 120 && slots.length < slotsAhead; index++) {
    const day = new Date(now);
    day.setDate(now.getDate() + index);

    if (day < earliest) continue;

    const jsDay = day.getDay();
    const weekday = (jsDay === 0 ? 7 : jsDay) as Weekday;

    if (!weekdays.some((value) => weekdayToJs(value) === jsDay)) {
      continue;
    }

    if (isBlacklisted(day)) continue;

    for (const timeRange of timeRanges) {
      const [sh, sm] = String(timeRange.start || "12:00")
        .split(":")
        .map(Number);

      const [eh, em] = String(timeRange.end || "13:00")
        .split(":")
        .map(Number);

      const startHour = Number.isFinite(sh) ? sh : 12;
      const startMinute = Number.isFinite(sm) ? sm : 0;
      const endHour = Number.isFinite(eh) ? eh : 13;
      const endMinute = Number.isFinite(em) ? em : 0;

      slots.push({
        id: `${weekday}-${ymdLocal(day)}-${pad2(startHour)}${pad2(
          startMinute
        )}`,
        weekday,
        dateISO: toTZDateISO(day, startHour, startMinute),
        dayLabel: `${DAY_FULL_IT[weekday]} ${day.getDate()} ${itShortMonth(
          day
        )}`,
        timeRange:
          `${pad2(startHour)}:${pad2(startMinute)}–` +
          `${pad2(endHour)}:${pad2(endMinute)}`,
      });

      if (slots.length >= slotsAhead) break;
    }
  }

  return slots.slice(0, slotsAhead);
}

// Mantiene il fallback statico già presente nel componente A3.
function buildUpcomingSlotsStatic(
  count: number,
  minLeadDays = 1
): DeliverySlot[] {
  return buildSlotsFromConfig({
    weekdays: [1, 3, 5],
    timeRanges: [{ start: "12:00", end: "13:00" }],
    slotsAhead: count,
    minLeadDays,
    blacklistDates: [],
    blacklistRanges: [],
  }).map((slot) => ({
    ...slot,
    id: slot.id.replace(/-\d{4}$/, ""),
  }));
}

/* -------------------------------------------------------------------------- */
/* Componente                                                                 */
/* -------------------------------------------------------------------------- */

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
  uploadProgress = null,
  ivaRate = 0.22,
  transportFeeEuro = 1,
  paypalPercent = 0.0349,
  paypalFixed = 0.35,
}) => {
  // Mantiene la scelta iniziale del componente A3 originale.
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodUI>(null);

  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalLoadError, setPaypalLoadError] = useState<string | null>(
    null
  );

  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);
  const localOrderIdRef = useRef<string | null>(null);

  const [fees, setFees] = useState<Fees>({
    ivaRate,
    transportFeeEuro,
    paypalPercent,
    paypalFixed,
  });

  const [deliveryCfg, setDeliveryCfg] = useState<DeliveryConfig>(
    DEFAULT_DELIVERY_CONFIG
  );

  const [promoCfg, setPromoCfg] =
    useState<PromoConfig>(DEFAULT_PROMO_CONFIG);

  const [userProfilePromo, setUserProfilePromo] =
    useState<UserProfilePromo | null>(null);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    null
  );

  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  /* Configurazione consegne */
  useEffect(() => {
    let alive = true;

    api
      .get<Partial<DeliveryConfig>>("/api/public/delivery-config", {
        auth: false,
      })
      .then((data) => {
        if (!alive) return;

        setDeliveryCfg({
          weekdays:
            Array.isArray(data.weekdays) && data.weekdays.length
              ? data.weekdays
              : [1, 3, 5],
          timeRanges:
            Array.isArray(data.timeRanges) && data.timeRanges.length
              ? data.timeRanges
              : [{ start: "12:00", end: "13:00" }],
          slotsAhead:
            typeof data.slotsAhead === "number" ? data.slotsAhead : 6,
          timezone:
            typeof data.timezone === "string" && data.timezone
              ? data.timezone
              : "Europe/Rome",
          blacklistDates: Array.isArray(data.blacklistDates)
            ? data.blacklistDates
            : [],
          blacklistRanges: Array.isArray(data.blacklistRanges)
            ? data.blacklistRanges
            : [],
          minLeadDays:
            typeof data.minLeadDays === "number" ? data.minLeadDays : 1,
        });
      })
      .catch((error) => {
        console.error("Errore lettura config consegne:", error);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* Configurazione promozioni */
  useEffect(() => {
    let alive = true;

    api
      .get<Partial<PromoConfig>>("/api/public/promo-config", {
        auth: false,
      })
      .then((data) => {
        if (!alive) return;

        setPromoCfg({
          generalPromo: normalizeBasePromo(
            data.generalPromo,
            DEFAULT_GENERAL_PROMO
          ),
          studentPromo: normalizeStudentPromo(
            data.studentPromo,
            DEFAULT_STUDENT_PROMO
          ),
        });
      })
      .catch((error) => {
        console.error("Errore lettura promo:", error);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* Profilo per le promozioni studenti */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((user) => {
      setUserProfilePromo(
        user
          ? {
            course: user.corsoLaurea || "",
            academicYear: user.annoAccademico
              ? Number(user.annoAccademico)
              : null,
          }
          : null
      );
    });

    return () => unsubscribe();
  }, []);

  /* Configurazione costi */
  useEffect(() => {
    let alive = true;

    api
      .get<Partial<Fees>>("/api/public/fees-config", {
        auth: false,
      })
      .then((data) => {
        if (!alive) return;

        setFees({
          ivaRate:
            typeof data.ivaRate === "number" ? data.ivaRate : ivaRate,
          transportFeeEuro:
            typeof data.transportFeeEuro === "number"
              ? data.transportFeeEuro
              : transportFeeEuro,
          paypalPercent:
            typeof data.paypalPercent === "number"
              ? data.paypalPercent
              : paypalPercent,
          paypalFixed:
            typeof data.paypalFixed === "number"
              ? data.paypalFixed
              : paypalFixed,
        });
      })
      .catch(() => {
        if (!alive) return;

        setFees({
          ivaRate,
          transportFeeEuro,
          paypalPercent,
          paypalFixed,
        });
      });

    return () => {
      alive = false;
    };
  }, [ivaRate, transportFeeEuro, paypalPercent, paypalFixed]);

  /* Slot disponibili */
  const deliverySlotsFromCfg = useMemo(
    () => buildSlotsFromConfig(deliveryCfg),
    [deliveryCfg]
  );

  const deliverySlots = useMemo(
    () =>
      deliverySlotsFromCfg.length
        ? deliverySlotsFromCfg
        : buildUpcomingSlotsStatic(6, deliveryCfg.minLeadDays ?? 1),
    [deliverySlotsFromCfg, deliveryCfg.minLeadDays]
  );

  const selectedSlot = useMemo(
    () =>
      deliverySlots.find((slot) => slot.id === selectedSlotId) || null,
    [deliverySlots, selectedSlotId]
  );

  const canProceedPay =
    isStudent !== null && (isStudent === false || !!selectedSlot);

  /* Calcolo importi: stesse formule del componente originale */
  const totals = useMemo(() => {
    const baseLordo = round2(parseEuro(prezzo));

    const generalPromoAttiva = isBasePromoActiveToday(
      promoCfg.generalPromo,
      numeroPDF
    );

    const studentPromoAttiva = isStudentPromoActiveToday(
      promoCfg.studentPromo,
      numeroPDF,
      userProfilePromo
    );

    const scontoGeneralePercent = generalPromoAttiva
      ? promoCfg.generalPromo.percent
      : 0;

    const scontoGenerale =
      scontoGeneralePercent > 0
        ? round2(baseLordo * (scontoGeneralePercent / 100))
        : 0;

    const baseDopoScontoGenerale = round2(baseLordo - scontoGenerale);

    const scontoStudentiPercent = studentPromoAttiva
      ? promoCfg.studentPromo.percent
      : 0;

    const scontoStudenti =
      scontoStudentiPercent > 0
        ? round2(baseDopoScontoGenerale * (scontoStudentiPercent / 100))
        : 0;

    const base = round2(baseDopoScontoGenerale - scontoStudenti);
    const iva = round2(base * fees.ivaRate);

    const trasporto =
      isStudent === true ? round2(fees.transportFeeEuro) : 0;

    const subTotale = round2(base + iva + trasporto);

    const feePP =
      paymentMethod === "paypal"
        ? round2(subTotale * fees.paypalPercent + fees.paypalFixed)
        : 0;

    const totaleContanti = subTotale;
    const totalePayPal = round2(subTotale + feePP);

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
      totaleDaAddebitare:
        paymentMethod === "paypal" ? totalePayPal : totaleContanti,
    };
  }, [
    prezzo,
    fees,
    paymentMethod,
    promoCfg,
    numeroPDF,
    isStudent,
    userProfilePromo,
  ]);

  /* Caricamento SDK PayPal */
  useEffect(() => {
    if (paymentMethod !== "paypal") return;

    if (window.paypal) {
      setPaypalReady(true);
      setPaypalLoadError(null);
      return;
    }

    if (!PAYPAL_CLIENT_ID) {
      setPaypalLoadError("PayPal non è disponibile al momento.");
      console.error("PAYPAL_CLIENT_ID mancante");
      return;
    }

    let alive = true;

    setPaypalLoadError(null);

    const script = document.createElement("script");

    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
        PAYPAL_CLIENT_ID
      )}` + "&currency=EUR&intent=capture&components=buttons";

    script.async = true;

    script.onload = () => {
      if (alive) setPaypalReady(true);
    };

    script.onerror = () => {
      if (alive) {
        setPaypalLoadError(
          "Impossibile caricare PayPal. Riprova o scegli Contanti."
        );
      }
    };

    document.body.appendChild(script);

    return () => {
      alive = false;
      script.onload = null;
      script.onerror = null;
      script.remove();
    };
  }, [paymentMethod]);

  /* Pulsanti e pagamento PayPal */
  useEffect(() => {
    if (
      paymentMethod !== "paypal" ||
      !paypalButtonsContainerRef.current ||
      submitted
    ) {
      return;
    }

    paypalButtonsContainerRef.current.innerHTML = "";

    if (!canProceedPay || !paypalReady) return;

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },

      createOrder: async () => {
        const prepared = await onConfirmOrder({
          method: "PAYPAL",
          confirmed: false,
          delivery: selectedSlot || undefined,
        });

        if (!prepared) {
          throw new Error("Completa i dati dell'ordine prima di pagare");
        }

        localOrderIdRef.current = prepared.id;

        const data = await api.post<{ orderId: string }>(
          "/api/paypal/create-order",
          { localOrderId: prepared.id }
        );

        return data.orderId;
      },

      onApprove: async (data: PayPalApproveData) => {
        try {
          const capture = await api.post<{
            status: string;
            orderId?: string;
            captureId?: string;
            payerEmail?: string;
            amount?: string | number;
          }>("/api/paypal/capture-order", {
            localOrderId: localOrderIdRef.current,
            orderId: data.orderID,
          });

          if (capture.status !== "COMPLETED") {
            alert("Pagamento non completato: " + capture.status);
            return;
          }

          await onConfirmOrder({
            method: "PAYPAL",
            confirmed: true,
            orderId: capture.orderId,
            captureId: capture.captureId,
            payerEmail: capture.payerEmail,
            amount: Number(capture.amount),
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
        } catch (error) {
          console.error(error);
          alert("Si è verificato un errore durante il pagamento.");
        }
      },

      onError: (error: unknown) => {
        console.error("PayPal error:", error);
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsContainerRef.current);

    return () => {
      try {
        instance.close();
      } catch {
        // Il pulsante potrebbe essere già stato rimosso.
      }
    };
  }, [
    paymentMethod,
    paypalReady,
    submitted,
    canProceedPay,
    totals.base,
    totals.iva,
    totals.trasporto,
    totals.feePP,
    totals.scontoGenerale,
    totals.scontoStudenti,
    totals.baseLordo,
    onConfirmOrder,
    selectedSlot,
  ]);

  /* Conferma ordine in contanti */
  const handleConfirmOrderCash = async () => {
    if (disabled || loading || submitted || paymentMethod !== "cash") {
      return;
    }

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

  const footerHint =
    numeroPDF === 0
      ? "Carica almeno un PDF per iniziare."
      : isStudent === null
        ? "Completa la scelta nella sezione consegna."
        : isStudent === true && !selectedSlot
          ? "Scegli uno slot di consegna."
          : paymentMethod === null
            ? "Seleziona un metodo di pagamento."
            : disabled
              ? "Completa le impostazioni dei PDF per continuare."
              : paymentMethod === "paypal"
                ? "Usa il pulsante PayPal per completare il pagamento."
                : "Pagamento in contanti.";

  /* ------------------------------------------------------------------------ */
  /* Interfaccia: stesse classi del riepilogo A4                                */
  /* ------------------------------------------------------------------------ */

  return (
    <aside
      className="pv-order"
      aria-label="Riepilogo ordine A3"
      aria-busy={loading}
    >
      <header className="pv-order-header">
        <div>
          <span className="pv-order-eyebrow">LA TUA STAMPA</span>
          <h2>Riepilogo ordine</h2>
          <p>Controlla le tue scelte e completa l’ordine.</p>
        </div>

        <span className="pv-order-format">A3</span>
      </header>

      <div
        className="pv-order-body"
        tabIndex={0}
        role="region"
        aria-label="Dettagli e opzioni dell’ordine A3"
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
            <strong>A3</strong>
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
              <dt>Pagine totali</dt>
              <dd>{numeroPagine}</dd>
            </div>

            <div>
              <dt>Grammatura</dt>
              <dd>{grammatura}</dd>
            </div>

            <div>
              <dt>Colore</dt>
              <dd>{inchiostro}</dd>
            </div>

            <div>
              <dt>Gestione pagina</dt>
              <dd>{pagina === "Fronte" ? "Solo fronte" : pagina}</dd>
            </div>

            <div>
              <dt>Layout</dt>
              <dd>{layout}</dd>
            </div>

            <div>
              <dt>Plastificazione</dt>
              <dd>{plastificazione === "Si" ? "Sì" : plastificazione}</dd>
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
              hint="Scegli come preferisci pagare"
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
                <dt>
                  {promoCfg.generalPromo.name || "Promo generale"}
                  {" "}(-{totals.scontoGeneralePercent.toFixed(0)}%)
                </dt>
                <dd>−{euro(totals.scontoGenerale)} €</dd>
              </div>
            )}

            {totals.scontoStudenti > 0 && (
              <div className="pv-order-discount">
                <dt>
                  {promoCfg.studentPromo.name || "Promo studenti"}
                  {" "}(-{totals.scontoStudentiPercent.toFixed(0)}%)
                </dt>
                <dd>−{euro(totals.scontoStudenti)} €</dd>
              </div>
            )}

            {(totals.scontoGenerale > 0 || totals.scontoStudenti > 0) && (
              <div>
                <dt>Imponibile scontato</dt>
                <dd>{euro(totals.base)} €</dd>
              </div>
            )}

            <div>
              <dt>IVA ({Number((fees.ivaRate * 100).toFixed(2))}%)</dt>
              <dd>{euro(totals.iva)} €</dd>
            </div>

            {isStudent === true && (
              <div>
                <dt>Consegna</dt>
                <dd>{euro(totals.trasporto)} €</dd>
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
                {paypalLoadError ? (
                  <Alert
                    color="red"
                    variant="light"
                    icon={<IconInfoCircle size={18} />}
                  >
                    {paypalLoadError}
                  </Alert>
                ) : (
                  !paypalReady && (
                    <Group gap="sm">
                      <Loader size="sm" color="gold" />
                      <Text size="sm" c="dimmed">
                        Caricamento PayPal…
                      </Text>
                    </Group>
                  )
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

        {!loading && !submitted && paymentMethod !== "paypal" && (
          <button
            type="button"
            className="pv-order-confirm"
            onClick={handleConfirmOrderCash}
            disabled={
              disabled ||
              !canProceedPay ||
              paymentMethod !== "cash"
            }
          >
            <span>Conferma ordine</span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        {!loading && !submitted && (
          <p className="pv-order-footnote">{footerHint}</p>
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

export default React.memo(RiepilogoOrdineA3);