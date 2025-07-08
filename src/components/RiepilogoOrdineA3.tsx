// src/components/RiepilogoOrdineA3.tsx
import styles from "./RiepilogoOrdine.module.css";
import React from "react";

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
  
  onConfirmOrder: () => void; // nuova prop
  disabled?: boolean; // opzionale, per disabilitare il pulsante
  loading?: boolean;  // opzionale, per indicare stato invio
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
}: RiepilogoA3Props) => {
  return (
    <div className={styles["riepilogo-container"]}>
      <h3 className="riepilogo-title">📋 Riepilogo ordine A3</h3>
      <p className="riepilogo-item"><strong>Numero PDF:</strong> {numeroPDF}</p>
      <p className="riepilogo-item"><strong>Numero pagine totali:</strong> {numeroPagine}</p>
      <p className="riepilogo-item"><strong>Grammatura:</strong> {grammatura}</p>
      <p className="riepilogo-item"><strong>Inchiostro:</strong> {inchiostro}</p>
      <p className="riepilogo-item"><strong>Gestione pagina:</strong> {pagina}</p>
      <p className="riepilogo-item"><strong>Layout:</strong> {layout}</p>
      <p className="riepilogo-item"><strong>Plastificazione:</strong> {plastificazione}</p>
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

export default RiepilogoOrdineA3;
