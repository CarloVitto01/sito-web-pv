import styles from "./RiepilogoOrdine.module.css";
import React, { useEffect, useRef, useState } from "react";

type RiepilogoA3Props = {
  inchiostro: string;
  pagina: string;
  layout: string;
  grammatura: string;
  plastificazione: string;
  numeroCopie: number;
  numeroPDF: number;
  numeroPagine: number;
  prezzo: string; // es: "12,50" o "12.50"
  onConfirmOrder: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  submitted?: boolean;
};

// ===== ENV (Create React App) =====
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID as string;
const API_BASE = process.env.REACT_APP_API_BASE_URL || "";

// accetta "12,50" o "12.50"
function parseEuro(prezzo: string): number {
  const normalized = prezzo.replace(",", ".").replace(/[^\d.]/g, "");
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
}

declare global {
  interface Window {
    paypal?: any;
  }
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
}: RiepilogoA3Props) => {
  const [progress, setProgress] = useState(0);
  const [/*loadingStarted*/, setLoadingStarted] = useState(false);

  // stato pagamenti
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "paypal" | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const paypalButtonsContainerRef = useRef<HTMLDivElement | null>(null);

  const amountEUR = parseEuro(prezzo);

  const handleConfirmOrderCash = async () => {
    setProgress(0);
    setLoadingStarted(true);
    await onConfirmOrder();
  };

  const handlePayCash = () => setPaymentMethod("cash");
  const handlePayPaypal = () => setPaymentMethod("paypal");

  // ===== Carica PayPal SDK quando serve =====
  useEffect(() => {
    if (paymentMethod !== "paypal") return;

    setPaypalError(null);

    if (!PAYPAL_CLIENT_ID) {
      console.error(
        "ENV ERROR: REACT_APP_PAYPAL_CLIENT_ID mancante. Aggiungi a .env e riavvia."
      );
      setPaypalError("Configurazione PayPal mancante. Contatta l’assistenza.");
      return;
    }

    // già caricato?
    if (window.paypal) {
      setPaypalReady(true);
      return;
    }

    // evita doppio tag
    const existing = document.querySelector<HTMLScriptElement>('script[data-pp-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", () => setPaypalReady(true));
      existing.addEventListener("error", () => {
        console.error("PayPal SDK: errore sullo script esistente");
        setPaypalError("Impossibile caricare PayPal SDK.");
      });
      return;
    }

    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      PAYPAL_CLIENT_ID
    )}&components=buttons&currency=EUR&intent=capture`;

    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    (s as any).dataset.ppSdk = "true";

    s.onload = () => setPaypalReady(true);
    s.onerror = () => {
      console.error("Impossibile caricare PayPal SDK:", src);
      setPaypalError("Impossibile caricare PayPal SDK. Verifica Client ID/ad-blocker/CSP.");
    };

    document.head.appendChild(s);
  }, [paymentMethod]);

  // ===== Render dei PayPal Buttons quando SDK pronto =====
  useEffect(() => {
    if (paymentMethod !== "paypal" || !paypalReady || !paypalButtonsContainerRef.current || submitted) return;

    // pulisci contenitore (evita doppio mount)
    paypalButtonsContainerRef.current.innerHTML = "";

    const Buttons = window.paypal?.Buttons;
    if (!Buttons) {
      console.error("window.paypal.Buttons non disponibile");
      setPaypalError("Componenti PayPal non disponibili.");
      return;
    }

    const instance = Buttons({
      style: { layout: "vertical" },

      // 1) crea ordine sul backend
      createOrder: async () => {
        const res = await fetch(`${API_BASE}/api/paypal/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountEUR.toFixed(2), currency: "EUR" }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Errore create-order (${res.status}): ${text}`);
        }
        const data = await res.json(); // { orderId }
        if (!data?.orderId) throw new Error("create-order: orderId assente");
        return data.orderId;
      },

      // 2) cattura sul backend e, se COMPLETED, conferma ordine
      onApprove: async (data: any) => {
        try {
          const res = await fetch(`${API_BASE}/api/paypal/capture-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Errore capture-order (${res.status}): ${text}`);
          }
          const cap = await res.json();
          if (cap.status === "COMPLETED") {
            await onConfirmOrder();
          } else {
            alert("Pagamento non completato: " + cap.status);
          }
        } catch (e) {
          console.error(e);
          alert("Si è verificato un errore durante il pagamento.");
        }
      },

      onError: (err: any) => {
        console.error("PayPal Buttons error:", err);
        alert("Errore PayPal. Riprova.");
      },
    });

    instance.render(paypalButtonsContainerRef.current);

    return () => {
      try {
        instance.close();
      } catch {}
    };
  }, [paymentMethod, paypalReady, amountEUR, onConfirmOrder, submitted]);

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

  useEffect(() => {
    if (submitted) setProgress(100);
  }, [submitted]);

  const confirmDisabledCash =
    disabled || loading || submitted || paymentMethod !== "cash";

  return (
    <div className={styles["riepilogo-container"]}>
      <h3 className={styles["riepilogo-title"]}>📋 Riepilogo ordine A3</h3>
      <p className={styles["riepilogo-item"]}><strong>Numero PDF:</strong> {numeroPDF}</p>
      <p className={styles["riepilogo-item"]}><strong>Numero pagine totali:</strong> {numeroPagine}</p>
      <p className={styles["riepilogo-item"]}><strong>Grammatura:</strong> {grammatura}</p>
      <p className={styles["riepilogo-item"]}><strong>Colore:</strong> {inchiostro}</p>
      <p className={styles["riepilogo-item"]}><strong>Gestione pagina:</strong> {pagina}</p>
      <p className={styles["riepilogo-item"]}><strong>Layout:</strong> {layout}</p>
      <p className={styles["riepilogo-item"]}><strong>Plastificazione:</strong> {plastificazione}</p>
      <p className={styles["riepilogo-item"]}><strong>Numero copie:</strong> {numeroCopie}</p>
      <p className={styles["riepilogo-item"]}><strong>💰 Prezzo totale:</strong> {prezzo} €</p>

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
        </button>

        <button
          type="button"
          className={`${styles["pay-button"]} ${paymentMethod === "paypal" ? styles["selected"] : ""}`}
          onClick={handlePayPaypal}
          aria-pressed={paymentMethod === "paypal"}
        >
          🟦 PayPal
          <span className={styles["pay-subtext"]}>Paga con PayPal</span>
        </button>
      </div>

      {/* Flusso PayPal */}
      {paymentMethod === "paypal" && (
        <div className={styles["paypal-flow"]}>
          {paypalError ? (
            <p className={styles["error"]}>{paypalError}</p>
          ) : (
            <>
              <p className={styles["hint"]}>
                Completa il pagamento di <strong>{amountEUR.toFixed(2)} €</strong> con PayPal.
                Al termine l’ordine partirà automaticamente.
              </p>
              <div ref={paypalButtonsContainerRef} />
            </>
          )}
        </div>
      )}

      {/* Conferma ordine (solo contanti) */}
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

      {submitted && (
        <div className={styles.successMessage}>
          🎉 Ordine inviato con successo!
        </div>
      )}
    </div>
  );
};

export default RiepilogoOrdineA3;
