// ✅ src/components/RiepilogoOrdineComponents/RiepilogoOrdineA3.tsx
// Aggiornato per usare:
// - ConsegnaSlotPicker ✅
// - MetodoPagamentoPicker ✅
// Senza rimuovere nulla: il vecchio UI resta ma viene "nascosto" (render condizionale)
// + fix Badge quando paymentMethod è null

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot } from "firebase/firestore";
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
const euro = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

declare global {
  interface Window {
    paypal?: any;
  }
}

const FEES_COLLECTION = "configTasse";
const FEES_DOC = "fees";

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
const COLL_CONS = "configConsegne";
const DOC_CONS = "settings";

type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type DeliverySlot = {
  id: string;
  weekday: Weekday;
  dateISO: string;
  dayLabel: string;
  timeRange: string;
};

type PromoConfig = {
  enabled: boolean;
  name?: string;
  description?: string;
  percent: number;
  startDate?: string;
  endDate?: string;
  minPdf?: number;
};

const PROMO_COLL = "configPromo";
const PROMO_DOC = "current";

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

function isPromoActiveToday(promo: PromoConfig, numeroPDF: number): boolean {
  if (!promo.enabled) return false;
  if (numeroPDF < (promo.minPdf ?? 1)) return false;
  if (!Number.isFinite(promo.percent) || promo.percent <= 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYmd = ymdLocal(today);

  if (promo.startDate && todayYmd < promo.startDate) return false;
  if (promo.endDate && todayYmd > promo.endDate) return false;

  return true;
}

function buildSlotsFromConfig(cfg: DeliveryConfig): DeliverySlot[] {
  const weekdays = (Array.isArray(cfg.weekdays) && cfg.weekdays.length ? cfg.weekdays : [1, 3, 5]).map((w) =>
    Math.min(7, Math.max(1, Number(w)))
  ) as Weekday[];

  const timeRanges =
    Array.isArray(cfg.timeRanges) && cfg.timeRanges.length ? cfg.timeRanges : [{ start: "12:00", end: "13:00" }];

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
      timeRange: `${pad2(SLOT_START.hour)}:${pad2(SLOT_START.minute)}–${pad2(SLOT_END.hour)}:${pad2(SLOT_END.minute)}`,
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
    const ref = doc(db, COLL_CONS, DOC_CONS);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as Partial<DeliveryConfig>;
      setDeliveryCfg({
        weekdays: Array.isArray(d.weekdays) && d.weekdays.length ? (d.weekdays as number[]) : [1, 3, 5],
        timeRanges: Array.isArray(d.timeRanges) && d.timeRanges.length ? (d.timeRanges as TimeRange[]) : [{ start: "12:00", end: "13:00" }],
        slotsAhead: typeof d.slotsAhead === "number" ? d.slotsAhead : 6,
        timezone: typeof d.timezone === "string" && d.timezone ? d.timezone : "Europe/Rome",
        blacklistDates: Array.isArray(d.blacklistDates) ? (d.blacklistDates as string[]) : [],
        blacklistRanges: Array.isArray(d.blacklistRanges) ? (d.blacklistRanges as BlacklistRange[]) : [],
        minLeadDays: typeof d.minLeadDays === "number" ? d.minLeadDays : 1,
      });
    });
    return () => unsub();
  }, []);

  const [promoCfg, setPromoCfg] = useState<PromoConfig>({
    enabled: false,
    name: "Promo",
    description: "",
    percent: 0,
    startDate: "",
    endDate: "",
    minPdf: 1,
  });

  useEffect(() => {
    const ref = doc(db, PROMO_COLL, PROMO_DOC);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPromoCfg((prev) => ({ ...prev, enabled: false, percent: 0 }));
          return;
        }
        const d = snap.data() as Partial<PromoConfig>;
        setPromoCfg({
          enabled: typeof d.enabled === "boolean" ? d.enabled : false,
          name: typeof d.name === "string" ? d.name : "Promo",
          description: typeof d.description === "string" ? d.description : "",
          percent: typeof d.percent === "number" ? d.percent : 0,
          startDate: typeof d.startDate === "string" ? d.startDate : "",
          endDate: typeof d.endDate === "string" ? d.endDate : "",
          minPdf: typeof d.minPdf === "number" ? d.minPdf : 1,
        });
      },
      (err) => console.error("Errore lettura promo:", err)
    );
    return () => unsub();
  }, []);

  const deliverySlotsFromCfg = useMemo(() => buildSlotsFromConfig(deliveryCfg), [deliveryCfg]);
  const deliverySlots = useMemo(
    () => (deliverySlotsFromCfg.length ? deliverySlotsFromCfg : buildUpcomingSlotsStatic(6, deliveryCfg?.minLeadDays ?? 1)),
    [deliverySlotsFromCfg, deliveryCfg?.minLeadDays]
  );

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const selectedSlot = useMemo(() => deliverySlots.find((s) => s.id === selectedSlotId) || null, [deliverySlots, selectedSlotId]);

  useEffect(() => {
    const ref = doc(db, FEES_COLLECTION, FEES_DOC);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setFees({ ivaRate, transportFeeEuro, paypalPercent, paypalFixed });
        return;
      }
      const d = snap.data() as Partial<Fees>;
      setFees({
        ivaRate: typeof d.ivaRate === "number" ? d.ivaRate : ivaRate,
        transportFeeEuro: typeof d.transportFeeEuro === "number" ? d.transportFeeEuro : transportFeeEuro,
        paypalPercent: typeof d.paypalPercent === "number" ? d.paypalPercent : paypalPercent,
        paypalFixed: typeof d.paypalFixed === "number" ? d.paypalFixed : paypalFixed,
      });
    });
    return () => unsub();
  }, [ivaRate, transportFeeEuro, paypalPercent, paypalFixed]);

  const totals = useMemo(() => {
    const baseLordo = round2(parseEuro(prezzo));

    const promoAttiva = isPromoActiveToday(promoCfg, numeroPDF);
    const scontoPercent = promoAttiva ? promoCfg.percent : 0;
    const scontoPromo = scontoPercent > 0 ? round2(baseLordo * (scontoPercent / 100)) : 0;

    const base = round2(baseLordo - scontoPromo);

    const iva = round2(base * fees.ivaRate);
    const trasporto = round2(fees.transportFeeEuro);
    const subTotale = round2(base + iva + trasporto);

    const feePP = paymentMethod === "paypal" ? round2(subTotale * fees.paypalPercent + fees.paypalFixed) : 0;
    const totaleContanti = subTotale;
    const totalePayPal = round2(subTotale + feePP);
    const totaleDaAddebitare = paymentMethod === "paypal" ? totalePayPal : totaleContanti;

    return {
      baseLordo,
      base,
      scontoPromo,
      scontoPercent,
      promoAttiva,
      iva,
      trasporto,
      subTotale,
      feePP,
      totaleContanti,
      totalePayPal,
      totaleDaAddebitare,
    };
  }, [prezzo, fees, paymentMethod, promoCfg, numeroPDF]);

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

  const fetchJSON = useCallback(
    async <T,>(url: string, body: unknown): Promise<T> => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
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
    },
    [authToken, csrfToken]
  );

  useEffect(() => {
    if (paymentMethod !== "paypal" || !paypalButtonsContainerRef.current || submitted) return;

    paypalButtonsContainerRef.current.innerHTML = "";
    if (!selectedSlot) return;
    if (!paypalReady) return;

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },

      createOrder: async () => {
        const data = await fetchJSON<{ orderId: string }>(`${API}/api/paypal/create-order`, {
          amount: totals.totaleDaAddebitare.toFixed(2),
          currency: "EUR",
        });
        if (!data?.orderId || typeof data.orderId !== "string") throw new Error("Risposta backend priva di orderId");
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
          }>(`${API}/api/paypal/capture-order`, { orderId: data.orderID });

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
    deliveryCfg.timeRanges?.length === 1 ? ` (${deliveryCfg.timeRanges[0].start}–${deliveryCfg.timeRanges[0].end})` : "";

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3} size="h4">
            📋 Riepilogo Ordine A3
          </Title>
          {totals.promoAttiva && (
            <Badge variant="light" color="yellow">
              -{totals.scontoPercent.toFixed(0)}%
            </Badge>
          )}
        </Group>

        {totals.promoAttiva && (
          <Alert icon={<IconInfoCircle size={18} />} color="yellow" variant="light">
            {promoCfg.description ? promoCfg.description : `🎄 ${promoCfg.name ?? "Promo"}: -${totals.scontoPercent.toFixed(0)}% sulle stampe A3`}
          </Alert>
        )}

        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Text fw={800}>Dettagli ordine</Text>
            <Divider />
            <KeyValueRow label="Numero PDF" value={numeroPDF} />
            <KeyValueRow label="Numero pagine totali" value={numeroPagine} />
            <KeyValueRow label="Grammatura" value={grammatura} />
            <KeyValueRow label="Colore" value={inchiostro} />
            <KeyValueRow label="Gestione pagina" value={pagina} />
            <KeyValueRow label="Layout" value={layout} />
            <KeyValueRow label="Plastificazione" value={plastificazione} />
            <KeyValueRow label="Numero copie" value={numeroCopie} />
          </Stack>
        </Card>

        {/* ✅ NUOVO: Picker consegna (non rimuove nulla, aggiunge) */}
        <ConsegnaSlotPicker
          title={`Consegna${deliveryTitleSuffix}`}
          slots={deliverySlots as DeliverySlot[]}
          selectedId={selectedSlotId}
          onChange={setSelectedSlotId}
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

        <Card withBorder radius="md" p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={800}>Totale</Text>
              <Badge variant="light" color={paymentMethod === "paypal" ? "blue" : "gray"}>
                {paymentMethod === "paypal" ? "PayPal" : paymentMethod === "cash" ? "Contanti" : "—"}
              </Badge>
            </Group>
            <Divider />

            {totals.promoAttiva && totals.scontoPromo > 0 && (
              <Group justify="space-between" align="baseline">
                <Text size="sm" c="green">
                  {promoCfg.name || "Promo"} (-{totals.scontoPercent.toFixed(0)}%)
                </Text>
                <Text size="sm" c="green" fw={700}>
                  - {euro(totals.scontoPromo)} €
                </Text>
              </Group>
            )}

            <KeyValueRow label="Imponibile" value={`${euro(totals.base)} €`} />
            <KeyValueRow label={`IVA (${(fees.ivaRate * 100).toFixed(0)}%)`} value={`${euro(totals.iva)} €`} />
            <KeyValueRow label="Trasporto" value={`${euro(totals.trasporto)} €`} />

            {paymentMethod === "paypal" && (
              <KeyValueRow
                label={`Fee PayPal (${(fees.paypalPercent * 100).toFixed(2)}% + ${euro(fees.paypalFixed)} €)`}
                value={`${euro(totals.feePP)} €`}
              />
            )}

            <Divider />
            <Group justify="space-between" align="baseline">
              <Text fw={900}>Totale finale</Text>
              <Text fw={900} size="lg">
                {euro(totals.totaleDaAddebitare)} €
              </Text>
            </Group>
          </Stack>
        </Card>

        {/* ✅ NUOVO: Picker metodo pagamento */}
        <MetodoPagamentoPicker value={paymentMethod} onChange={(v) => setPaymentMethod(v)} hint="Scegli come preferisci pagare" />

        {/* ✅ VECCHIO: 2 bottoni (non cancellati) - li teniamo ma li nascondiamo */}
        {false && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Button variant={paymentMethod === "cash" ? "light" : "default"} onClick={() => setPaymentMethod("cash")}>
              💵 Contanti
              <Text component="span" c="dimmed" size="xs" ml="xs">
                Paga alla consegna
              </Text>
            </Button>

            <Button variant={paymentMethod === "paypal" ? "light" : "default"} onClick={() => setPaymentMethod("paypal")}>
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
                Completa il pagamento di <strong>{euro(totals.totaleDaAddebitare)} €</strong> con PayPal. Al termine l’ordine partirà automaticamente.
              </Text>

              {!selectedSlot ? (
                <Alert color="yellow" variant="light" icon={<IconInfoCircle size={18} />}>
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
          <Button fullWidth size="md" onClick={handleConfirmOrderCash} disabled={disabled || loading || submitted || !selectedSlot}>
            ✅ Conferma Ordine
          </Button>
        )}

        {loading && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              Invio in corso: attendere il completamento della barra.
            </Text>
            <Progress value={progress} />
          </Stack>
        )}

        {submitted && (
          <Alert color="yellow" variant="light" icon={<IconCheck size={18} />}>
            🎉 Ordine inviato con successo!
          </Alert>
        )}
      </Stack>
    </Card>
  );
};

export default React.memo(RiepilogoOrdineA3);
