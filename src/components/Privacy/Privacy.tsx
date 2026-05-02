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
        <p className={styles.meta}>Ultimo aggiornamento: 25/02/2026</p>

        <section className={styles.section}>
          <h2>Titolare del trattamento</h2>
          <p>
            <strong>Photo &amp; Vision</strong>
            <br />
            <strong>Sede:</strong> Via Colonello Gino Chiriatti, 19 — 73025, Martano (LE), Italia
            <br />
            <strong>Email:</strong> pv.photoandvision@gmail.com
            <br />
            <strong>P.IVA / CF:</strong> 05433670758
          </p>
        </section>

        <section className={styles.section}>
          <h2>Ambito di applicazione</h2>
          <p>
            La presente informativa descrive il trattamento dei dati personali effettuato da Photo &amp; Vision
            in relazione al servizio di <strong>stampa PDF</strong> in formato <strong>A4</strong> e <strong>A3</strong>,
            richiesto tramite questo sito.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Quali dati trattiamo</h2>
          <ul>
            <li>
              <strong>Dati di contatto</strong>: nome e cognome, email, telefono (se fornito).
            </li>
            <li>
              <strong>Dati di ordine</strong>: formato (A4/A3), quantità, impostazioni di stampa, eventuali note e preferenze,
              metodo di consegna/ritiro e indirizzo (solo se necessario per la consegna).
            </li>
            <li>
              <strong>File PDF caricati</strong>: il documento che invii per la stampa (contenuto incluso).
            </li>
            <li>
              <strong>Dati tecnici</strong>: log applicativi e di sicurezza (es. indirizzo IP, user-agent, data/ora accesso),
              cookie tecnici.
            </li>
            <li>
              <strong>Pagamenti</strong>: se utilizzi fornitori di pagamento, Photo &amp; Vision riceve solo l’esito della transazione
              e i riferimenti necessari alla gestione amministrativa (non i dati completi della carta).
            </li>
            <li>
              <strong>Comunicazioni</strong>: eventuali messaggi inviati tramite form o email relativi all’ordine.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Finalità e basi giuridiche</h2>
          <ul>
            <li>
              <strong>Gestione della richiesta e dell’ordine di stampa (A4/A3)</strong> — <em>contratto/misure precontrattuali</em>.
            </li>
            <li>
              <strong>Adempimenti amministrativi e fiscali</strong> — <em>obbligo di legge</em>.
            </li>
            <li>
              <strong>Sicurezza del servizio e prevenzione abusi</strong> — <em>legittimo interesse</em>.
            </li>
            <li>
              <strong>Comunicazioni strettamente operative</strong> (stato ordine, chiarimenti sui file) — <em>contratto</em>.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Dove conserviamo i dati</h2>
          <ul>
            <li>
              <strong>Infrastruttura</strong>: dati e file sono conservati su infrastruttura proprietaria (NAS/Server) situata in UE/Italia.
            </li>
            <li>
              <strong>Backup</strong>: copie di sicurezza possono essere generate per garantire continuità e ripristino.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Tempi di conservazione</h2>
          <ul>
            <li>
              <strong>Ordini e documentazione amministrativo-contabile</strong>: fino a <strong>10 anni</strong> (obblighi di legge).
            </li>
            <li>
              <strong>File PDF caricati per la stampa</strong>: di norma fino a <strong>90 giorni</strong> dalla consegna/chiusura ordine
              (per eventuali ristampe, assistenza o contestazioni), salvo richiesta di cancellazione anticipata quando possibile.
            </li>
            <li>
              <strong>Log tecnici e di sicurezza</strong>: normalmente <strong>6–12 mesi</strong>, salvo necessità di sicurezza o indagini su abusi.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Destinatari dei dati</h2>
          <p>
            I dati sono trattati da personale autorizzato e, se necessario, condivisi solo con fornitori che supportano
            l’erogazione del servizio (es. hosting/infrastruttura, provider email, fornitori di pagamento), nominati
            ove richiesto come responsabili del trattamento.
          </p>
          <ul>
            <li>
              <strong>Infrastruttura IT</strong>: gestione server/NAS e manutenzione tecnica (UE/Italia).
            </li>
            <li>
              <strong>Pagamenti</strong>: fornitori di pagamento (noi non trattiamo i dati completi della carta).
            </li>
            <li>
              <strong>Email</strong>: provider email/SMTP per comunicazioni operative.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Trasferimenti extra-UE</h2>
          <p>
            In linea generale il servizio è gestito su infrastruttura in UE/Italia. Qualora alcuni fornitori coinvolti
            trattassero dati fuori dallo SEE, adotteremo garanzie adeguate (es. <em>Standard Contractual Clauses</em>) e limiteremo
            i dati allo stretto necessario.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Diritti dell’interessato</h2>
          <p>
            Puoi esercitare i diritti previsti dagli artt. 15–22 GDPR (accesso, rettifica, cancellazione, limitazione,
            portabilità, opposizione) e revocare eventuali consensi, scrivendo a{" "}
            <strong>pv.photoandvision@gmail.com</strong>.
            Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Obbligatorietà del conferimento</h2>
          <p>
            I dati richiesti come obbligatori nei form sono necessari per gestire la richiesta e completare l’ordine di stampa.
            In assenza, non potremo erogare il servizio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Minori</h2>
          <p>
            Il servizio non è destinato a minori di 14 anni. Se ritieni che siano stati caricati dati di un minore,
            contattaci per la rimozione.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Sicurezza</h2>
          <ul>
            <li>Trasmissione sicura (HTTPS) e misure di protezione dell’infrastruttura.</li>
            <li>Accessi ai sistemi e ai file limitati a personale autorizzato.</li>
            <li>Backup periodici e procedure di ripristino.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Cookie</h2>
          <p>
            Usiamo cookie tecnici necessari al funzionamento del sito. Eventuali cookie non tecnici (es. terze parti / misurazione)
            saranno attivati solo previo consenso, se presenti. Leggi la nostra{" "}
            <a href="/cookie-policy">Cookie Policy</a>.
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