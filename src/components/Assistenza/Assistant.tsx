// src/components/AssistantWidget/AssistantWidget.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Assistant.module.css";

import {TOKENTICKET, CHAT_IDTICKET } from "../../backend/telegram";

// Firebase (auto-precompila utente dopo login)
import { auth, db } from "../../backend/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Tipi
type FaqItem = { id: string; question: string; answer: string; tags?: string[] };
type TabKey = "faq" | "chat" | "ticket" | "order" | "shortcuts";

type AssistantUser = {
  id?: string;
  name?: string;      // displayName
  surname?: string;   // cognome
  email?: string;
  phone?: string;     // telefono
};

type AssistantWidgetProps = {
  faqs?: FaqItem[];
  onSendTicket?: (payload: {
    name?: string; surname?: string; phone?: string; email?: string;
    topic: string; message: string; pageUrl: string; userId?: string;
  }) => Promise<void>;
  onTrack?: (event: string, data?: Record<string, any>) => void;
  orderLookup?: (code: string) => Promise<{ status: string; eta?: string; note?: string } | null>;
  user?: AssistantUser | null;
  accentHex?: string;
  position?: "right" | "left";
};

const DEFAULT_FAQS: FaqItem[] = [
  /* ======= STAMPE A4 / A3 ======= */
  {
    id: "stampe-differenze",
    question: "Qual è la differenza tra stampa A4 e A3?",
    answer:
      "L’A4 misura 210×297 mm, l’A3 297×420 mm. Le A3 costano di più per via di inchiostro e grammatura. Puoi scegliere colore, bianco/nero e plastificazione dal modulo ordine, con prezzo aggiornato in tempo reale."
  },
  {
    id: "stampe-preventivo",
    question: "Posso vedere il preventivo prima di confermare la stampa?",
    answer:
      "Sì, nel riepilogo dell’ordine il prezzo viene calcolato automaticamente in base a numero di pagine, colori, rilegatura e altre opzioni selezionate."
  },
  {
    id: "stampe-consegna",
    question: "In quanto tempo riceverò le stampe?",
    answer:
      "In genere entro 24–48 ore per stampe standard. Per grandi quantità o rilegature speciali i tempi vengono comunicati tramite WhatsApp."
  },
  {
    id: "stampe-rilegatura",
    question: "Offrite diversi tipi di rilegatura?",
    answer:
      "Certo. Puoi scegliere tra spirale, anelli o fascetta. Ogni tipo ha un costo visibile nel gestionale stampe e si aggiorna in automatico."
  },
  {
    id: "stampe-formato-pdf",
    question: "Che file posso caricare per la stampa?",
    answer:
      "Accettiamo PDF multipli, anche uniti. Assicurati che ogni file abbia dimensioni A4 o A3 e margini corretti; il sistema conteggia automaticamente le pagine."
  },

  /* ======= SITI WEB ======= */
  {
    id: "web-tipologie",
    question: "Che tipi di siti web realizzate?",
    answer:
      "Offriamo template personalizzabili: **facciata**, **portfolio**, **e-commerce**, **blog**, **catalogo** e **istituzionale**. Ogni progetto è responsive, ottimizzato SEO e gestibile da pannello."
  },
  {
    id: "web-preventivo",
    question: "Come funziona il preventivo per un sito web?",
    answer:
      "Puoi inviare una *Richiesta Sito Web* dall’apposita sezione: inserisci tipo di sito, pagine desiderate e budget indicativo. Ti rispondiamo con una proposta dettagliata entro 48 ore."
  },
  {
    id: "web-tempistiche",
    question: "Quanto tempo serve per sviluppare un sito?",
    answer:
      "Dipende dalla complessità: un sito vetrina richiede 1-2 settimane, un e-commerce completo circa 3-4 settimane."
  },
  {
    id: "web-manutenzione",
    question: "Offrite anche manutenzione o aggiornamenti?",
    answer:
      "Sì, includiamo un piano base di manutenzione. Puoi attivare piani aggiuntivi per backup automatici, aggiornamenti di contenuti e supporto tecnico mensile."
  },

  /* ======= STAMPE 3D ======= */
  {
    id: "3d-formati",
    question: "Quali file accettate per la stampa 3D?",
    answer:
      "I formati supportati sono **.STL**, **.OBJ** e **.3MF**. Carica il modello dal modulo *Richiesta Stampa 3D*, dove puoi visualizzare anteprima e dimensioni rilevate."
  },
  {
    id: "3d-materiali",
    question: "Che materiali utilizzate per la stampa 3D?",
    answer:
      "Stampiamo principalmente in PLA. Offriamo la possibilità di selezionare il colore tra quelli disponibili. Per materiali speciali o richieste particolari, contattaci direttamente."
  },
  {
    id: "3d-preventivo",
    question: "Come viene calcolato il prezzo di una stampa 3D?",
    answer:
      "Il prezzo dipende da peso, materiale, infill e tempo macchina. Il costo complessivo ti verrà comunicato via WhatsApp dopo aver esaminato il modello caricato."
  },
  {
    id: "3d-ritiro",
    question: "Posso ritirare di persona il pezzo stampato?",
    answer:
      "Sì, puoi ritirarlo in sede oppure richiedere spedizione. Le opzioni di ritiro/spedizione verranno stabilite al momento della conferma tramite WhatsApp."
  },

  /* ======= FOTO & VIDEO ======= */
  {
    id: "foto-servizi",
    question: "Che servizi fotografici offrite?",
    answer:
      "Servizi foto per eventi, prodotti, book personali e cerimonie. Puoi consultare le gallery nella sezione *Foto & Video* e richiedere un preventivo personalizzato."
  },
  {
    id: "video-servizi",
    question: "Realizzate anche video promozionali o eventi?",
    answer:
      "Sì. Produciamo video per aziende, spot social e riprese eventi. Offriamo anche montaggio e correzione colore professionale."
  },
  {
    id: "foto-privacy",
    question: "Le foto e i video vengono pubblicati online?",
    answer:
      "Solo se ci autorizzi. Tutti i contenuti restano privati finché non concedi il consenso alla pubblicazione sul portfolio Photo & Vision."
  },

  /* ======= PAGAMENTI / ACCOUNT ======= */
  {
    id: "pagamenti",
    question: "Quali metodi di pagamento accettate?",
    answer:
      "PayPal, carte di credito e contanti al ritiro. Con PayPal vengono applicate eventuali fee indicate nel riepilogo dell’ordine."
  },
  {
    id: "fattura",
    question: "Posso richiedere fattura?",
    answer:
      "Sì, ti basterà inviare una richiesta tramite WhatsApp o tramite Ticket nella scheda 'Richiesta'. Riceverai la fattura via email dopo la conferma del pagamento."
  },
  {
    id: "account-modifica",
    question: "Posso modificare i miei dati dopo la registrazione?",
    answer:
      "Certo. Accedi alla pagina *Il mio Account* dal menu e aggiorna nome, email o numero di telefono. Le modifiche vengono salvate in tempo reale."
  },
  {
    id: "assistenza-contatto",
    question: "Come posso contattare l’assistenza?",
    answer:
      "Puoi scrivere direttamente qui nell’assistente virtuale (scheda *Richiesta*). In alternativa, trovi i recapiti in fondo alla pagina del sito."
  }
];


