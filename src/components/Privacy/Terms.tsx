// src/components/Privacy/Terms.tsx
import React from "react";

const wrapper: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "24px 16px 60px",
  color: "var(--pv-text, #eee)",
};

const h1Style: React.CSSProperties = {
  fontSize: "2rem",
  marginBottom: 8,
  color: "var(--color-gold, #caa700)",
  textAlign: "center",
};

const metaStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#cfcfcf",
  marginBottom: 18,
};

const card: React.CSSProperties = {
  background: "var(--pv-surface, #101010)",
  border: "1px solid var(--pv-border, #262626)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "var(--pv-shadow, 0 10px 28px rgba(0,0,0,0.35))",
  marginBottom: 16,
};

const h2Style: React.CSSProperties = {
  fontSize: "1.2rem",
  marginBottom: 8,
  color: "var(--color-gold, #caa700)",
};

const pStyle: React.CSSProperties = { lineHeight: 1.6, margin: "8px 0" };
const ulStyle: React.CSSProperties = { margin: "8px 0 8px 18px", lineHeight: 1.6 };

export default function Terms() {
  return (
    <main style={wrapper}>
      <h1 style={h1Style}>Termini e Condizioni – Servizio Stampa PDF A4/A3</h1>
      <div style={metaStyle}>Ultimo aggiornamento: 25 febbraio 2026</div>

      <section style={card}>
        <h2 style={h2Style}>1. Informazioni sul Titolare</h2>
        <p style={pStyle}><strong>Nome commerciale:</strong> Photo &amp; Vision</p>
        <p style={pStyle}><strong>Sede legale:</strong> Via Colonello Gino Chiriatti 19, 73025 Martano (LE)</p>
        <p style={pStyle}><strong>P.IVA:</strong> 05433670758</p>
        <p style={pStyle}><strong>Email:</strong> pv.photoandvision@gmail.com</p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>2. Oggetto del Servizio</h2>
        <p style={pStyle}>
          I presenti Termini disciplinano esclusivamente il servizio di <strong>stampa di file PDF</strong>
          nei formati <strong>A4</strong> e <strong>A3</strong>, richiesto tramite il sito Photo &amp; Vision.
        </p>
        <p style={pStyle}>
          Il servizio comprende la ricezione del file PDF, la configurazione delle opzioni di stampa
          (formato, quantità, eventuali preferenze) e la produzione materiale delle copie richieste.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>3. Modalità di Ordine</h2>
        <ul style={ulStyle}>
          <li>L’ordine si considera concluso al momento della conferma da parte del cliente tramite il sito o accordo diretto.</li>
          <li>Il cliente è responsabile della correttezza del file PDF caricato (formato, impaginazione, contenuti).</li>
          <li>Photo &amp; Vision non effettua modifiche ai contenuti salvo esplicita richiesta.</li>
          <li>Ordini con dati incompleti o file danneggiati potranno essere sospesi fino a chiarimento.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>4. Prezzi e Pagamenti</h2>
        <ul style={ulStyle}>
          <li>I prezzi sono espressi in euro e si intendono comprensivi di IVA salvo diversa indicazione.</li>
          <li>Le modalità di pagamento sono indicate al momento dell’ordine (es. pagamento online, contanti al ritiro, bonifico).</li>
          <li>Photo &amp; Vision si riserva il diritto di non avviare la stampa in assenza di pagamento ove richiesto anticipatamente.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>5. Responsabilità sui Contenuti</h2>
        <p style={pStyle}>
          Il cliente garantisce di avere il diritto di utilizzare e stampare i contenuti caricati.
          È vietato inviare file contenenti materiale illecito, offensivo, diffamatorio o in violazione
          di diritti di terzi.
        </p>
        <p style={pStyle}>
          Photo &amp; Vision può rifiutare la stampa di contenuti ritenuti non conformi alla legge.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>6. Prodotti Personalizzati e Diritto di Recesso</h2>
        <p style={pStyle}>
          La stampa PDF A4/A3 è un servizio personalizzato realizzato su richiesta specifica del cliente.
          Ai sensi dell’art. 59 del Codice del Consumo, non si applica il diritto di recesso.
        </p>
        <p style={pStyle}>
          In caso di errore di stampa imputabile a Photo &amp; Vision, il cliente ha diritto alla ristampa
          o al rimborso.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>7. Tempi di Esecuzione</h2>
        <p style={pStyle}>
          I tempi di stampa e consegna/ritiro dipendono dal volume dell’ordine e dalla disponibilità tecnica.
          Eventuali tempistiche indicative non costituiscono termine essenziale salvo diverso accordo scritto.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>8. Limitazione di Responsabilità</h2>
        <ul style={ulStyle}>
          <li>Photo &amp; Vision non è responsabile per errori presenti nel file originale fornito dal cliente.</li>
          <li>Non è responsabile per differenze minime di resa cromatica dovute ai processi di stampa.</li>
          <li>È esclusa responsabilità per ritardi dovuti a cause di forza maggiore o a problemi tecnici non prevedibili.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>9. Privacy</h2>
        <p style={pStyle}>
          Il trattamento dei dati personali è disciplinato dalla{" "}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>10. Modifiche ai Termini</h2>
        <p style={pStyle}>
          Photo &amp; Vision può aggiornare i presenti Termini in qualsiasi momento.
          Le modifiche si applicano dalla pubblicazione sul sito.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>11. Legge Applicabile e Foro Competente</h2>
        <p style={pStyle}>
          Le presenti condizioni sono regolate dalla legge italiana.
          Foro competente: <strong>Lecce</strong>.
        </p>
      </section>
    </main>
  );
}