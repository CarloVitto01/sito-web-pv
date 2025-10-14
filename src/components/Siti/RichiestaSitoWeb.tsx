import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../backend/firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { TOKENWEB, CHAT_IDWEB } from "../../backend/telegram";

import styles from "./RichiestaSitoWeb.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import Intro from "../IntroComponents/Intro";

/** =========================================================
 * Tipi locali (allineati al gestionale)
 * ======================================================= */
type TemplateCategory =
  | "facciata"
  | "ecommerce"
  | "portfolio"
  | "blog"
  | "booking"
  | "catalogo"
  | "landing"
  | "istituzionale";

type TemplateMeta = {
  id: string;
  title: string;
  short: string;
  category: TemplateCategory;
  previewUrl: string;   // immagine anteprima
  demoPath: string;     // link anteprima esterna
  pagesIncluded: string[];
  features: string[];
  minBudget?: number;   // override minimo categoria
  published: boolean;
  order: number;
};

type WebPricingConfig = {
  hostingYearly: number;
  budgetMax: number;
  timingMultiplier: Record<string, number>;
  minBudgetByCategory: Record<TemplateCategory, number>;
};

interface UserShape {
  displayName?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
}

// (compat: mantengo il type usato nello state)
type TemplateWithExtras = TemplateMeta & {
  minBudget?: number;
};

/** =========================================================
 * Fallback locali (usati finché non arriva la config da Firestore)
 * ======================================================= */
const DEFAULT_MIN = 500;

const DEFAULT_CONFIG: WebPricingConfig = {
  hostingYearly: 50,
  budgetMax: 20000,
  timingMultiplier: {
    "1-2 settimane": 1.3,
    "2-4 settimane": 1.15,
    "4-6 settimane": 1.0,
    "> 6 settimane": 0.9,
    "Non so / da consigliare": 1.0,
  },
  minBudgetByCategory: {
    facciata: 800,
    portfolio: 1200,
    blog: 1500,
    catalogo: 2000,
    booking: 2500,
    ecommerce: 3000,
    landing: 800,
    istituzionale: 1500,
  },
};

/** Firestore paths */
const TEMPLATES_COL = "web_templates";
const CONFIG_DOC_PATH = "config/web_pricing";

