import React from "react";
import styles from "./TemplateEcommerceEssenziale.module.css";
import { Link } from "react-router-dom";

const TemplateEcommerceEssenziale: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.logo}>PURE STORE</div>
        <input className={styles.search} placeholder="Cerca prodotti…" />
        <div className={styles.actions}>
          <a href="#">Account</a>
          <a href="#">Carrello (2)</a>
        </div>
      </header>

      <section className={styles.hero}>
        <h1>Nuova Collezione S/S</h1>
        <p>Materiali sostenibili, linee essenziali. Spedizione gratuita da 49€.</p>
        <a className={styles.cta} href="#catalogo">Vai al catalogo</a>
      </section>

      <section id="catalogo" className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <article key={i} className={styles.card}>
            <div className={styles.thumb} />
            <h3>Prodotto {i + 1}</h3>
            <span className={styles.price}>€ {(i + 1) * 25},00</span>
            <div className={styles.row}>
              <button className={styles.btn}>Aggiungi</button>
              <button className={styles.link}>Dettagli</button>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.req}>Vuoi un e-commerce così? Chiedi un preventivo →</Link>
      </footer>
    </div>
  );
};

export default TemplateEcommerceEssenziale;
