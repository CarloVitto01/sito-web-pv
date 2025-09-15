import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  TOKENSVILUPPO,
  CHAT_IDSVILUPPO,
} from "../../backend/telegram";

import styles from "./RichiestaSitoWeb.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";

import { TEMPLATE_LIST } from "../Templates";
import type { TemplateMeta, TemplateCategory } from "../Templates/types";

interface UserShape {
  displayName?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
}

const ALL_FEATURES = [
  "Responsive design",
  "Multilingua",
  "CMS (gestione contenuti)",
  "E-commerce (carrello/pagamenti)",
  "Booking/Prenotazioni",
  "Blog/Articoli",
  "SEO tecnica & on-page",
  "Analytics & eventi",
  "Newsletter/Email marketing",
  "Chat/Whatsapp widget",
  "API & backend personalizzato",
  "Area riservata/Admin",
  "Performance & caching",
  "Accessibilità (WCAG)",
  "GDPR cookie & privacy",
];

const STACKS = [
  "React + Next.js",
  "Vue + Nuxt",
  "WordPress + WooCommerce",
  "Shopify",
  "Spring Boot (backend) + React (frontend)",
  "Non ho preferenze",
];

const HOSTING = [
  "Synology NAS (mio)",
  "VPS/Cloud (es. Hetzner, OVH, AWS, ecc.)",
  "Hosting gestito",
  "Non so / da consigliare",
];