/** Utils */
const euro = (n: number, digits = 0) =>
  `€ ${n.toLocaleString("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

const RichiestaSitoWeb: React.FC = () => {
  const [userData, setUserData] = useState<UserShape | null>(null);

  /** ====== DATI DINAMICI DA FIRESTORE ====== */
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [cfg, setCfg] = useState<WebPricingConfig>(DEFAULT_CONFIG);

  // filtro elenco
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "tutte">("tutte");

  // budget con minimo dinamico
  const [minBudget, setMinBudget] = useState<number>(DEFAULT_MIN);
  const [budget, setBudget] = useState<number>(2500);

  const [timing, setTiming] = useState("2-4 settimane");
  const [message, setMessage] = useState("");
  const [privacyOk, setPrivacyOk] = useState(false);

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithExtras | null>(null);

  /** ====== Recupera utente ====== */
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

  /** ====== Live templates pubblicati ====== */
  useEffect(() => {
    const qRef = query(
      collection(db, TEMPLATES_COL),
      where("published", "==", true)
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const arr: TemplateMeta[] = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as TemplateMeta[];
        arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setTemplates(arr);
      },
      (err) => {
        console.error("[RichiestaSitoWeb] onSnapshot templates error:", err);
        setTemplates([]);
      }
    );
    return () => unsub();
  }, []);

  /** ====== Live config ====== */
  useEffect(() => {
    const ref = doc(db, CONFIG_DOC_PATH);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setCfg(snap.data() as WebPricingConfig);
        else setCfg(DEFAULT_CONFIG);
      },
      (err) => {
        console.error("[RichiestaSitoWeb] onSnapshot config error:", err);
        setCfg(DEFAULT_CONFIG);
      }
    );
    return () => unsub();
  }, []);

  /** ====== Reazioni a template scelto (minimo dinamico) ====== */
  useEffect(() => {
    if (!selectedTemplate) {
      setMinBudget(DEFAULT_MIN);
      return;
    }
    const tplMin = selectedTemplate.minBudget;
    const catMin =
      cfg.minBudgetByCategory[selectedTemplate.category] ?? DEFAULT_MIN;
    const computedMin =
      typeof tplMin === "number" && tplMin > 0 ? tplMin : catMin;

    setMinBudget(computedMin);
    setBudget(computedMin); // livello Base
  }, [selectedTemplate, cfg.minBudgetByCategory]);

  /** ====== Filtri template ====== */
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const byCat = category === "tutte" ? true : t.category === category;
      const term = search.toLowerCase().trim();
      const bySearch =
        !term ||
        t.title.toLowerCase().includes(term) ||
        t.short.toLowerCase().includes(term) ||
        (t.features || []).some((f) => f.toLowerCase().includes(term));
      return byCat && bySearch;
    });
  }, [templates, search, category]);

  /** ====== Livello qualità stimato ====== */
  const solidThreshold = useMemo(
    () => Math.ceil((minBudget * 1.25) / 100) * 100,
    [minBudget]
  );
  const premiumThreshold = useMemo(
    () => Math.ceil((minBudget * 1.75) / 100) * 100,
    [minBudget]
  );

  const qualityLevel = useMemo(() => {
    if (budget < solidThreshold) return "Base (funzionale)";
    if (budget < premiumThreshold) return "Solido";
    return "Impeccabile";
  }, [budget, solidThreshold, premiumThreshold]);

  /** ====== Riepilogo calcolato ====== */
  const TIMING_MULTIPLIER = cfg.timingMultiplier;
  const HOSTING_YEARLY = cfg.hostingYearly;
  const BUDGET_MAX = cfg.budgetMax;

  const timingMultiplier = TIMING_MULTIPLIER[timing] ?? 1;
  const urgencyPct = Math.round((timingMultiplier - 1) * 100);
  const devSubtotal = budget;
  const devTotal = Math.round(devSubtotal * timingMultiplier);
  const devDelta = devTotal - devSubtotal;
  const totalYear1 = devTotal + HOSTING_YEARLY;

  /** ====== Regole invio ====== */
  const canSubmit =
    !!selectedTemplate &&
    privacyOk &&
    !isSending &&
    budget >= minBudget &&
    !!message.trim(); // messaggio obbligatorio

  const sendTelegram = async () => {
    if (!canSubmit) return;
    setIsSending(true);

    const u = userData || {};
    const sign = urgencyPct > 0 ? `+${urgencyPct}%` : `${urgencyPct}%`;

    const fullMessage = `
===============================
*Richiesta Sviluppo Sito Web*
===============================

👤 *Nome:* ${u.displayName || ""} ${u.cognome || ""}
📧 *Email:* ${u.email || ""}
📞 *Telefono:* ${u.telefono || ""}

🧩 *Template scelto:* ${selectedTemplate?.title} (${selectedTemplate?.category})
📄 *Pagine incluse di base:* ${selectedTemplate?.pagesIncluded.join(", ")}

💶 *Budget (Base):* ${euro(devSubtotal)}  |  *Minimo:* ${euro(minBudget)}
⏱️ *Tempistiche:* ${timing} (${sign})
➕ *Delta urgenza:* ${devDelta >= 0 ? "+" : ""}${euro(devDelta)}
🧾 *Subtotale sviluppo (urgenza inclusa):* ${euro(devTotal)}

🛰️ *Hosting (gestito da noi — obbligatorio):* ${euro(HOSTING_YEARLY)}/anno

