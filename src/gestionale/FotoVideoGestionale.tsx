// src/components/Gestionale/FotoVideoGestionale.tsx
// =============================
// VERSIONE SEMPLIFICATA — Album con copertina privata (logo) + media
// Modifiche richieste:
// - RIMOSSI: descrizione, pubblico/privato, numero ordine, rotazione immagini
// - AGGIUNTO: upload copertina (logo) separato, non visibile ai clienti
// - Card album con solo titolo e copertina

import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { db, storage } from "../backend/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import styles from "./FotoVideoGestionale.module.css";
import Header from "../components/HeaderComponents/Header";

/** ===================== Tipi ===================== */
type Album = {
  id: string;
  title: string;
  coverUrl?: string;   // logo/copertina privata
  coverPath?: string;  // path Storage della copertina
  createdAt?: any;
};

type MediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  path: string;
  createdAt?: any;
};

/** ===================== Utils ===================== */
function extIsVideo(ext?: string) {
  return ["mp4", "mov", "webm", "m4v"].includes((ext || "").toLowerCase());
}

function useConfirm() {
  const [state, setState] = React.useState<{ open: boolean; message: string; title?: string; resolve?: (v: boolean) => void }>({ open: false, message: "" });
  const ask = (message: string, title?: string) => new Promise<boolean>((resolve) => {
    setState({ open: true, message, title, resolve });
  });
  const close = (ans: boolean) => {
    state.resolve?.(ans);
    setState((s) => ({ ...s, open: false, resolve: undefined }));
  };
  const ConfirmUI = (
    <Modal open={state.open} onClose={() => close(false)} title={state.title || "Conferma"}>
      <p style={{ marginBottom: 12 }}>{state.message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className={styles.secondaryBtn} onClick={() => close(false)}>Annulla</button>
        <button className={styles.dangerBtn} onClick={() => close(true)}>Conferma</button>
      </div>
    </Modal>
  );
  return { ask, ConfirmUI };
}

function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Chiudi">✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/** ===================== Pagina principale ===================== */
const FotoVideoGestionale: React.FC = () => {
  const { ask, ConfirmUI } = useConfirm();

  // Albums
  const [albums, setAlbums] = useState<Album[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  // Album attivo
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);

  // Upload coda media
  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // ====== Stream albums ======
  useEffect(() => {
    const q = query(collection(db, "mediaAlbums"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Album[];
      setAlbums(list);
    });
    return () => unsub();
  }, []);

  // ====== Stream items dell'album attivo ======
  useEffect(() => {
    if (!activeAlbum) return;
    const q = query(collection(db, "mediaAlbums", activeAlbum.id, "items"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MediaItem[];
      setItems(list);
    });
    return () => unsub();
  }, [activeAlbum?.id]);

  // ====== Crea album (solo titolo) ======
  async function createAlbum() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "mediaAlbums"), {
        title: title.trim(),
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setActiveAlbum({ id: docRef.id, title: title.trim() });
    } finally {
      setCreating(false);
    }
  }

  // ====== Elimina album a cascata ======
  async function deleteAlbumCascade(album: Album) {
    const ok = await ask(`Eliminare definitivamente l'album "${album.title}" e tutti i media al suo interno?`);
    if (!ok) return;

    try {
      // elimina items
      const itemsSnap = await getDocs(collection(db, "mediaAlbums", album.id, "items"));
      for (const m of itemsSnap.docs) {
        const data = m.data() as MediaItem;
        if (data.path) {
          try { await deleteObject(ref(storage, data.path)); } catch {}
        }
        await deleteDoc(doc(db, "mediaAlbums", album.id, "items", m.id));
      }
      // elimina cover
      if (album.coverPath) {
        try { await deleteObject(ref(storage, album.coverPath)); } catch {}
      }
      // elimina doc album
      await deleteDoc(doc(db, "mediaAlbums", album.id));

      if (activeAlbum?.id === album.id) setActiveAlbum(null);
    } catch (e) {
      console.error(e);
    }
  }

  // ====== Upload media nell'album ======
  const onDrop = useCallback((accepted: File[]) => {
    setQueue((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    multiple: true,
    onDrop,
    disabled: !activeAlbum,
  });

  async function handleUpload() {
    if (!activeAlbum || !queue.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i];
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isVideo = extIsVideo(ext);
        const path = `fotoVideo/albums/${activeAlbum.id}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, "mediaAlbums", activeAlbum.id, "items"), {
          type: isVideo ? "video" : "image",
          url,
          path,
          createdAt: serverTimestamp(),
        });
      }
      setQueue([]);
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(item: MediaItem) {
    const ok = await ask("Eliminare questo file?");
    if (!ok || !activeAlbum) return;
    try {
      if (item.path) {
        try { await deleteObject(ref(storage, item.path)); } catch {}
      }
      await deleteDoc(doc(db, "mediaAlbums", activeAlbum.id, "items", item.id));
    } catch (e) {
      console.error(e);
    }
  }

  // ====== Copertina privata (logo) ======
  async function uploadCover(file: File) {
    if (!activeAlbum || !file) return;
    try {
      // elimina eventuale cover precedente
      if (activeAlbum.coverPath) {
        try { await deleteObject(ref(storage, activeAlbum.coverPath)); } catch {}
      }
      const path = `fotoVideo/albums/${activeAlbum.id}/cover/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "mediaAlbums", activeAlbum.id), { coverUrl: url, coverPath: path });
      setActiveAlbum((a) => (a ? { ...a, coverUrl: url, coverPath: path } : a));
    } catch (e) {
      console.error(e);
    }
  }

  async function removeCover() {
    if (!activeAlbum?.coverPath) return;
    const ok = await ask("Rimuovere la copertina (logo) dall'album?");
    if (!ok) return;
    try {
      try { await deleteObject(ref(storage, activeAlbum.coverPath)); } catch {}
      await updateDoc(doc(db, "mediaAlbums", activeAlbum.id), { coverUrl: "", coverPath: "" });
      setActiveAlbum((a) => (a ? { ...a, coverUrl: undefined, coverPath: undefined } : a));
    } catch (e) {
      console.error(e);
    }
  }

  // ====== UI ======
  return (
    <div className={styles.page}>
      <Header />

      {/* Barra introduttiva */}
      <div className={styles.adminBar}>
        <div className={styles.adminBarLeft}>
          <h2 className={styles.title}>🎬 Gestionale Foto & Video — Album</h2>
          <p className={styles.subtitle}>Crea card (album), carica media e imposta una copertina privata (logo).</p>
        </div>
      </div>

      {/* Form Crea Album (solo titolo) */}
      <div className={styles.cardPanel}>
        <div className={styles.formRow}>
          <input
            className={styles.input}
            placeholder="Titolo album"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button className={styles.primaryBtn} disabled={creating || !title.trim()} onClick={createAlbum}>
            {creating ? "Creazione…" : "➕ Crea album"}
          </button>
        </div>
      </div>

      {/* Griglia Album */}
      <section className={styles.albumsSection}>
        <div className={styles.albumGrid}>
          {albums.map((a) => (
            <article key={a.id} className={styles.albumCard}>
              <button className={styles.albumBody} onClick={() => setActiveAlbum(a)}>
                {a.coverUrl ? (
                  <img className={styles.albumCover} src={a.coverUrl} alt={a.title} />
                ) : (
                  <div className={styles.albumCoverPlaceholder}>Nessuna copertina</div>
                )}
                <div className={styles.albumMeta}>
                  <h3 className={styles.albumTitle}>{a.title}</h3>
                </div>
              </button>
              <div className={styles.albumFooter}>
                <span />
                <button className={styles.dangerBtn} onClick={() => deleteAlbumCascade(a)} title="Elimina album">🗑️</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* MODAL Album Dettaglio */}
      <Modal open={!!activeAlbum} onClose={() => setActiveAlbum(null)} title={activeAlbum?.title}>
        {activeAlbum && (
          <div className={styles.albumDetail}>
            {/* Copertina (logo) privata */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong>Copertina (logo):</strong>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                    e.currentTarget.value = "";
                  }}
                />
                <button className={styles.secondaryBtn} onClick={removeCover} disabled={!activeAlbum.coverUrl}>Rimuovi</button>
              </div>
              {activeAlbum.coverUrl && (
                <img src={activeAlbum.coverUrl} alt="cover" style={{ height: 56, borderRadius: 8, border: "1px solid var(--pv-border)" }} />
              )}
            </div>

            {/* Dropzone media */}
            <div className={styles.dropWrap}>
              <div {...getRootProps({ className: styles.dropzone })}>
                <input {...getInputProps()} />
                {isDragActive ? <p>Rilascia i file qui…</p> : <p>Trascina qui immagini/video o clicca per selezionare</p>}
              </div>
              <button className={styles.primaryBtn} disabled={uploading || !queue.length} onClick={handleUpload}>
                {uploading ? "Caricamento…" : "📤 Carica nella card"}
              </button>
            </div>

            {/* Coda file (senza rotazione) */}
            {queue.length > 0 && (
              <div className={styles.queueList}>
                {queue.map((f, i) => (
                  <div key={i} className={styles.queueItem}>
                    {f.type.startsWith("image/") ? (
                      <img className={styles.queueThumb} src={URL.createObjectURL(f)} alt={f.name} />
                    ) : (
                      <div className={styles.queueThumbPlaceholder}>🎞️</div>
                    )}
                    <div className={styles.queueMeta}>
                      <div className={styles.queueName}>{f.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Griglia items */}
            <div className={styles.itemsGrid}>
              {items.map((m) => (
                <div key={m.id} className={styles.itemCard}>
                  {m.type === "image" ? (
                    <img className={styles.itemMedia} src={m.url} alt="media" />
                  ) : (
                    <video className={styles.itemMedia} src={m.url} controls playsInline />
                  )}
                  <div className={styles.itemActions}>
                    <button className={styles.dangerBtn} onClick={() => deleteItem(m)}>Elimina</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {ConfirmUI}
    </div>
  );
};

export default FotoVideoGestionale;
