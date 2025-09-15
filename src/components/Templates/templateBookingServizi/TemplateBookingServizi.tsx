import React from "react";
import styles from "./TemplateBookingServizi.module.css";
import { Link } from "react-router-dom";

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const slots = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30"];

const TemplateBookingServizi: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>BOOK.ME</div>
        <nav className={styles.nav}>
          <a href="#services">Servizi</a>
          <a href="#calendar">Calendario</a>
          <a href="#contact">Contatti</a>
        </nav>
      </header>

      <section id="services" className={styles.services}>
        <article><h3>Consulenza</h3><p>Sessione 60’ – online o in sede.</p></article>
        <article><h3>Sessione Pro</h3><p>Pacchetto 3 incontri, report incluso.</p></article>
        <article><h3>Workshop</h3><p>Mezza giornata, fino a 8 persone.</p></article>
      </section>

      <section id="calendar" className={styles.calendar}>
        <div className={styles.week}>
          {days.map(d => <div key={d} className={styles.day}>{d}</div>)}
        </div>
        <div className={styles.slots}>
          {slots.map(h => <button key={h} className={styles.slot}>{h}</button>)}
        </div>
        <div className={styles.note}>* Demo: slot non interattivi (solo anteprima)</div>
      </section>

      <footer id="contact" className={styles.footer}>
        <Link to="/richiesta-sito-web" className={styles.cta}>Vuoi un sistema di booking così? →</Link>
      </footer>
    </div>
  );
};

export default TemplateBookingServizi;