const AssistantWidget: React.FC<AssistantWidgetProps> = ({
  faqs = DEFAULT_FAQS,
  onSendTicket,
  onTrack,
  user,
  accentHex = "#c7ab2b",
  position = "right",
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("pv_assistant_open") === "1"; } catch { return false; }
  });
  const [tab, setTab] = useState<TabKey>("faq");
  const [search, setSearch] = useState("");

  // Stato ticket
  const [ticket, setTicket] = useState({ topic: "Informazioni", message: "" });
  const [firstName, setFirstName] = useState<string>(user?.name || "");
  const [lastName, setLastName] = useState<string>(user?.surname || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [email, setEmail] = useState<string>(user?.email || "");


  // Animazioni/stati invio
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const statusRef = useRef<HTMLDivElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Accessibilità: ESC chiude; Alt+/ toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.altKey && e.key === "/") {
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Persistenza stato
  useEffect(() => {
    try { localStorage.setItem("pv_assistant_open", open ? "1" : "0"); } catch { }
  }, [open]);

  useEffect(() => {
    if (open) onTrack?.("assistant_open", { tab });
  }, [open, tab, onTrack]);

  // Precompila da prop user quando cambia
  useEffect(() => {
    if (!user) return;
    if (user.name) setFirstName((v) => v || user.name!);
    if (user.surname) setLastName((v) => v || user.surname!);
    if (user.phone) setPhone((v) => v || user.phone!);
    if (user.email) setEmail((v) => v || user.email!);
  }, [user]);

  // Se non arrivano i dati dal parent, prova a leggerli da Firestore post-login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data() as any;
          setFirstName((prev) => prev || String(d?.displayName ?? ""));
          setLastName((prev) => prev || String(d?.cognome ?? ""));
          setPhone((prev) => prev || String(d?.telefono ?? ""));
          setEmail((prev) => prev || String(d?.email ?? ""));
        }
      } catch (e) {
        console.warn("Impossibile caricare profilo utente per assistenza:", e);
      }
    });
    return () => unsub();
  }, []); // ok: nessuna dipendenza mancante


  // Filtro FAQ
  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(f =>
      f.question.toLowerCase().includes(q) ||
      f.answer.toLowerCase().includes(q) ||
      (f.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [faqs, search]);

  // === Invio ticket ===
  const sendTicketViaTelegram = async (payload: {
    name?: string; surname?: string; phone?: string; email?: string;
    topic: string; message: string; pageUrl: string; userId?: string;
  }) => {
    const safe = (s?: string) => (s && String(s).trim().length ? s : "-");

    const messageText = `
=====================
   *NUOVO TICKET*
=====================

🏷️ *Argomento*: ${safe(payload.topic)}
👤 *Da*: ${safe(payload.name)} ${safe(payload.surname)} <${safe(payload.email)}>
📞 *Telefono*: ${safe(payload.phone)}

📝 *Messaggio:*
${safe(payload.message)}
`.trim();

    const apiUrl = `https://api.telegram.org/bot${TOKENTICKET}/sendMessage`;
    const body = { chat_id: CHAT_IDTICKET, text: messageText, parse_mode: "Markdown" };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Telegram error: ${res.status} ${txt}`);
    }
  };

  const handleSendTicket = async () => {
    if (!ticket.message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const payload = {
        name: firstName?.trim() || user?.name,
        surname: lastName?.trim() || user?.surname,
        phone: phone?.trim() || user?.phone,
        email: email?.trim() || user?.email,
        topic: ticket.topic,
        message: ticket.message.trim(),
        pageUrl: window.location.href,
        userId: user?.id,
      };

      if (onSendTicket) {
        await onSendTicket(payload);
      } else {
        await sendTicketViaTelegram(payload);
      }

      setTicket({ topic: "Informazioni", message: "" });
      onTrack?.("assistant_ticket_sent", { topic: payload.topic });
      setStatus("success");

      // annuncia al SR e poi torna idle
      statusRef.current?.focus();
      setTimeout(() => setStatus("idle"), 1600);
    } catch (e) {
      console.error(e);
      setStatus("error");
      statusRef.current?.focus();
      // resta visibile l’errore un po’, poi torna idle
      setTimeout(() => setStatus("idle"), 2200);
    }
  };

  const isSending = status === "sending";

  return (
    <>
      {/* Bottone flottante */}
      <button
        ref={buttonRef}
        aria-label={open ? "Chiudi assistente" : "Apri assistente"}
        aria-expanded={open}
        className={`${styles.fab} ${position === "left" ? styles.left : styles.right}`}
        style={{ borderColor: accentHex, color: accentHex }}
        onClick={() => setOpen(v => !v)}
      >
        {open ? "✕" : "Assistenza"}
      </button>

      {/* Pannello */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Assistente Photo & Vision"
          className={`${styles.panel} ${position === "left" ? styles.left : styles.right}`}
        >
          {/* Header */}
          <div className={styles.header} style={{ borderBottomColor: accentHex }}>
            <div className={styles.brand}>
              <span className={styles.dot} style={{ backgroundColor: accentHex }} />
              <strong>Photo & Vision</strong>
            </div>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${tab === "faq" ? styles.active : ""}`} onClick={() => setTab("faq")}>FAQ</button>
              <button className={`${styles.tab} ${tab === "ticket" ? styles.active : ""}`} onClick={() => setTab("ticket")}>Richiesta</button>
            </div>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {/* Live region per stato invio */}
            <div
              ref={statusRef}
              tabIndex={-1}
              aria-live="polite"
              className={styles.srOnly}
            >
              {status === "sending" && "Invio in corso"}
              {status === "success" && "Richiesta inviata con successo"}
              {status === "error" && "Errore durante l’invio del messaggio"}
            </div>

            {tab === "faq" && (
              <section>
                <label className={styles.label}>Cerca nelle FAQ</label>
                <input
                  className={styles.input}
                  placeholder="Es. pagamento PayPal, tempi, A3/A4..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <ul className={styles.faqList}>
                  {filteredFaqs.map(f => (
                    <li key={f.id} className={styles.faqItem}>
                      <details>
                        <summary>{f.question}</summary>
                        <p>{f.answer}</p>
                      </details>
                    </li>
                  ))}
                  {!filteredFaqs.length && <li className={styles.empty}>Nessun risultato. Prova con altre parole.</li>}
                </ul>
              </section>
            )}

            {tab === "ticket" && (
              <section className={styles.ticketSection}>
                {/* overlay animazioni invio/successo */}
                {status !== "idle" && (
                  <div className={`${styles.sendOverlay}`}>
                    {status === "sending" && (
                      <div className={styles.sendingWrap}>
                        <div className={styles.loader} />
                        <div className={styles.sendingText}>Invio…</div>
                      </div>
                    )}
                    {status === "success" && (
                      <div className={styles.successWrap}>
                        <div className={styles.checkCircle}>
                          <span>✓</span>
                        </div>
                        <div className={styles.successText}>Inviato!</div>
                        <div className={styles.confetti} aria-hidden="true" />
                      </div>
                    )}
                    {status === "error" && (
                      <div className={styles.errorWrap}>
                        <div className={styles.errorBadge}>!</div>
                        <div className={styles.errorText}>Errore. Riprova.</div>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.grid}>
                  <div>
                    <label className={styles.label}>Nome</label>
                    <input
                      className={styles.input}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Nome"
                      disabled={isSending}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Cognome</label>
                    <input
                      className={styles.input}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Cognome"
                      disabled={isSending}
                    />
                  </div>
                </div>

                <div className={styles.grid}>
                  <div>
                    <label className={styles.label}>Telefono</label>
                    <input
                      className={styles.input}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Es. +39 ..."
                      disabled={isSending}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Email</label>
                    <input
                      className={styles.input}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Per la risposta"
                      disabled={isSending}
                    />
                  </div>
                </div>

                <div className={styles.grid}>
                  <div>
                    <label className={styles.label}>Argomento</label>
                    <select
                      className={styles.input}
                      value={ticket.topic}
                      onChange={(e) => setTicket(s => ({ ...s, topic: e.target.value }))}
                      disabled={isSending}
                    >
                      <option>Informazioni</option>
                      <option>Preventivo</option>
                      <option>Assistenza ordine</option>
                      <option>Altro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={styles.label}>Messaggio</label>
                  <textarea
                    className={styles.textarea}
                    rows={5}
                    value={ticket.message}
                    onChange={(e) => setTicket(s => ({ ...s, message: e.target.value }))}
                    placeholder="Raccontaci in breve come possiamo aiutarti…"
                    disabled={isSending}
                  />
                </div>

                <button
                  className={`${styles.primary} ${isSending ? styles.primaryBusy : ""}`}
                  style={{ backgroundColor: accentHex }}
                  onClick={handleSendTicket}
                  disabled={isSending || !ticket.message.trim()}
                >
                  <span className={styles.primaryLabel}>
                    {isSending ? "Invio…" : "Invia richiesta"}
                  </span>
                  {isSending && <span className={styles.primarySpinner} aria-hidden="true" />}
                </button>
                <p>
                  Verrai contattato via WhatsApp entro 24 ore.
                </p>
              </section>
            )}
          </div>

          {/* Footer / privacy */}
          <div className={styles.footer}>
            Assistenza clienti<a href="/privacy" aria-label="Privacy Policy">Privacy</a>
          </div>
        </div>
      )}
    </>
  );
};

export default AssistantWidget;
