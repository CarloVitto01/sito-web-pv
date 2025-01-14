/*import classes from "./Intro.module.css";
import React from "react";

const Intro = () => {
  return (
    <div className={classes["container"]}>
      <h1 className={classes["title"]}>STAMPA I TUI DOCUMENTI</h1>
      <p className={classes["text"]}>
        In questa pagina potrai ordinare la stampa del tuo documento, inserisci
        le caratteristiche disponibili nelle varie sezioni per poter avere dei
        documenti cartacei di qualità.
      </p>
    </div>
  );
};

export default React.memo(Intro);
*/
import React from "react";
import classes from "./Intro.module.css";

// Definizione dell'interfaccia per le props
interface IntroProps {
  title: string;
  text: string;
}

const Intro: React.FC<IntroProps> = ({ title, text }) => {
  return (
    <div className={classes["container"]}>
      <h1 className={classes["title"]}>{title}</h1>
      <p className={classes["text"]}>{text}</p>
    </div>
  );
};

export default React.memo(Intro);
