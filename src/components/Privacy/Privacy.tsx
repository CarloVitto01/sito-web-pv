import React from "react";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import styles from "./Privacy.module.css";

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <h1>Informativa Privacy</h1>
        <p className={styles.meta}>Ultimo aggiornamento: 27/09/2025</p>

        <section className={styles.section}>
          <h2>Titolare del trattamento</h2>
          <p>
            <strong>Photo & Vision</strong><br />
            <strong>Sede:</strong> Via Colonello Gino Chiriatti, 19 — 73025, Martano (Le), Italia <br />
            <strong>Email:</strong> pv.photoandvision@gmail.com <br />
            <strong>P.IVA / CF:</strong> 05433670758
          </p>
        </section>

        <section className={styles.section}>
          <h2>Che dati trattiamo</h2>
          <ul>
            <li><strong>Dati account</strong>: nome, cognome, email, telefono, ruolo (es. PublicUser/admin).</li>
            <li><strong>Dati ordine/servizio</strong>: indirizzo, preferenze di stampa, note progetto, storico richieste.</li>
            <li><strong>File caricati</strong>: PDF/A4-A3, immagini, STL/OBJ/3MF, ZIP (per stampe e 3D). I file sono salvati sul nostro NAS/Server.</li>
            <li><strong>PV-Drive</strong>: file e cartelle che carichi/gestisci nel tuo spazio (restano finché li mantieni o chiudi l’account).</li>
            <li><strong>Pagamenti</strong>: gestiti da Stripe (noi riceviamo solo esito/transazione, non i numeri della carta).</li>
            <li><strong>Comunicazioni</strong>: messaggi via form, email, e bot Telegram collegati alle pagine del sito.</li>
            <li><strong>Dati tecnici</strong>: log applicativi, indirizzo IP, user-agent, orario di accesso, cookie tecnici.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Finalità e basi giuridiche</h2>
          <ul>
            <li><strong>Gestione richieste/ordini/preventivi</strong> (A4/A3, 3D, foto/video, siti web) — <em>contratto/misure precontrattuali</em>.</li>
            <li><strong>Fatturazione e adempimenti fiscali</strong> — <em>obbligo di legge</em>.</li>
            <li><strong>PV-Drive e spazio file</strong> — erogazione del servizio — <em>contratto</em>.</li>
            <li><strong>Sicurezza, prevenzione abusi e difesa in giudizio</strong> — <em>legittimo interesse</em>.</li>
            <li><strong>Comunicazioni promozionali</strong> (solo se spunti l’apposito consenso) — <em>consenso</em>.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Dove conserviamo i dati e per quanto tempo</h2>
          <ul>
            <li><strong>Server/NAS</strong>: dati e file sono conservati su infrastruttura proprietaria (Synology/NAS + mini-PC Linux) situata in UE/Italia.</li>
            <li><strong>Ordini e documenti fiscali</strong>: fino a <strong>10 anni</strong> (obblighi di legge).</li>
            <li><strong>File caricati per stampe/3D</strong>: per default <strong>90 giorni</strong> (per rifacimenti/contestazioni), salvo diverso accordo o tua richiesta di cancellazione anticipata.</li>
            <li><strong>PV-Drive</strong>: fino a cancellazione da parte tua o chiusura dell’account.</li>
            <li><strong>Log tecnici</strong>: normalmente <strong>6–12 mesi</strong>, salvo esigenze di sicurezza.</li>
            <li><strong>Consensi</strong>: finché resta attivo, revocabile in qualsiasi momento.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Destinatari e fornitori (responsabili del trattamento)</h2>
          <p>Condividiamo dati solo con fornitori che ci aiutano a erogare il servizio, nominati ove necessario come responsabili:</p>
          <ul>
            <li><strong>Infrastruttura</strong>: NAS Synology / server Linux (UE/Italia).</li>
            <li><strong>Cloud e sviluppo</strong>: Google/Firebase (se e dove ancora in uso durante la migrazione), per auth/DB/storage/log — possibili trasferimenti extra-UE con SCC.</li>
            <li><strong>Rete e CDN</strong>: Cloudflare/Tunnel per pubblicazione sicura dei servizi.</li>
            <li><strong>Pagamenti</strong>: Stripe (noi non trattiamo i dati di carta).</li>
            <li><strong>Messaggistica</strong>: Telegram Bot per recapito interno di richieste (evitiamo di inviare dati non necessari).</li>
            <li><strong>Email</strong>: provider email/SMTP.</li>
          </ul>
          <p>La lista può aggiornarsi nel tempo: versioni aggiornate saranno pubblicate qui.</p>
        </section>

        <section className={styles.section}>
          <h2>Trasferimenti extra-UE</h2>
          <p>
            Alcuni fornitori possono trattare dati fuori dallo SEE. In questi casi adottiamo garanzie adeguate
            (es. <em>Standard Contractual Clauses</em>). Per Telegram e taluni servizi cloud, limitiamo i dati personali trasmessi
            allo stretto necessario.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Diritti dell’interessato</h2>
          <p>
            Puoi esercitare in qualsiasi momento i diritti di accesso, rettifica, cancellazione, limitazione, portabilità,
            opposizione e revoca del consenso. Scrivi a <strong>[email ufficiale privacy]</strong>. Hai diritto a reclamo al
            Garante (garanteprivacy.it).
          </p>
        </section>

        <section className={styles.section}>
          <h2>Obbligatorietà del conferimento</h2>
          <p>
            I dati contrassegnati come obbligatori nei form sono necessari per evadere richieste e ordini.
            In assenza, non potremo fornire il servizio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Minori</h2>
          <p>
            I servizi non sono destinati a minori di 14 anni. Se ritieni ci siano dati di un minore, contattaci
            per rimozione immediata.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Sicurezza</h2>
          <ul>
            <li>Accessi autenticati (JWT/ruoli) e registrazione degli accessi al pannello.</li>
            <li>Trasmissione sicura (HTTPS/Cloudflare); backup periodici su NAS.</li>
            <li>Policy di accesso ai file (es. PDF ordini, modelli 3D) limitate a personale autorizzato.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Cookie</h2>
          <p>
            Usiamo cookie tecnici necessari al funzionamento del sito. Eventuali cookie di terze parti o di profilazione
            saranno caricati solo previo consenso. Leggi la nostra <a href="/cookie-policy">Cookie Policy</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Modifiche</h2>
          <p>
            Potremmo aggiornare questa informativa per adeguamenti normativi o tecnici. La versione corrente è sempre pubblicata su questa pagina.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