const RichiestaSitoWeb: React.FC = () => {
  const [userData, setUserData] = useState<UserShape | null>(null);

  // filtro elenco
  const [search, setSearch] = useState("");

  // selezioni form
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [stack, setStack] = useState(STACKS[4]); // default: Spring Boot + React per coerenza con PV
  const [hosting, setHosting] = useState(HOSTING[0]);
  const [budget, setBudget] = useState(2500);
  const [timing, setTiming] = useState("2-4 settimane");
  const [message, setMessage] = useState("");
  const [privacyOk, setPrivacyOk] = useState(false);

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMeta | null>(null);
  const [category, setCategory] = useState<TemplateCategory | "tutte">("tutte");
  const [livePreviewId, setLivePreviewId] = useState<string | null>(null);

  // Recupera utente
  useEffect(() => {
    const run = async () => {
      if (auth.currentUser) {
        const ref = doc(db, "users", auth.currentUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setUserData(snap.data() as UserShape);
      }
    };
    run();
  }, []);

  const filteredTemplates = useMemo(() => {
    return TEMPLATE_LIST.filter((t) => {
      const byCat = category === "tutte" ? true : t.category === category;
      const bySearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.short.toLowerCase().includes(search.toLowerCase()) ||
        t.features.some((f) => f.toLowerCase().includes(search.toLowerCase()));
      return byCat && bySearch;
    });
  }, [search, category]);

  const toggleFeature = (f: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const canSubmit =
    !!selectedTemplate && privacyOk && !isSending && (!!message.trim() || selectedFeatures.length > 0);

  const sendTelegram = async () => {
    if (!canSubmit) return;
    setIsSending(true);

    const u = userData || {};
    const fullMessage = `
===============================
*Richiesta Sviluppo Sito Web*
===============================

👤 *Nome:* ${u.displayName || ""} ${u.cognome || ""}
📧 *Email:* ${u.email || ""}
📞 *Telefono:* ${u.telefono || ""}

🧩 *Template scelto:* ${selectedTemplate?.title} (${selectedTemplate?.category})
📄 *Pagine incluse di base:* ${selectedTemplate?.pagesIncluded.join(", ")}

🧰 *Funzionalità richieste:*
${selectedFeatures.length ? "• " + selectedFeatures.join("\n• ") : "(non specificate)"}

🧪 *Stack preferito:* ${stack}
🖥️ *Hosting:* ${hosting}
💶 *Budget indicativo:* € ${budget}
⏱️ *Tempistiche desiderate:* ${timing}

💬 *Messaggio/Note:*
${message || "(nessun messaggio)"}    
    `;

    try {
      await fetch(`https://api.telegram.org/bot${TOKENSVILUPPO}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_IDSVILUPPO,
          text: fullMessage,
          parse_mode: "Markdown",
        }),
      });
      setIsSent(true);
      // reset parziale (mantieni filtraggio/ricerca)
      setSelectedTemplate(null);
      setSelectedFeatures([]);
      setStack(STACKS[4]);
      setHosting(HOSTING[0]);
      setBudget(2500);
      setTiming("2-4 settimane");
      setMessage("");
      setPrivacyOk(false);
    } catch (e) {
      console.error("Errore invio Telegram:", e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <section className={styles.intro}>
          <h1>Richiesta sviluppo siti internet</h1>
          <p className={styles.subtitle}>
            Scegli un template di partenza, seleziona le funzionalità e inviaci la tua richiesta: ti risponderemo con una
            proposta su misura.
          </p>
        </section>

        {/* Filtro & ricerca */}
        <section className={styles.filters}>
          <div className={styles.filterRow}>
            <div className={styles.field}>
              <label>Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className={styles.select}
              >
                <option value="tutte">Tutte</option>
                <option value="facciata">Facciata</option>
                <option value="ecommerce">E-commerce</option>
                <option value="portfolio">Portfolio</option>
                <option value="blog">Blog</option>
                <option value="booking">Booking</option>
                <option value="catalogo">Catalogo</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Cerca</label>
              <input
                className={styles.input}
                placeholder="Cerca template o funzionalità…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Template gallery */}
        <section className={styles.showcase}>
          <h2>Template di partenza</h2>
          <div className={styles.grid}>
            {filteredTemplates.map((t) => {
              const active = selectedTemplate?.id === t.id;
              return (
                <div key={t.id} className={`${styles.card} ${active ? styles.cardActive : ""}`}>
                  {/* preview non cliccabile (modale rimossa) */}
                  <div className={styles.previewWrap}>
                    <div className={styles.previewInner}>
                      {t.component ? (
                        <React.Suspense fallback={<div className={styles.liveFallback}>Caricamento anteprima…</div>}>
                          {(() => {
                            const Demo = t.component;
                            return <Demo />;
                          })()}
                        </React.Suspense>
                      ) : (
                        <img src={t.preview} alt={t.title} />
                      )}
                    </div>
                  </div>



                  <div className={styles.cardBody}>
                    <div className={styles.cardHead}>
                      <h3>{t.title}</h3>
                      <span className={styles.badge}>{t.category}</span>
                    </div>
                    <p className={styles.cardText}>{t.short}</p>
                    <div className={styles.pills}>
                      {t.features.slice(0, 4).map((f) => (
                        <span key={f} className={styles.pill}>{f}</span>
                      ))}
                    </div>

                    <div className={styles.cardActions}>
                      {/* Apri anteprima in nuova scheda */}
                      <a
                        className={`${styles.button} ${styles.ghost}`}
                        href={t.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Apri anteprima in una nuova scheda"
                      >
                        Apri anteprima
                      </a>

                      <button
                        className={styles.button}
                        onClick={() => setSelectedTemplate(t)}
                      >
                        {active ? "Selezionato ✓" : "Seleziona"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredTemplates.length && (
              <div className={styles.empty}>Nessun template trovato. Prova a cambiare filtri o ricerca.</div>
            )}
          </div>
        </section>

        {/* Configurazione funzionalità */}
        <section className={styles.config}>
          <h2>Configura il tuo progetto</h2>

          <div className={styles.formGrid}>
            <div className={styles.formCol}>
              <div className={styles.field}>
                <label>Funzionalità</label>
                <div className={styles.checkGrid}>
                  {ALL_FEATURES.map((f) => (
                    <label key={f} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(f)}
                        onChange={() => toggleFeature(f)}
                      />
                      <span>{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label>Stack preferito</label>
                <select className={styles.select} value={stack} onChange={(e) => setStack(e.target.value)}>
                  {STACKS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Hosting</label>
                <select className={styles.select} value={hosting} onChange={(e) => setHosting(e.target.value)}>
                  {HOSTING.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formCol}>
              <div className={styles.field}>
                <label>Budget indicativo (€ {budget})</label>
                <input
                  type="range"
                  min={500}
                  max={15000}
                  step={100}
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value, 10))}
                />
                <div className={styles.rangeHints}>
                  <span>€ 500</span>
                  <span>€ 15.000</span>
                </div>
              </div>

              <div className={styles.field}>
                <label>Tempistiche desiderate</label>
                <select className={styles.select} value={timing} onChange={(e) => setTiming(e.target.value)}>
                  <option value="1-2 settimane">1–2 settimane</option>
                  <option value="2-4 settimane">2–4 settimane</option>
                  <option value="4-6 settimane">4–6 settimane</option>
                  <option value="> 6 settimane">&gt; 6 settimane</option>
                  <option value="Non so / da consigliare">Non so / da consigliare</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Messaggio / Note (obbligatorio se non hai selezionato funzionalità)</label>
                <textarea
                  className={styles.textarea}
                  rows={8}
                  placeholder="Raccontaci del tuo progetto: obiettivi, pubblico, competitor, contenuti già disponibili, dominio, ecc."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.checkLine}>
                  <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} />
                  <span>
                    Ho letto l’informativa privacy e acconsento al trattamento dei dati per essere ricontattato.
                  </span>
                </label>
              </div>

              <div className={styles.submitRow}>
                <button
                  className={styles.buttonPrimary}
                  disabled={!canSubmit}
                  onClick={sendTelegram}
                >
                  {isSending ? "Invio in corso…" : "Invia richiesta"}
                </button>
                {isSent && <span className={styles.success}>Richiesta inviata con successo! 📩</span>}
              </div>

              {userData ? (
                <p className={styles.userHint}>
                  Inviamo i tuoi dati precompilati:{" "}
                  <strong>{userData.displayName} {userData.cognome}</strong> • <strong>{userData.email}</strong> • <strong>{userData.telefono}</strong>
                </p>
              ) : (
                <p className={styles.userHintDim}>Accedi per precompilare automaticamente i tuoi dati.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default RichiestaSitoWeb;
