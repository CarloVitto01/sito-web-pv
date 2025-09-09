import React from "react";
import styles from "./TemplateLandingConversione.module.css";
import { Link } from "react-router-dom";

const TemplateLandingConversione: React.FC = () => {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.headline}>
          <h1>Converti più lead con una Landing pensata per agire</h1>
          <p>Messaggio chiaro, CTA visibili, prove sociali e velocità. Tutto il resto è rumore.</p>
          <div className={styles.actions}>
            <a href="#form" className={styles.btnPrimary}>Inizia ora</a>
            <a href="#faq" className={styles.btnGhost}>Scopri di più</a>
          </div>
          <div className={styles.trust}>
            <span>★ ★ ★ ★ ★</span> <small>4.9/5 da 120 clienti</small>
          </div>
        </div>
        <div className={styles.mock} />
      </section>

      <section className={styles.features}>
        <article><h3>Hero efficace</h3><p>Value proposition e CTA above the fold.</p></article>
        <article><h3>Social proof</h3><p>Testimonianze e loghi clienti per fiducia immediata.</p></article>
        <article><h3>CTA ripetute</h3><p>Call to action contestuali in ogni sezione.</p></article>
      </section>

      <section id="form" className={styles.formBox}>
        <h3>Richiedi una demo</h3>
        <input placeholder="Nome e cognome" />
        <input placeholder="Email" />
        <button className={styles.btnPrimary}>Invia richiesta</button>
      </section>

      <section id="faq" className={styles.faq}>
        <details><summary>Quanto è veloce la messa online?</summary><p>In genere 1–2 settimane, dipende dai contenuti.</p></details>
        <details><summary>È ottimizzata per SEO?</summary><p>Sì, curiamo struttura, semantica e performance.</p></details>
      </section>

      <footer className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.req}>Vuoi una landing così? Parliamone →</Link>
      </footer>
    </div>
  );
};

export default TemplateLandingConversione;
