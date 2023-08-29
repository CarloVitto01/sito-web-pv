import classes from "./Intro.module.css";

const Intro = () => {
  return (
    <div>
      <h1 className={classes["title"]}>STAMPA IL TUO DOCUMENTO</h1>
      <p className={classes["text"]}>
        In questa pagina potrai ordinare la stampa del tuo documento, inserisci
        le caratteristiche disponibili nelle varie sezioni per poter avere dei
        documenti cartacei di qualità. <br />
        Photo and Vision utilizza una carta da 80 gr/m² in formato A4. <br />
        Le opzioni di pagamento saranno fornite una volta che avrai confermato
        il tuo ordine.
      </p>
    </div>
  );
};

export default Intro;