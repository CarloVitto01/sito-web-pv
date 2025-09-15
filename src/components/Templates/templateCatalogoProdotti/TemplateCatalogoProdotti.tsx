import React from "react";
import styles from "./TemplateCatalogoProdotti.module.css";
import { Link } from "react-router-dom";

const TemplateCatalogoProdotti: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>CATALOGO</div>
        <div className={styles.filters}>
          <select><option>Tutte le categorie</option></select>
          <select><option>Ordina per: Popolari</option></select>
        </div>
      </header>

      <section className={styles.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <article key={i} className={styles.card}>
            <div className={styles.thumb} />
            <h3>Prodotto {i + 1}</h3>
            <p className={styles.desc}>Descrizione breve del prodotto.</p>
            <div className={styles.row}>
              <button className={styles.btn}>Richiedi preventivo</button>
              <button className={styles.link}>Dettagli</button>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.cta}>Vuoi un catalogo così? →</Link>
      </footer>
    </div>
  );
};

export default TemplateCatalogoProdotti;
