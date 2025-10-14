import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc, collection, onSnapshot, query } from "firebase/firestore"; // ⬅️ import lasciato com’era
import { TOKEN3D, CHAT_ID3D } from "../../backend/telegram";

import styles from "./RichiestaStampa3D.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import ModelPreview from "../3D/ModelPreview";
import Intro from "../IntroComponents/Intro";

interface UserShape {
  displayName?: string;
  cognome?: string;
  email?: string;
  telefono?: string;
}

// ⬅️ NEW: tipo bobina come da gestionale/Firestore
type Spool = {
  id: string;
  label: string;
  material: string;
  hex: string;
  available: boolean;
  order?: number;
};

// opzionale: normalizza hex in formato #RRGGBB
function normalizeHex(hex?: string) {
  if (!hex) return undefined;
  let h = hex.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (h.length === 4) {
    // #rgb -> #rrggbb
    const r = h[1], g = h[2], b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  return h.toLowerCase();
}

const RichiestaStampa3D: React.FC = () => {
  const [userData, setUserData] = useState<UserShape | null>(null);

  // campi essenziali
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [copies, setCopies] = useState(1);
  const [notes, setNotes] = useState("");
  const [privacyOk, setPrivacyOk] = useState(false);

  // ⬅️ NEW: bobine dal gestionale + selezione
  const [spools, setSpools] = useState<Spool[]>([]);
  const [selectedSpoolId, setSelectedSpoolId] = useState<string | null>(null);

  // ui
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // recupero utente
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

  // ⬅️ UPDATED: subscribe alle bobine dal gestionale (senza where/orderBy multipli → niente indice composito)
  useEffect(() => {
    const qRef = query(collection(db, "pla_spools"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const rows: Spool[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Spool, "id">) }));
        setSpools(rows);

        // se la selezione non è più valida -> reset; oppure auto-seleziona la prima disponibile
        setSelectedSpoolId((prev) => {
          const onlyAvail = rows.filter((r) => r.available);
          if (prev && onlyAvail.some((r) => r.id === prev)) return prev;
          return onlyAvail[0]?.id ?? null;
        });
      },
      (err) => {
        console.error("Errore snapshot bobine:", err);
      }
    );
    return () => unsub();
  }, []);

  // Filtra a client: solo disponibili, ordinati per order poi label
  const visibleSpools = useMemo(() => {
    return [...spools]
      .filter((s) => s.available)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.label.localeCompare(b.label));
  }, [spools]);

  // upload
  const onFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
    setPreviewIndex(0);
  };

  // toggle singolo: clic → seleziona quella; riclic → deseleziona (ma qui manteniamo sempre singola)
  const toggleSpool = (id: string) => {
    setSelectedSpoolId((prev) => (prev === id ? null : id));
  };

  const canSubmit = privacyOk && !isSending && (files.length > 0 || notes.trim().length > 0);

  // ⬅️ UPDATED: colore preso dalla bobina selezionata tra le visibili
  const selectedColorHex = useMemo(() => {
    const hex = visibleSpools.find((s) => s.id === selectedSpoolId)?.hex;
    return normalizeHex(hex);
  }, [selectedSpoolId, visibleSpools]);

  // invio Telegram
  const sendTelegram = async () => {
    if (!canSubmit) return;
    setIsSending(true);

    const u = userData || {};
    const fileLines = files.length
      ? files.map((f) => `• ${f.name} (${Math.round(f.size / 1024)} KB)`).join("\n")
      : "(nessun file allegato)";

    // ⬅️ CHANGED: label ricavata dalle bobine del gestionale
    const spoolLabel = selectedSpoolId
      ? (visibleSpools.find((s) => s.id === selectedSpoolId)?.label || selectedSpoolId)
      : "(non specificato)";

    const msg = `
===============================
*Richiesta Stampa 3D* (semplificata)
===============================

👤 *Nome:* ${u.displayName || ""} ${u.cognome || ""}
📧 *Email:* ${u.email || ""}
📞 *Telefono:* ${u.telefono || ""}

🏷️ *Progetto:* ${projectName || "—"}
🔁 *Copie:* ${copies}

🎨 *Colore (bobina):*
${spoolLabel}

📎 *File allegati:*
${fileLines}

📝 *Note:*
${notes || "(nessuna nota)"}
`.trim();

    try {
      await fetch(`https://api.telegram.org/bot${TOKEN3D}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID3D,
          text: msg,
          parse_mode: "Markdown",
        }),
      });
      setIsSent(true);
      // reset leggero
      setProjectName("");
      setFiles([]);
      setPreviewIndex(0);
      setCopies(1);
      setNotes("");
      setPrivacyOk(false);
      setSelectedSpoolId(null);
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
        <Intro
          title={"STAMPA I TUOI PROGETTI 3D"}
          text={"Carica il modello, scegli la bobina colore e descrivi brevemente cosa ti serve. Ti ricontatteremo con un preventivo."}
        />
        <section className={styles.config}>
          <div className={styles.formGrid}>
            {/* Colonna SX */}
            <div className={styles.formCol}>
              <div className={styles.field}>
                <label>Nome progetto (opzionale)</label>
                <input
                  className={styles.input}
                  placeholder="Es. Supporto GoPro, Ricambio clip, Miniatura..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label>File modello (STL / OBJ / 3MF / ZIP)</label>
                <input
                  className={styles.input}
                  type="file"
                  accept=".stl,.obj,.3mf,.zip"
                  multiple
                  onChange={onFilesChange}
                />

                {!files.length && (
                  <p className={styles.userHintDim}>
                    Carica un file STL/OBJ/3MF per vedere l'anteprima 3D.
                  </p>
                )}

                {!!files.length && (
                  <ul className={styles.fileList}>
                    {files.map((f) => (
                      <li key={f.name}>{f.name} — {(f.size / 1024).toFixed(0)} KB</li>
                    ))}
                  </ul>
                )}

                {files.length > 0 && (
                  <div className={styles.preview3dCard}>
                    <div className={styles.preview3dHeader}>
                      <h3>Anteprima 3D</h3>
                      <small>File: {files[previewIndex].name}</small>
                    </div>

                    {files.length > 1 && (
                      <div className={styles.field} style={{ padding: "8px 12px" }}>
                        <label>Visualizza file</label>
                        <select
                          className={styles.select}
                          value={previewIndex}
                          onChange={(e) => setPreviewIndex(parseInt(e.target.value, 10))}
                        >
                          {files.map((f, i) => (
                            <option key={f.name} value={i}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* ⬅️ CHANGED: passo il colore selezionato (dal gestionale) alla preview */}
                    <ModelPreview file={files[previewIndex]} colorHex={selectedColorHex} />

                    <div className={styles.preview3dFooter}>
                      Usa il mouse per ruotare/zoomare. La preview è indicativa.
                    </div>
                  </div>
                )}
              </div>

              {/* BOBINA COLORE (selezione singola) */}
              <div className={styles.field}>
                <label>Bobina colore</label>

                {visibleSpools.length === 0 ? (
                  <p className={styles.userHintDim}>Nessuna bobina disponibile al momento.</p>
                ) : (
                  <div className={styles.spoolGrid}>
                    {visibleSpools.map((s) => {
                      const active = selectedSpoolId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={`${styles.spool} ${active ? styles.spoolActive : ""}`}
                          onClick={() => toggleSpool(s.id)}
                          title={`${s.label} — ${s.material}`}
                        >
                          <span
                            className={styles.swatch}
                            style={{ background: normalizeHex(s.hex) || s.hex }}
                          />
                          <span className={styles.spoolLabel}>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <small className={styles.hint}>
                  Puoi selezionare un solo colore. La preview lo applica al modello.
                </small>
              </div>

              <div className={styles.fieldRowWrap}>
                <div className={styles.field}>
                  <label>Copie</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || "1")))}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Note / Specifiche</label>
                <textarea
                  className={styles.textarea}
                  rows={8}
                  placeholder="Descrivi uso, dimensioni indicative, preferenze, urgenza…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Colonna DX */}
            <div className={styles.formCol}>
              <div className={styles.sideCard}>
                <div className={styles.privacyRow}>
                  <input
                    id="privacyOk"
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={privacyOk}
                    onChange={(e) => setPrivacyOk(e.target.checked)}
                  />
                  <label htmlFor="privacyOk" className={styles.privacyText}>
                    Ho letto l’<a href="/privacy" target="_blank" rel="noopener noreferrer">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato.
                  </label>
                </div>

                <div className={styles.ctaRow}>
                  <button
                    className={styles.buttonPrimary}
                    disabled={!canSubmit}
                    onClick={sendTelegram}
                  >
                    {isSending ? "Invio in corso…" : "Invia richiesta"}
                  </button>

                  {isSent ? (
                    <span className={styles.success}>Richiesta inviata con successo! 📩</span>
                  ) : (
                    <span className={styles.ctaHint}>Riceverai una conferma e verrai ricontattato.</span>
                  )}
                </div>

                <div className={styles.userInfoBox}>
                  {userData ? (
                    <p>
                      Inviamo i tuoi dati precompilati:{" "}
                      <strong>{userData.displayName} {userData.cognome}</strong> •{" "}
                      <a href={`mailto:${userData.email}`}>{userData.email}</a> •{" "}
                      <a href={`tel:${userData.telefono}`}>{userData.telefono}</a>
                    </p>
                  ) : (
                    <p className={styles.userHintDim}>
                      Accedi per precompilare automaticamente i tuoi dati.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </section>
      </div>

      <Footer />
    </>
  );
};

export default RichiestaStampa3D;
