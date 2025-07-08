// src/components/RiepilogoOrdine.tsx
import styles from "./RiepilogoOrdine.module.css";
import React from "react";

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
  onConfirmOrder: () => void; // nuova prop
  disabled?: boolean; // opzionale, per disabilitare il pulsante
  loading?: boolean;  // opzionale, per indicare stato invio
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
  loading = false,
}: RiepilogoProps) => {
  return (
    <div className={styles["riepilogo-container"]}>
      <h3 className="riepilogo-title">📋 Riepilogo ordine</h3>
      <p className="riepilogo-item"><strong>Numero PDF:</strong> {numeroPDF}</p>
      <p className="riepilogo-item"><strong>Inchiostro:</strong> {inchiostro}</p>
      <p className="riepilogo-item"><strong>Layout:</strong> {layout}</p>
      <p className="riepilogo-item"><strong>Gestione pagina:</strong> {pagina}</p>
      <p className="riepilogo-item"><strong>Rilegatura:</strong> {rilegatura}</p>
      <p className="riepilogo-item"><strong>Rilegatura unica:</strong> {rilegaturaUnica}</p>
      <p className="riepilogo-item"><strong>Intervallo pagine:</strong> {intervalloPagine}</p>
      <p className="riepilogo-item"><strong>Numero copie:</strong> {numeroCopie}</p>
      <p className="riepilogo-item"><strong>💰 Prezzo totale:</strong> {prezzo} €</p>

      <button
        className={styles["confirm-button"]}
        onClick={onConfirmOrder}
        disabled={disabled}
      >
        {loading ? "Invio in corso..." : "✅ Conferma Ordine"}
      </button>
    </div>
  );
};

export default RiepilogoOrdine;
