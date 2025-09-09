import React from "react";
import styles from "./TemplatePortfolioCreativo.module.css";
import { Link } from "react-router-dom";

const TemplatePortfolioCreativo: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>Studio NXT</div>
        <nav className={styles.nav}>
          <a href="#works">Works</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className={styles.hero}>
        <h1>Design che parla, esperienze che restano.</h1>
        <p>UI/UX • Branding • Motion</p>
      </section>

      <section id="works" className={styles.masonry}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={styles.tile} />
        ))}
      </section>

      <section id="about" className={styles.about}>
        <h3>Chi siamo</h3>
        <p>Un team snello di designer e developer. Amanti dei dettagli, ossessionati dalla coerenza.</p>
      </section>

      <footer id="contact" className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.cta}>Vuoi un portfolio così? →</Link>
      </footer>
    </div>
  );
};

export default TemplatePortfolioCreativo;
