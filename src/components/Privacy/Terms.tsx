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
      <h1 style={h1Style}>Termini e Condizioni d’Uso</h1>
      <div style={metaStyle}>Ultimo aggiornamento: 30 settembre 2025</div>

      <section style={card}>
        <h2 style={h2Style}>1. Informazioni sul Titolare</h2>
        <p style={pStyle}><strong>Nome commerciale:</strong> Photo &amp; Vision</p>
        <p style={pStyle}><strong>Sede legale:</strong> [inserisci indirizzo]</p>
        <p style={pStyle}><strong>P.IVA / C.F.:</strong> [inserisci P.IVA/C.F.]</p>
        <p style={pStyle}><strong>Email di contatto:</strong> [tua mail ufficiale]</p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>2. Oggetto del Sito</h2>
        <p style={pStyle}>
          Photo &amp; Vision offre servizi di stampa documenti (A4, A3, plastificazione, rilegatura),
          stampa 3D, produzione foto e video, sviluppo e gestione siti web, e strumenti digitali
          personalizzati (es. QR Code, template).
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>3. Registrazione e Account</h2>
        <ul style={ulStyle}>
          <li>Alcuni servizi richiedono la creazione di un account personale.</li>
          <li>L’utente è responsabile della veridicità dei dati forniti e della custodia delle credenziali.</li>
          <li>Photo &amp; Vision può sospendere/chiudere account in caso di uso improprio o violazioni.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>4. Proprietà Intellettuale</h2>
        <p style={pStyle}>
          Contenuti, marchi, loghi, testi, foto, video, grafiche e software presenti sul sito sono
          protetti e appartengono a Photo &amp; Vision o ai rispettivi autori. È vietata
          la riproduzione o distribuzione senza consenso scritto.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>5. Ordini e Pagamenti</h2>
        <ul style={ulStyle}>
          <li>Gli ordini online diventano vincolanti alla conferma sul sito.</li>
          <li>I prezzi sono in euro e si intendono comprensivi di IVA salvo diversa indicazione.</li>
          <li>I pagamenti avvengono secondo le modalità indicate (es. contanti al ritiro, bonifico, sistemi online).</li>
          <li>Photo &amp; Vision può rifiutare ordini con dati incompleti, non corretti o sospetti.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>6. Servizi Personalizzati</h2>
        <p style={pStyle}>
          I servizi di stampa e personalizzazione sono realizzati su richiesta del cliente. Per tali prodotti
          non si applica il diritto di recesso (art. 59 Codice del Consumo). In caso di difetti imputabili a
          Photo &amp; Vision, il cliente ha diritto a sostituzione o rimborso.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>7. Limitazioni di Responsabilità</h2>
        <ul style={ulStyle}>
          <li>Il sito è fornito “così com’è”, senza garanzia di assenza di errori o interruzioni.</li>
          <li>Esclusa responsabilità per malfunzionamenti dovuti a forza maggiore, terzi o uso improprio.</li>
          <li>Vietato caricare contenuti illeciti, offensivi o lesivi di diritti di terzi.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2Style}>8. Privacy e Cookie</h2>
        <p style={pStyle}>
          Il trattamento dei dati personali è disciplinato dalla <a href="/privacy">Privacy Policy</a>.
          L’uso dei cookie è regolato dalla <a href="/cookie-policy">Cookie Policy</a>.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>9. Modifiche ai Termini</h2>
        <p style={pStyle}>
          Photo &amp; Vision può aggiornare i presenti Termini in qualunque momento. Le modifiche si
          applicano dalla pubblicazione sul sito.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2Style}>10. Legge Applicabile e Foro Competente</h2>
        <p style={pStyle}>
          Le presenti condizioni sono regolate dalla legge italiana. Foro competente esclusivo:
          <strong> [comune sede legale]</strong>.
        </p>
      </section>
    </main>
  );
}