🏷️ *Livello qualità stimato:* ${qualityLevel}
💡 *Nota qualità:* il minimo garantisce un sito *funzionante*; per un risultato *impeccabile* si consiglia ≥ ${euro(premiumThreshold)}

===============================
💰 *Totale primo anno (sviluppo + hosting):* ${euro(totalYear1)}
===============================

💬 *Messaggio/Note:*
${message}
    `;

    try {
      await fetch(`https://api.telegram.org/bot${TOKENWEB}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_IDWEB,
          text: fullMessage,
          parse_mode: "Markdown",
        }),
      });
      setIsSent(true);
      // reset parziale (mantengo filtri)
      setSelectedTemplate(null);
      setBudget(2500);
      setMinBudget(DEFAULT_MIN);
      setTiming("2-4 settimane");
      setMessage("");
      setPrivacyOk(false);
      setTimeout(() => setIsSent(false), 4000);
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
          <Intro
            title="RICHIESTA SVILUPPO SITO WEB"
            text="Scegli un template di partenza, imposta budget e tempistiche, scrivi le tue note e inviaci la richiesta: ti risponderemo con una proposta su misura."
          />
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
                <option value="landing">Landing</option>
                <option value="istituzionale">Istituzionale</option>
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
                <div
                  key={t.id}
                  className={`${styles.card} ${active ? styles.cardActive : ""}`}
                >
                  <div className={styles.previewWrap}>
                    <div className={styles.previewInner}>
                      <img src={t.previewUrl} alt={t.title} />
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardHead}>
                      <h3>{t.title}</h3>
                      <span className={styles.badge}>{t.category}</span>
                    </div>
                    <p className={styles.cardText}>{t.short}</p>
                    <div className={styles.pills}>
                      {(t.features || []).slice(0, 4).map((f) => (
                        <span key={f} className={styles.pill}>
                          {f}
                        </span>
                      ))}
                    </div>

                    <div className={styles.cardActions}>
                      <a
                        className={`${styles.button} ${styles.ghost}`}
                        href={t.demoPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Apri anteprima in una nuova scheda"
                      >
                        Apri anteprima
                      </a>
                      <button
                        className={styles.button}
                        onClick={() => setSelectedTemplate(t as TemplateWithExtras)}
                      >
                        {active ? "Selezionato ✓" : "Seleziona"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {!filteredTemplates.length && (
              <div className={styles.empty}>
                Nessun template trovato. Prova a cambiare filtri o ricerca.
              </div>
            )}
          </div>
        </section>

        {/* Configurazione sintetica */}
        {/* Configurazione (colonna centrale) */}
        <section className={styles.config}>
          <h2>Configura il tuo progetto</h2>

          <div className={styles.formCenter}>
            {/* Hosting: fisso, non selezionabile */}
            <div className={styles.field}>
              <label>Hosting</label>
              <div className={styles.staticRow}>
                Gestito da noi — <strong>{euro(HOSTING_YEARLY)}</strong>/anno (obbligatorio)
              </div>
              <small className={styles.hint}>
                Include dominio, HTTPS, backup e monitoraggio base.
              </small>
            </div>

            <div className={styles.field}>
              <label>
                Budget indicativo (€ {budget.toLocaleString("it-IT")}) — livello qualità:{" "}
                <strong>{qualityLevel}</strong>
              </label>
              <input
                type="range"
                min={minBudget}
                max={BUDGET_MAX}
                step={100}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value, 10))}
              />
              <div className={styles.rangeHints}>
                <span>€ {minBudget.toLocaleString("it-IT")}</span>
                <span>€ {BUDGET_MAX.toLocaleString("it-IT")}</span>
              </div>
              <small className={styles.hint}>
                Con il <strong>costo minimo</strong> ottieni un sito <em>funzionante</em> (base).
                Per un risultato <strong>impeccabile</strong> considera almeno {euro(premiumThreshold)}.
              </small>
            </div>

            <div className={styles.field}>
              <label>Tempistiche desiderate</label>
              <select
                className={styles.select}
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
              >
                <option value="1-2 settimane">1–2 settimane (priorità, +30%)</option>
                <option value="2-4 settimane">2–4 settimane (+15%)</option>
                <option value="4-6 settimane">4–6 settimane (standard)</option>
                <option value="> 6 settimane">&gt; 6 settimane (risparmio, -10%)</option>
                <option value="Non so / da consigliare">Non so / da consigliare</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Messaggio / Note (obbligatorio)</label>
              <textarea
                className={styles.textarea}
                rows={8}
                placeholder="Raccontaci del tuo progetto: obiettivi, pubblico, competitor, contenuti già disponibili, dominio, ecc."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </section>


        {/* ======================= RIEPILOGO COSTI + Invio ======================= */}
        <section className={styles.config} aria-live="polite">
          <h2>Riepilogo costi</h2>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <strong>Base (sviluppo):</strong> {euro(devSubtotal)}{" "}
                  <small>(minimo {euro(minBudget)})</small>
                </div>
                <div>
                  <strong>Urgenza — {timing}:</strong>{" "}
                  <span>{urgencyPct > 0 ? `+${urgencyPct}%` : `${urgencyPct}%`}</span>{" "}
                  <span>({devDelta >= 0 ? "+" : ""}{euro(devDelta)})</span>
                </div>
                <div>
                  <strong>Subtotale sviluppo:</strong> {euro(devTotal)}
                </div>
                <div>
                  <strong>Hosting (12 mesi):</strong> {euro(HOSTING_YEARLY)}{" "}
                  <small>(obbligatorio)</small>
                </div>
                <hr />
                <div>
                  <strong>Totale primo anno (sviluppo + hosting):</strong> {euro(totalYear1)}
                </div>
                <small className={styles.hint}>
                  Con il <strong>costo minimo</strong> il sito è <em>funzionante</em>; per un
                  risultato <strong> impeccabile</strong> considera almeno {euro(premiumThreshold)}.
                </small>

                {/* Azioni riepilogo: privacy + invio */}
                <div className={styles.summaryActions}>
                  <label className={styles.checkLine}>
                    <input
                      type="checkbox"
                      checked={privacyOk}
                      onChange={(e) => setPrivacyOk(e.target.checked)}
                    />
                    <span>
                      Ho letto l’informativa privacy e acconsento al trattamento dei dati per essere
                      ricontattato.
                    </span>
                  </label>

                  <button
                    className={`${styles.buttonPrimary} ${canSubmit ? styles.ctaReady : styles.ctaDisabled} ${isSending ? styles.isSending : ""}`}
                    disabled={!canSubmit}
                    onClick={sendTelegram}
                    title={
                      !selectedTemplate
                        ? "Seleziona un template"
                        : budget < minBudget
                          ? `Il budget minimo per questo template è ${euro(minBudget)}`
                          : !message.trim()
                            ? "Inserisci un messaggio/nota"
                            : undefined
                    }
                  >
                    <span className={styles.btnLabel}>
                      {isSending ? "Invio in corso…" : "Invia richiesta"}
                    </span>
                    <span className={styles.btnPlane} aria-hidden="true">
                      <svg className={styles.planeSvg} viewBox="0 0 24 24" width="18" height="18">
                        <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>

                {isSent && <span className={styles.success}>Richiesta inviata con successo! 📩</span>}
                {userData ? (
                  <p className={styles.userHint}>
                    Invieremo anche i tuoi dati:{" "}
                    <strong>
                      {userData.displayName} {userData.cognome}
                    </strong>{" "}
                    • <strong>{userData.email}</strong> • <strong>{userData.telefono}</strong>
                  </p>
                ) : (
                  <p className={styles.userHintDim}>
                    Accedi per precompilare automaticamente i tuoi dati.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
};

export default RichiestaSitoWeb;
