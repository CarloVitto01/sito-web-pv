import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../backend/firebase";
import styles from "./LinkGestionale.module.css";
import Header from "../components/HeaderComponents/Header";

/** ---------- Tipi ---------- */
type LinkItem = {
  id: string;
  url: string;
  domain: string;
  title?: string | null;
  faviconUrl?: string | null;
  createdAt?: any; // puoi tipare come Timestamp se vuoi
  order?: number;
};

/** ---------- Helpers ---------- */
function normalizeUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = "https://" + s; // default https
  try {
    const u = new URL(s);
    u.hash = ""; // rimuovi hash
    return u.toString();
  } catch {
    return "";
  }
}

function getDomain(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

// Favicon tramite Google S2 (affidabile, niente CORS)
function faviconFor(domain: string, size = 64) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** ---------- Componente ---------- */
const LinkGestionale: React.FC = () => {
  const [items, setItems] = useState<LinkItem[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  const [inputTitle, setInputTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colRef = useMemo(() => collection(db, "gestionale_links"), []);

  useEffect(() => {
    // Evitiamo indice composito: ordiniamo solo per createdAt
    const qRef = query(colRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const next: LinkItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as Omit<LinkItem, "id">;
          next.push({ id: d.id, ...data });
        });
        setItems(next);
        setError(null);
      },
      (err) => {
        console.error("[LinkGestionale] onSnapshot error:", err);
        // Mostra il messaggio, per esempio "Missing or insufficient permissions" o link per creare indice
        setError(err?.message ?? String(err));
      }
    );
    return () => unsub();
  }, [colRef]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;

    const url = normalizeUrl(inputUrl);
    if (!url) {
      alert("Inserisci un URL valido (con o senza http/https).");
      return;
    }

    const domain = getDomain(url);
    if (!domain) {
      alert("URL non valido.");
      return;
    }

    setAdding(true);
    try {
      // Evita duplicati (stesso URL normalizzato)
      const existsQ = query(colRef, where("url", "==", url), limit(1));
      const existsSnap = await getDocs(existsQ);
      if (!existsSnap.empty) {
        alert("Questo URL è già presente in elenco.");
        return;
      }

      const faviconUrl = faviconFor(domain, 64);
      const nowOrder = Date.now(); // pronto per futuri riordini drag&drop

      await addDoc(colRef, {
        url,
        domain,
        title: inputTitle.trim() ? inputTitle.trim() : null,
        faviconUrl,
        createdAt: serverTimestamp(),
        order: nowOrder,
      });

      setInputUrl("");
      setInputTitle("");
    } catch (err: any) {
      console.error("[LinkGestionale] addDoc error:", err);
      alert("Errore durante il salvataggio del link: " + (err?.message || String(err)));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    // eslint-disable-next-line no-restricted-globals
    const ok = typeof window !== "undefined" && window.confirm("Eliminare questo collegamento?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "gestionale_links", id));
    } catch (err: any) {
      console.error("[LinkGestionale] deleteDoc error:", err);
      alert("Errore durante l'eliminazione: " + (err?.message || String(err)));
    }
  }

  return (
    
    <div className={styles.container}>
      <Header />
      <h1 className={styles.title}>Collegamenti rapidi</h1>

      {error && <p className={styles.error}>Errore Firestore: {error}</p>}

      <form className={styles.form} onSubmit={handleAdd} noValidate>
        <div className={styles.field}>
          <label>URL del sito</label>
          <input
            className={styles.input}
            type="url"
            placeholder="es. https://photoandvision.it"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label>Titolo (opzionale)</label>
          <input
            className={styles.input}
            type="text"
            placeholder="es. Sito Photo & Vision"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
          />
        </div>

        <button className={styles.addBtn} type="submit" disabled={adding}>
          {adding ? "Aggiungo..." : "Aggiungi"}
        </button>
      </form>

      <div className={styles.grid}>
        {items.map((it) => (
          <article key={it.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <img
                className={styles.favicon}
                src={it.faviconUrl || faviconFor(it.domain)}
                alt=""
                referrerPolicy="no-referrer"
              />
              <div className={styles.meta}>
                <h3 className={styles.cardTitle}>{it.title || it.domain}</h3>
                <a
                  className={styles.domain}
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={it.url}
                >
                  {it.domain}
                </a>
              </div>
            </div>

            <div className={styles.cardActions}>
              <a
                className={styles.openBtn}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apri
              </a>
              <button
                className={styles.deleteBtn}
                onClick={() => handleDelete(it.id)}
              >
                Elimina
              </button>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 && !error && (
        <p className={styles.empty}>Nessun collegamento ancora. Aggiungine uno sopra!</p>
      )}
    </div>
  );
};

export default LinkGestionale;
