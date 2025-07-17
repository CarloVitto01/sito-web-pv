import styles from "./RiepilogoOrdine.module.css";
import React, { useState, useEffect } from "react";

type RiepilogoProps = {
  inchiostro: string;
  pagina: string;
  layout: string;
  rilegatura: string;
  rilegaturaUnica: string;
  intervalloPagine: string;
  numeroCopie: number;
  numeroPDF: number;
  prezzo: string;
  onConfirmOrder: () => Promise<void>;
  disabled?: boolean;
  submitted?: boolean;
  loading?: boolean;
};

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
}: RiepilogoProps) => {
  const [progress, setProgress] = useState(0);
  const [/*loadingStarted*/, setLoadingStarted] = useState(false);

  const handleConfirmOrder = async () => {
    setProgress(0);
    setLoadingStarted(true);
    await onConfirmOrder();
  };

  // Simula avanzamento barra a scatti durante loading
  useEffect(() => {
    if (loading) {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 10) + 5; // scatti da 5–15
        if (current >= 90) {
          clearInterval(interval);
        } else {
          setProgress(current);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [loading]);

  // Quando ordine completato -> forza 100%
  useEffect(() => {
    if (submitted) {
      setProgress(100);
    }
  }, [submitted]);

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
      <p className={styles["riepilogo-item"]}><strong>💰 Prezzo totale:</strong> {prezzo} €</p>

      {!loading && !submitted && (
        <button
          className={styles["confirm-button"]}
          onClick={handleConfirmOrder}
          disabled={disabled}
        >
          ✅ Conferma Ordine
        </button>
      )}

      {loading && (
        <>
          <p className={styles.loadingText}>Invio in corso...</p>
          <div className={styles.loader}>
            <div
              className={styles.loaderBar}
              style={{ width: `${progress}%` }}
            />
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

export default RiepilogoOrdine;
