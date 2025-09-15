import React from "react";
import styles from "./TemplateBlogMagazine.module.css";
import { Link } from "react-router-dom";

const TemplateBlogMagazine: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>INSIGHT</div>
        <nav className={styles.nav}>
          <a href="#tech">Tech</a>
          <a href="#design">Design</a>
          <a href="#business">Business</a>
        </nav>
        <input className={styles.search} placeholder="Cerca articoli…" />
      </header>

      <section className={styles.hero}>
        <article className={styles.feature}>
          <div className={styles.thumb} />
          <div className={styles.meta}>
            <span className={styles.kicker}>In evidenza</span>
            <h1>Come progettare interfacce che convertono</h1>
            <p>Una guida pratica su gerarchia, ritmo tipografico e CTA efficaci.</p>
          </div>
        </article>
      </section>

      <section className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <article key={i} className={styles.card}>
            <div className={styles.cardThumb} />
            <h3>Articolo #{i + 1}</h3>
            <p className={styles.excerpt}>Snippet introduttivo dell’articolo per incuriosire il lettore.</p>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.cta}>Vuoi un blog così? →</Link>
      </footer>
    </div>
  );
};

export default TemplateBlogMagazine;
