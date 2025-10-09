import styles from "./RiepilogoOrdine.module.css";
import React, { useState, useEffect, useRef, useMemo } from "react";

type PaymentPayload = {
  method: "CASH" | "PAYPAL";
  confirmed: boolean;
  orderId?: string;
  captureId?: string;
  payerEmail?: string;
  amount?: number; // totale finale addebitato (IVA+trasporto+eventuale fee PayPal)
};

type RiepilogoProps = {
  inchiostro: string;
  pagina: string;
  layout: string;
  rilegatura: string;
  rilegaturaUnica: string;
  intervalloPagine: string;
  numeroCopie: number;
  numeroPDF: number;
  prezzo: string; // imponibile base: "12.50" o "12,50"

  onConfirmOrder: (payment: PaymentPayload) => Promise<void>;
  disabled?: boolean;
  submitted?: boolean;
  loading?: boolean;

  /** --- NUOVE OPZIONI --- */
  ivaRate?: number;           // default 0.22 (22%)
  transportFeeEuro?: number;  // default 0
  paypalPercent?: number;     // default 0.0349 (3.49%)
  paypalFixed?: number;       // default 0.35 (€)
};

const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID as string;
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

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

const RiepilogoOrdine = ({
  inchiostro,
  pagina,
  layout,
  rilegatura,
  rilegaturaUnica,
  intervalloPagine,
  numeroCopie,
  numeroPDF,
  prezzo,
  onConfirmOrder,
  disabled = false,
  submitted = false,
  loading = false,

  // defaults nuovi
  ivaRate = 0.22,
  transportFeeEuro = 1,
  paypalPercent = 0.0349,
  paypalFixed = 0.35,
}: RiepilogoProps) => {
  const [progress, setProgress] = useState(0);
  const [/*loadingStarted*/, setLoadingStarted] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "paypal" | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => {
    const base = round2(parseEuro(prezzo));
    const iva = round2(base * ivaRate);
    const trasporto = round2(transportFeeEuro);
    const subTotale = round2(base + iva + trasporto);

    const feePP =
      paymentMethod === "paypal"
        ? round2(subTotale * paypalPercent + paypalFixed)
        : 0;

    const totaleContanti = subTotale; // niente fee PayPal
    const totalePayPal = round2(subTotale + feePP);

    // Importo da addebitare in base al metodo scelto
    const totaleDaAddebitare =
      paymentMethod === "paypal" ? totalePayPal : totaleContanti;

    return {
      base,
      iva,
      trasporto,
      subTotale,
      feePP,
      totaleContanti,
      totalePayPal,
      totaleDaAddebitare,
    };
  }, [prezzo, ivaRate, transportFeeEuro, paypalPercent, paypalFixed, paymentMethod]);

  // Carica lo script PayPal quando serve
  useEffect(() => {
    if (paymentMethod !== "paypal") return;
    if (window.paypal) {
      setPaypalReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&intent=capture`;
    script.async = true;
    script.onload = () => setPaypalReady(true);
    script.onerror = () => console.error("Impossibile caricare PayPal SDK");
    document.body.appendChild(script);
    return () => {
      // opzionale: rimuovere lo script se si cambia metodo
    };
  }, [paymentMethod]);

  // Render dei PayPal Buttons quando SDK pronto
  useEffect(() => {
    if (paymentMethod !== "paypal" || !paypalReady || !paypalButtonsContainerRef.current || submitted) return;

    // Pulisci contenitore (evita doppio mount)
    paypalButtonsContainerRef.current.innerHTML = "";

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) return;

    const instance = Buttons({
      style: { layout: "vertical" },

      // 1) Crea l'ordine sul tuo backend (importo già comprensivo di IVA, trasporto e fee PayPal)
      createOrder: async () => {
        const res = await fetch(`${API_BASE}/api/paypal/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totals.totaleDaAddebitare.toFixed(2),
            currency: "EUR",
          }),
        });
        if (!res.ok) throw new Error("Errore create-order");
        const data = await res.json(); // { orderId }
        return data.orderId;
      },

      // 2) Approve → cattura sul backend, poi conferma ordine
      onApprove: async (data: any) => {
        try {
          const res = await fetch(`${API_BASE}/api/paypal/capture-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          if (!res.ok) throw new Error("Errore capture-order");
          const cap = await res.json();
          // attesi: { status: "COMPLETED", orderId, captureId, payerEmail, amount }
          if (cap.status === "COMPLETED") {
            await onConfirmOrder({
              method: "PAYPAL",
              confirmed: true,
              orderId: cap.orderId,
              captureId: cap.captureId,
              payerEmail: cap.payerEmail,
              amount: Number(cap.amount), // totale effettivamente addebitato
            });
          } else {
            alert("Pagamento non completato: " + cap.status);
          }
        } catch (e: any) {
          console.error(e);
          alert("Si è verificato un errore durante il pagamento.");
        }
      },

      onError: (err: any) => {
        console.error("PayPal error:", err);
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsContainerRef.current);

    return () => {
      try {
        instance.close();
      } catch {}
    };
  }, [paymentMethod, paypalReady, submitted, totals, onConfirmOrder]);

  const handleConfirmOrderCash = async () => {
    setProgress(0);
    setLoadingStarted(true);
    await onConfirmOrder({
      method: "CASH",
      confirmed: false, // verrà pagato alla consegna
      amount: totals.totaleContanti, // imponibile + IVA + trasporto
    });
  };

  const handlePayCash = () => setPaymentMethod("cash");
  const handlePayPaypal = () => setPaymentMethod("paypal");

  // Barra di caricamento
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

  useEffect(() => {
    if (submitted) setProgress(100);
  }, [submitted]);

  const confirmDisabledCash = disabled || loading || submitted || paymentMethod !== "cash";

  return (
    <div className={styles["riepilogo-container"]}>
      <h3 className={styles["riepilogo-title"]}>📋 Riepilogo ordine</h3>

      <p className={styles["riepilogo-item"]}><strong>Numero PDF:</strong> {numeroPDF}</p>
      <p className={styles["riepilogo-item"]}><strong>Inchiostro:</strong> {inchiostro}</p>
      <p className={styles["riepilogo-item"]}><strong>Layout:</strong> {layout}</p>
      <p className={styles["riepilogo-item"]}><strong>Gestione pagina:</strong> {pagina}</p>
      <p className={styles["riepilogo-item"]}><strong>Rilegatura:</strong> {rilegatura}</p>
      <p className={styles["riepilogo-item"]}><strong>Rilegatura unica:</strong> {rilegaturaUnica}</p>
      <p className={styles["riepilogo-item"]}><strong>Intervallo pagine:</strong> {intervalloPagine}</p>
      <p className={styles["riepilogo-item"]}><strong>Numero copie:</strong> {numeroCopie}</p>

      {/* --- Breakdown economico --- */}
      <div className={styles["payment-box"]} style={{ marginTop: 8 }}>
        <div className={styles["riepilogo-item"]}>
          <strong>Imponibile:</strong> {euro(totals.base)} €
        </div>
        <div className={styles["riepilogo-item"]}>
          <strong>IVA ({Math.round(ivaRate * 100)}%):</strong> {euro(totals.iva)} €
        </div>
        <div className={styles["riepilogo-item"]}>
          <strong>Trasporto:</strong> {euro(totals.trasporto)} €
        </div>
        <div className={styles["riepilogo-item"]}>
          <strong>Subtotale (IVA inclusa):</strong> {euro(totals.subTotale)} €
        </div>
        {paymentMethod === "paypal" && (
          <div className={styles["riepilogo-item"]}>
            <strong>Fee PayPal ({(paypalPercent * 100).toFixed(2)}% + {euro(paypalFixed)} €):</strong> {euro(totals.feePP)} €
          </div>
        )}
        <div className={styles["riepilogo-item"]}>
          <strong>
            Totale {paymentMethod === "paypal" ? "PayPal" : "Contanti"}:
          </strong>{" "}
          {euro(totals.totaleDaAddebitare)} €
        </div>
      </div>

      {/* Metodi di pagamento */}
      <div className={styles["payment-box"]} role="group" aria-label="Seleziona metodo di pagamento">
        <button
          type="button"
          className={`${styles["pay-button"]} ${paymentMethod === "cash" ? styles["selected"] : ""}`}
          onClick={handlePayCash}
          aria-pressed={paymentMethod === "cash"}
        >
          💵 Contanti
          <span className={styles["pay-subtext"]}>Paga in contanti alla consegna</span>
          <span className={styles["pay-subtext"]}>
            Totale: {euro(totals.totaleContanti)} €
          </span>
        </button>

        <button
          type="button"
          className={`${styles["pay-button"]} ${paymentMethod === "paypal" ? styles["selected"] : ""}`}
          onClick={handlePayPaypal}
          aria-pressed={paymentMethod === "paypal"}
        >
          🟦 PayPal
          <span className={styles["pay-subtext"]}>Paga con PayPal</span>
          <span className={styles["pay-subtext"]}>
            Totale: {euro(totals.totalePayPal)} €
          </span>
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
          disabled={confirmDisabledCash}
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

export default RiepilogoOrdine;
