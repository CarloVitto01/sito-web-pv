import classes from "./Intro.module.css";
import React from "react";

const Intro = () => {
  return (
    <div className={classes["container"]}>
      <h1 className={classes["title"]}>STAMPA IL TUO DOCUMENTO</h1>
      <p className={classes["text"]}>
        In questa pagina potrai ordinare la stampa del tuo documento, inserisci
        le caratteristiche disponibili nelle varie sezioni per poter avere dei
        documenti cartacei di qualità. Photo and Vision utilizza una carta da 80
        gr/m² in formato A4. Le opzioni di pagamento saranno fornite una volta
        che avrai confermato il tuo ordine. Il costo totale dell'ordine potrebbe
        subire delle variazioni dovute ai costi di spedizione.
      </p>
    </div>
  );
};

export default React.memo(Intro);
