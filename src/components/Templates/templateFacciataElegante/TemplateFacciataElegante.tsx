import React from "react";
import styles from "./TemplateFacciataElegante.module.css";
import { Link } from "react-router-dom";

const TemplateFacciataElegante: React.FC = () => {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.brand}>Maison Aurora</div>
        <div className={styles.links}>
          <a href="#servizi">Servizi</a>
          <a href="#studio">Studio</a>
          <a href="#contatti">Contatti</a>
        </div>
        <Link to="/richiesta-sito-web" className={styles.cta}>Richiedi Preventivo</Link>
      </nav>

      <header className={styles.hero}>
        <h1>Eleganza su misura per il tuo brand</h1>
        <p>
          Design essenziale, tipografia raffinata e una navigazione fluida per raccontare la tua identità con stile.
        </p>
        <div className={styles.heroActions}>
          <a href="#servizi" className={styles.btnPrimary}>Scopri i servizi</a>
          <a href="#contatti" className={styles.btnGhost}>Contattaci</a>
        </div>
      </header>

      <section id="servizi" className={styles.services}>
        <article>
          <h3>Consulenza</h3>
          <p>Analisi obiettivi, pubblico e tono di voce per definire la struttura ideale.</p>
        </article>
        <article>
          <h3>Design</h3>
          <p>Layout su griglia, colori armonici e micro-animazioni per una UX impeccabile.</p>
        </article>
        <article>
          <h3>Sviluppo</h3>
          <p>Codebase solida, performance e SEO tecnico per posizionarti al meglio.</p>
        </article>
      </section>

      <section id="studio" className={styles.studio}>
        <div className={styles.card}>
          <h4>Filosofia</h4>
          <p>Less, but better. Ogni elemento ha una funzione e un ritmo visivo definito.</p>
        </div>
        <div className={styles.card}>
          <h4>Processo</h4>
          <p>Discovery → Wireframe → UI → Sviluppo → QA → Go-Live → Ottimizzazioni.</p>
        </div>
      </section>

      <footer id="contatti" className={styles.footer}>
        <p>© {new Date().getFullYear()} Maison Aurora • Via Roma 123, Milano • +39 02 123 456</p>
      </footer>
    </div>
  );
};

export default TemplateFacciataElegante;
