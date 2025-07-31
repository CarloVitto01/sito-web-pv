import styles from "./RiepilogoOrdine.module.css";
import { useEffect, useState } from "react";

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
  onConfirmOrder: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  submitted?: boolean;
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
}: RiepilogoA3Props) => {
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
          <p className={styles.loadingText}>Invio in corso: attendere il completamento della barra.</p>
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


export default RiepilogoOrdineA3;
