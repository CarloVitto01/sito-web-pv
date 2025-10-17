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
  { id: "a4-a3-diff", question: "Differenze tra stampa A4 e A3", answer: "L’A4 è 210×297 mm, l’A3 297×420 mm. I costi variano per inchiostro/grammatura/plastificazione. Nel riepilogo ordine vedi prezzo aggiornato in tempo reale." },
  { id: "pagamenti", question: "Posso pagare con PayPal o contanti?", answer: "Sì, accettiamo PayPal online e contanti al ritiro. Con PayPal il totale include eventuali fee visualizzate nel riepilogo." },
  { id: "consegne", question: "Tempi di consegna", answer: "Tipicamente 24–48h per stampe standard. L’assistente ti mostra una stima nel riepilogo ordine; urgenze? Scrivici nel ticket." },
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
              <button className={`${styles.tab} ${tab === "shortcuts" ? styles.active : ""}`} onClick={() => setTab("shortcuts")} title="Scorciatoie da tastiera">⌨︎</button>
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

            {tab === "shortcuts" && (
              <section className={styles.kb}>
                <div><kbd>Alt</kbd> + <kbd>/</kbd> — Apri/chiudi assistente</div>
                <div><kbd>Esc</kbd> — Chiudi assistente</div>
                <div>Navigazione da tastiera completa sulle schede e campi input</div>
              </section>
            )}
          </div>

          {/* Footer / privacy */}
          <div className={styles.footer}>
            Servizio clienti • <a href="/privacy" aria-label="Privacy Policy">Privacy</a>
          </div>
        </div>
      )}
    </>
  );
};

export default AssistantWidget;
