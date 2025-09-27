// src/components/ContattiServiziFotoVideo/ContattiServiziFotoVideo.tsx
// PUBLIC VIEW — Animated albums
// Effect: on card click → centers with shared-layout animation, rotates, then reveals the grid.
// Clicking a media opens a lightbox modal.

import React, { useEffect, useState } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc, collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { TOKENFOTOVIDEO, CHAT_IDFOTOVIDEO } from "../../backend/telegram";
import styles from "./ContattiServiziFotoVideo.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import collabs from "../../assets/images/logo_b.png";
import { motion, AnimatePresence } from "framer-motion";

/* ===== Types ===== */
interface Album { id: string; title: string; coverUrl?: string }
interface MediaItem { id: string; url: string; type: "image" | "video" }

const ContattiServiziFotoVideo: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [albumItems, setAlbumItems] = useState<MediaItem[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const [lightbox, setLightbox] = useState<{ type: "image" | "video"; url: string } | null>(null);

  // ===== User data =====
  useEffect(() => {
    (async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) setUserData(snap.data());
    })();
  }, []);

  // ===== Albums stream =====
  useEffect(() => {
    const qAlbums = query(collection(db, "mediaAlbums"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qAlbums, (snap) => {
      const list: Album[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAlbums(list);
    });
    return () => unsub();
  }, []);

  // ===== Open album (fetch items) =====
  async function openAlbum(a: Album) {
    setActiveAlbum(a);
    setRevealed(false);
    setAlbumLoading(true);
    try {
      const qItems = query(collection(db, "mediaAlbums", a.id, "items"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qItems);
      const list: MediaItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAlbumItems(list);
    } finally {
      setAlbumLoading(false);
      // small delay to let the card center before reveal
      setTimeout(() => setRevealed(true), 550);
    }
  }

  // ===== Send message to Telegram =====
  async function sendMessage() {
    if (!message.trim()) return;
    setIsSending(true);
    const fullMessage = `\n===============================\n*Richiesta Info Servizi Foto/Video*\n===============================\n\n👤 *Nome:* ${userData?.displayName || ""}\n👤 *Cognome:* ${userData?.cognome || ""}\n📧 *Email:* ${userData?.email || ""}\n📞 *Telefono:* ${userData?.telefono || ""}\n\n💬 *Messaggio utente:*\n${message}\n`;
    try {
      await fetch(`https://api.telegram.org/bot${TOKENFOTOVIDEO}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_IDFOTOVIDEO, text: fullMessage, parse_mode: "Markdown" }),
      });
      setIsSent(true);
      setMessage("");
    } catch (e) {
      console.error("Errore invio messaggio:", e);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <Header />

      <div className={styles.container}>
        {/* Title */}
        <h1 className={styles.pageTitle}>Servizi Professionali di Foto e Video</h1>

        {/* HERO row */}
        <section className={styles.heroRow}>
          <div className={styles.logoCol}>
            <img src={collabs} alt="Partner" className={styles.heroLogo} />
          </div>
          <div className={styles.formCol}>
            <h2 className={styles.formTitle}>Richiedi informazioni</h2>
            {userData ? (
              <div className={styles.box}>
                <p className={styles.userLine}>
                  <strong>Nome:</strong> {userData.displayName} <strong>Cognome:</strong> {userData.cognome}<br />
                  <strong>Email:</strong> {userData.email} <strong>Telefono:</strong> {userData.telefono}
                </p>
                <textarea
                  className={styles.textarea}
                  placeholder="Scrivi qui la tua richiesta..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
                <button className={styles.button} onClick={sendMessage} disabled={isSending || !message.trim()}>
                  {isSending ? "Invio in corso..." : "Invia Richiesta"}
                </button>
                {isSent && <p className={styles.success}>Messaggio inviato con successo! 📩</p>}
              </div>
            ) : (
              <p className={styles.loading}>Caricamento dati utente...</p>
            )}
          </div>
        </section>

        {/* Albums */}
        <section className={styles.albumsSection}>
          <h2 className={styles.sectionTitle}>I nostri lavori</h2>
          <div className={styles.albumGrid}>
            {albums.map((a) => (
              <motion.article key={a.id} className={styles.albumCard} layoutId={`album-${a.id}`}>
                <motion.button className={styles.albumBody} onClick={() => openAlbum(a)} layoutId={`album-body-${a.id}`}>
                  {a.coverUrl ? (
                    <motion.img className={styles.albumCover} src={a.coverUrl} alt={a.title} layoutId={`cover-${a.id}`} />
                  ) : (
                    <div className={styles.albumCoverPlaceholder}>Nessuna copertina</div>
                  )}
                  <div className={styles.albumMeta}>
                    <motion.h3 className={styles.albumTitle} layoutId={`title-${a.id}`}>{a.title}</motion.h3>
                  </div>
                </motion.button>
              </motion.article>
            ))}
          </div>
        </section>
      </div>

      {/* Animated Overlay + Fly card */}
      <AnimatePresence>
        {activeAlbum && (
          <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.flyStage}>
              <motion.div
                className={styles.flyCard}
                layoutId={`album-${activeAlbum.id}`}
                initial={false}
                animate={{ rotateY: revealed ? 0 : [0, 14, 0] }}
                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <motion.div className={styles.flyHeader} layoutId={`album-body-${activeAlbum.id}`}>
                  {activeAlbum.coverUrl ? (
                    <motion.img className={styles.flyCover} src={activeAlbum.coverUrl} alt={activeAlbum.title} layoutId={`cover-${activeAlbum.id}`} />
                  ) : (
                    <div className={styles.albumCoverPlaceholder}>Nessuna copertina</div>
                  )}
                  <motion.h3 className={styles.flyTitle} layoutId={`title-${activeAlbum.id}`}>{activeAlbum.title}</motion.h3>
                  <button className={styles.closeBtn} onClick={() => setActiveAlbum(null)}>✕</button>
                </motion.div>

                {/* Grid reveal */}
                <AnimatePresence>
                  {revealed && (
                    <motion.div
                      className={styles.flyBody}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.35 }}
                    >
                      {albumLoading ? (
                        <p className={styles.loading}>Caricamento contenuti…</p>
                      ) : albumItems.length === 0 ? (
                        <p className={styles.loading}>Nessun contenuto presente in questo album.</p>
                      ) : (
                        <div className={styles.flyGrid}>
                          {albumItems.map((m) => (
                            <motion.div key={m.id} className={styles.itemCard} whileHover={{ scale: 1.02 }}>
                              {m.type === "image" ? (
                                <img className={styles.itemMedia} src={m.url} alt="media" onClick={() => setLightbox({ type: "image", url: m.url })} />
                              ) : (
                                <video className={styles.itemMedia} src={m.url} onClick={() => setLightbox({ type: "video", url: m.url })} controls playsInline />
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div className={styles.lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <div className={styles.lightboxInner} onClick={(e) => e.stopPropagation()}>
              <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
              {lightbox.type === "image" ? (
                <img src={lightbox.url} alt="preview" />
              ) : (
                <video src={lightbox.url} autoPlay controls playsInline />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
};

export default ContattiServiziFotoVideo;
