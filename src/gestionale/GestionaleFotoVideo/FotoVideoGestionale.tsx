// src/components/Gestionale/FotoVideoGestionale.tsx
// =============================
// VERSIONE SEMPLIFICATA — Album con copertina privata (logo) + media
// + RINOMINA card (inline, senza alert)
// + DRAG & DROP (swap posizioni) con persistenza "order" su Firestore

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { db, storage } from "../../backend/firebase";
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
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import styles from "./FotoVideoGestionale.module.css";
import Header from "../../components/HeaderComponents/Header";

/** ===================== Tipi ===================== */
type Album = {
  id: string;
  title: string;
  coverUrl?: string;   // logo/copertina privata
  coverPath?: string;  // path Storage della copertina
  createdAt?: any;
  order?: number;      // posizione manuale
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
  const [title, setTitle] = useState(""); // usato dalla "card vuota"

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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

  // ====== albums ordinati lato client ======
  const albumsSorted = useMemo(() => {
    const copy = [...albums];
    copy.sort((a, b) => {
      const ao = a.order;
      const bo = b.order;
      if (ao == null && bo == null) {
        const at = a.createdAt?.seconds || 0;
        const bt = b.createdAt?.seconds || 0;
        return bt - at;
      }
      if (ao == null) return 1;
      if (bo == null) return -1;
      return ao - bo;
    });
    return copy;
  }, [albums]);

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

  // ====== Crea album (tramite "card vuota") ======
  async function createAlbum() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const maxOrder = albums.reduce((acc, cur) =>
        cur.order != null ? Math.max(acc, cur.order) : acc, -1
      );
      const nextOrder = maxOrder + 1;

      const docRef = await addDoc(collection(db, "mediaAlbums"), {
        title: trimmed,
        createdAt: serverTimestamp(),
        order: nextOrder,
      });
      setTitle("");
      setActiveAlbum({ id: docRef.id, title: trimmed, order: nextOrder });
    } finally {
      setCreating(false);
    }
  }

  // ====== Rinomina album (inline) ======
  function startEdit(a: Album) {
    setEditingId(a.id);
    setEditTitle(a.title);
    // focus dopo paint
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setSavingEdit(false);
  }

  async function saveEdit(a: Album) {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === a.title) {
      cancelEdit();
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, "mediaAlbums", a.id), { title: trimmed });
    } catch (e) {
      console.error(e);
    } finally {
      cancelEdit();
    }
  }

  // ====== Drag & Drop: start / over / drop (swap order) ======
  function onDragStart(e: React.DragEvent, a: Album) {
    setDraggingId(a.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", a.id);
  }
  function onDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }
  function onDragOver(e: React.DragEvent, target: Album) {
    if (!draggingId || target.id === draggingId) return;
    e.preventDefault();
    setOverId(target.id);
  }
  async function onDrop(e: React.DragEvent, target: Album) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggingId;
    setOverId(null);
    if (!sourceId || sourceId === target.id) {
      onDragEnd();
      return;
    }
    const source = albumsSorted.find(a => a.id === sourceId);
    if (!source) { onDragEnd(); return; }

    const srcOrder = (source.order != null) ? source.order : albumsSorted.findIndex(x => x.id === source.id);
    const tgtOrder = (target.order != null) ? target.order : albumsSorted.findIndex(x => x.id === target.id);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "mediaAlbums", source.id), { order: tgtOrder });
      batch.update(doc(db, "mediaAlbums", target.id), { order: srcOrder });
      await batch.commit();
    } catch (err) {
      console.error(err);
    } finally {
      onDragEnd();
    }
  }

  // ====== Elimina album a cascata ======
  async function deleteAlbumCascade(album: Album) {
    const ok = await ask(`Eliminare definitivamente l'album "${album.title}" e tutti i media al suo interno?`);
    if (!ok) return;

    try {
      const itemsSnap = await getDocs(collection(db, "mediaAlbums", album.id, "items"));
      for (const m of itemsSnap.docs) {
        const data = m.data() as MediaItem;
        if (data.path) {
          try { await deleteObject(ref(storage, data.path)); } catch {}
        }
        await deleteDoc(doc(db, "mediaAlbums", album.id, "items", m.id));
      }
      if (album.coverPath) {
        try { await deleteObject(ref(storage, album.coverPath)); } catch {}
      }
      await deleteDoc(doc(db, "mediaAlbums", album.id));

      if (activeAlbum?.id === album.id) setActiveAlbum(null);
    } catch (e) {
      console.error(e);
    }
  }

  // ====== Upload media nell'album ======
  const onDropFiles = useCallback((accepted: File[]) => {
    setQueue((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    multiple: true,
    onDrop: onDropFiles,
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

      {/* Griglia Album (con "card vuota" per creare) */}
      <section className={styles.albumsSection}>
        <div className={styles.albumGrid}>

          {/* CARD VUOTA: Crea nuovo album */}
          <article className={`${styles.albumCard} ${styles.newAlbumCard}`} aria-label="Crea nuovo album">
            <div className={styles.newAlbumBody}>
              <div className={styles.newAlbumPlaceholder} aria-hidden="true">Scrivi il titolo e premi + </div>
              <input
                className={styles.newAlbumTitleInput}
                placeholder="Titolo nuovo album"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim() && !creating) createAlbum();
                }}
                aria-label="Titolo nuovo album"
              />
              <button
                className={styles.circlePlusBtn}
                title="Crea album"
                aria-label="Crea album"
                disabled={creating || !title.trim()}
                onClick={createAlbum}
              >
                {creating ? "…" : "+"}
              </button>
            </div>
          </article>

          {/* CARD degli album esistenti */}
          {albumsSorted.map((a) => {
            const isEditing = editingId === a.id;
            return (
              <article
                key={a.id}
                className={`${styles.albumCard} ${draggingId === a.id ? styles.draggingCard : ""} ${overId === a.id ? styles.dropTargetCard : ""}`}
                onDragOver={(e) => onDragOver(e, a)}
                onDrop={(e) => onDrop(e, a)}
              >
                {/* Corpo card → se NON in editing apre l'album, altrimenti div non cliccabile */}
                {isEditing ? (
                  <div className={`${styles.albumBody} ${styles.albumBodyDisabled}`} aria-label={`Modifica titolo ${a.title}`}>
                    {a.coverUrl ? (
                      <img className={styles.albumCover} src={a.coverUrl} alt={a.title} />
                    ) : (
                      <div className={styles.albumCoverPlaceholder}>Nessuna copertina</div>
                    )}
                    <div className={styles.albumMeta}>
                      <input
                        ref={editInputRef}
                        className={styles.albumTitleInput}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !savingEdit) saveEdit(a);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        aria-label="Modifica titolo album"
                      />
                    </div>
                  </div>
                ) : (
                  <button className={styles.albumBody} onClick={() => setActiveAlbum(a)} aria-label={`Apri album ${a.title}`}>
                    {a.coverUrl ? (
                      <img className={styles.albumCover} src={a.coverUrl} alt={a.title} />
                    ) : (
                      <div className={styles.albumCoverPlaceholder}>Nessuna copertina</div>
                    )}
                    <div className={styles.albumMeta}>
                      <h3 className={styles.albumTitle}>{a.title}</h3>
                    </div>
                  </button>
                )}

                {/* Footer card */}
                <div className={styles.albumFooter}>
                  <button
                    className={styles.dragHandle}
                    title="Trascina per riordinare"
                    aria-label={`Trascina ${a.title} per riordinare`}
                    draggable
                    onDragStart={(e) => onDragStart(e, a)}
                    onDragEnd={onDragEnd}
                    disabled={isEditing}
                  >
                    Clicca e trascina
                  </button>

                  <div style={{ display: "flex", gap: 8 }}>
                    {isEditing ? (
                      <>
                        <button
                          className={styles.secondaryBtn}
                          onClick={() => saveEdit(a)}
                          disabled={savingEdit || editTitle.trim().length === 0}
                          title="Salva"
                        >
                          ✔️
                        </button>
                        <button className={styles.secondaryBtn} onClick={cancelEdit} title="Annulla">✖️</button>
                      </>
                    ) : (
                      <button className={styles.secondaryBtn} onClick={() => startEdit(a)} title="Rinomina">✏️</button>
                    )}
                    <button className={styles.dangerBtn} onClick={() => deleteAlbumCascade(a)} title="Elimina album" aria-label={`Elimina album ${a.title}`}>🗑️</button>
                  </div>
                </div>
              </article>
            );
          })}
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
                <img
                  src={activeAlbum.coverUrl}
                  alt="cover"
                  style={{
                    height: 56,
                    borderRadius: 8,
                    border: "1px solid var(--pv-border)",
                    objectFit: "contain",
                    background: "#0a0a0a"
                  }}
                />
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
                    <img
                      className={styles.itemMedia}
                      src={m.url}
                      alt="media"
                      style={{
                        objectFit: "contain",
                        width: "100%",
                        height: "auto",
                        maxHeight: "64vh",
                        background: "#0a0a0a",
                        border: "1px solid var(--pv-border)",
                        borderRadius: 10
                      }}
                    />
                  ) : (
                    <video
                      className={styles.itemMedia}
                      src={m.url}
                      controls
                      playsInline
                      style={{
                        objectFit: "contain",
                        width: "100%",
                        height: "auto",
                        maxHeight: "64vh",
                        background: "#000",
                        border: "1px solid var(--pv-border)",
                        borderRadius: 10
                      }}
                    />
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
