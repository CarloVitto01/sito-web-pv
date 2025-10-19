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
const API = (API_BASE || "").replace(/\/+$/, ""); // toglie eventuale "/" finale

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

  // Carica PayPal SDK
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
      // se NON usi cookie/sessione, commenta la riga seguente:
      // credentials: "include",
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
    if (paymentMethod !== "paypal" || !paypalReady || !paypalButtonsContainerRef.current || submitted) return;

    paypalButtonsContainerRef.current.innerHTML = "";

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
  ]);

  const handleConfirmOrderCash = async () => {
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
    });
  };

  // Barra di caricamento (solo invio ordine)
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

      {/* --- Breakdown economico --- */}
      <div className={`${styles["price-card"]} ${styles["price-left"]}`}>
        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Imponibile</span>
          <span className={styles["price-value"]}>{euro(totals.base)} €</span>
        </div>

        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>
            IVA ({Math.round(fees.ivaRate * 100)}%)
          </span>
          <span className={styles["price-value"]}>{euro(totals.iva)} €</span>
        </div>

        <div className={styles["price-row"]}>
          <span className={styles["price-label"]}>Trasporto</span>
          <span className={styles["price-value"]}>{euro(totals.trasporto)} €</span>
        </div>

        <hr className={styles["price-sep"]} />

        <div className={`${styles["price-row"]} ${styles["price-subtotal"]}`}>
          <span className={styles["price-label"]}>Subtotale (IVA incl.)</span>
          <span className={styles["price-value"]}>{euro(totals.subTotale)} €</span>
        </div>

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
            Totale {paymentMethod === "paypal" ? "PayPal" : "Contanti"}
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
          disabled={disabled || loading || submitted}
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
