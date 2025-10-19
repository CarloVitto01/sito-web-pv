import React from "react";

export default function CookiePolicy() {
  return (
    <main style={{maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px", color: "var(--pv-text,#eee)"}}>
      <h1 style={{fontSize:"2rem", color:"var(--color-gold,#caa700)", textAlign:"center"}}>Cookie Policy</h1>
      <div style={{textAlign:"center", color:"#cfcfcf", marginBottom:18}}>Ultimo aggiornamento: 30 settembre 2025</div>

      <section style={{background:"var(--pv-surface,#101010)", border:"1px solid var(--pv-border,#262626)", borderRadius:16, padding:16, boxShadow:"var(--pv-shadow,0 10px 28px rgba(0,0,0,.35))"}}>
        <p style={{lineHeight:1.6}}>
          Questo sito utilizza <strong>solo cookie tecnici</strong> necessari al funzionamento (es. autenticazione, preferenze).
          Non impieghiamo cookie di profilazione o di terze parti (Analytics, social, Maps).
        </p>
        <h3 style={{color:"var(--color-gold,#caa700)"}}>Tipologie e finalità</h3>
        <ul style={{margin:"8px 0 8px 18px", lineHeight:1.6}}>
          <li><strong>Cookie tecnici di sessione</strong>: gestiscono login, sicurezza, preferenze.</li>
          <li><strong>Persistenti limitati</strong>: possono ricordare una tua scelta (es. chiusura della barra informativa).</li>
        </ul>
        <h3 style={{color:"var(--color-gold,#caa700)"}}>Gestione dal browser</h3>
        <p style={{lineHeight:1.6}}>
          Puoi bloccare o cancellare i cookie dalle impostazioni del browser. Disabilitare i cookie tecnici può compromettere alcune funzioni.
        </p>
        <h3 style={{color:"var(--color-gold,#caa700)"}}>Contatti</h3>
        <p style={{lineHeight:1.6}}>
          Titolare: Photo &amp; Vision — Email: pv.photoandvision@gmail.com — P.IVA: 05433670758 <br/>
          Per richieste sui cookie o sul trattamento dati, contattaci.
        </p>
      </section>
    </main>
  );
}
