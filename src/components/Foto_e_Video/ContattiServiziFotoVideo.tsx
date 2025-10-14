// src/components/ContattiServiziFotoVideo/ContattiServiziFotoVideo.tsx
// PUBLIC VIEW — Animated albums
// Effect: on card click → centers with shared-layout animation, rotates, then reveals the grid.
// Clicking a media opens a viewer modal (Instagram-like) with prev/next via keyboard/buttons/wheel/swipe.

import React, { useEffect, useMemo, useRef, useState, useCallback  } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc, collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { TOKENFOTOVIDEO, CHAT_IDFOTOVIDEO } from "../../backend/telegram";
import styles from "./ContattiServiziFotoVideo.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import collabs from "../../assets/images/logo_b.png";
import { motion, AnimatePresence } from "framer-motion";
import Intro from "../IntroComponents/Intro";

/* ===== Types ===== */
interface Album { id: string; title: string; coverUrl?: string; order?: number }
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

  // ===== Instagram-like Viewer (index-based) =====
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);        // NEW: container scrollabile mobile

  // rilevamento mobile (<= 700px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  const hasViewer = viewerIndex !== null && albumItems[viewerIndex!] !== undefined;
  const currentItem = hasViewer ? albumItems[viewerIndex!] : null;

  const openViewerAt = (i: number) => setViewerIndex(i);
  const closeViewer = () => setViewerIndex(null);

  const prevViewer = useCallback(() => {
    if (!albumItems.length) return;
    setViewerIndex(i => (i === null ? i : (i - 1 + albumItems.length) % albumItems.length));
  }, [albumItems.length]);

  const nextViewer = useCallback(() => {
    if (!albumItems.length) return;
    setViewerIndex(i => (i === null ? i : (i + 1) % albumItems.length));
  }, [albumItems.length]);


  // lock body + tastiera solo quando viewer aperto (desktop)
  useEffect(() => {
    if (viewerIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevViewer();
      if (e.key === "ArrowRight") nextViewer();
      if (e.key === "Escape") closeViewer();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [viewerIndex, prevViewer, nextViewer]);

  // quando apro su mobile, centra la slide selezionata
  useEffect(() => {
    if (viewerIndex === null || !isMobile) return;
    const el = document.getElementById(`pv-slide-${viewerIndex}`);
    if (el && feedRef.current) {
      (el as HTMLElement).scrollIntoView({ behavior: "auto", block: "center" });
    }
  }, [viewerIndex, isMobile]);

  // ===== User data =====
  useEffect(() => {
    (async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) setUserData(snap.data());
    })();
  }, [activeAlbum]);

  // ===== Albums stream =====
  useEffect(() => {
    const qAlbums = query(collection(db, "mediaAlbums"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qAlbums, (snap) => {
      const list: Album[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAlbums(list);
    });
    return () => unsub();
  }, []);

  // ===== Ordinamento identico al gestionale =====
  const albumsSorted = useMemo(() => {
    const copy = [...albums];
    copy.sort((a, b) => {
      const ao = a.order;
      const bo = b.order;
      if (ao == null && bo == null) {
        const at = (a as any)?.createdAt?.seconds || 0;
        const bt = (b as any)?.createdAt?.seconds || 0;
        return bt - at;
      }
      if (ao == null) return 1;
      if (bo == null) return -1;
      return ao - bo;
    });
    return copy;
  }, [albums]);

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
        <Intro title={"SERVIZI FOTOGRAFICI E VIDEO"} text={""} />

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
                  <strong className={styles.strongUser}>Nome:</strong> {userData.displayName} <br />
                  <strong className={styles.strongUser}>Cognome:</strong> {userData.cognome}<br />
                  <strong className={styles.strongUser}>Email:</strong> {userData.email} <br />
                  <strong className={styles.strongUser}>Telefono:</strong> {userData.telefono}
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
          <h2 className={styles.sectionTitle}>Le Nostre Collaborazioni</h2>
          <div className={styles.albumGrid}>
            {albumsSorted.map((a) => (
              <motion.article key={a.id} className={styles.albumCard} layoutId={`album-${a.id}`}>
                <motion.button className={styles.albumBody} onClick={() => openAlbum(a)} layoutId={`album-body-${a.id}`}>
                  {a.coverUrl ? (
                    <motion.img
                      className={styles.albumCover}
                      src={a.coverUrl}
                      alt={a.title}
                      layoutId={`cover-${a.id}`}
                      style={{ objectFit: "contain", objectPosition: "center" }}
                      loading="lazy"
                    />
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
                    <motion.img
                      className={styles.flyCover}
                      src={activeAlbum.coverUrl}
                      alt={activeAlbum.title}
                      layoutId={`cover-${activeAlbum.id}`}
                      style={{ objectFit: "contain", objectPosition: "center" }}
                    />
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
                          {albumItems.map((m, idx) => (
                            <motion.div
                              key={m.id}
                              className={styles.itemCard}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => openViewerAt(idx)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openViewerAt(idx)}
                            >
                              {m.type === "image" ? (
                                <img
                                  className={styles.itemMedia}
                                  src={m.url}
                                  alt="media"
                                  loading="lazy"
                                  draggable={false}
                                  onClick={(e) => { e.stopPropagation(); openViewerAt(idx); }}
                                />
                              ) : (
                                <video
                                  className={styles.itemMedia}
                                  src={m.url}
                                  muted
                                  playsInline
                                  onClick={(e) => { e.stopPropagation(); openViewerAt(idx); }}
                                />
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

      {/* ===== Instagram-like Viewer ===== */}
      {/* ===== Pure-media Viewer (senza fascia grigia) ===== */}
      {/* ===== Viewer ===== */}
      <AnimatePresence>
        {hasViewer && (
          <motion.div
            className={styles.viewer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeViewer}
          >
            <button className={styles.viewerClose} onClick={closeViewer}>✕</button>

            {/* DESKTOP/TABLET: media singolo + frecce */}
            {!isMobile && currentItem && (
              <div className={styles.viewerSolo} onClick={(e) => e.stopPropagation()}>
                <div className={styles.viewerCanvas}>
                  <button className={`${styles.viewerNav} ${styles.left}`} onClick={prevViewer} aria-label="Precedente">‹</button>
                  <button className={`${styles.viewerNav} ${styles.right}`} onClick={nextViewer} aria-label="Successiva">›</button>

                  {currentItem.type === "image" ? (
                    <img src={currentItem.url} alt="" className={styles.viewerMedia} />
                  ) : (
                    <video src={currentItem.url} controls playsInline className={styles.viewerMedia} />
                  )}

                  <div className={styles.viewerCounter}>
                    {viewerIndex! + 1} / {albumItems.length}
                  </div>
                </div>
              </div>
            )}

            {/* MOBILE: feed verticale scrollabile con snap (tipo IG) */}
            {isMobile && (
              <div
                className={styles.viewerFeed}
                ref={feedRef}
                onClick={(e) => e.stopPropagation()}
              >
                {albumItems.map((m, i) => (
                  <div key={m.id} id={`pv-slide-${i}`} className={styles.viewerSlide}>
                    {m.type === "image" ? (
                      <img src={m.url} alt="" className={styles.viewerMedia} loading="lazy" draggable={false} />
                    ) : (
                      <video src={m.url} controls playsInline className={styles.viewerMedia} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>



      <Footer />
    </>
  );
};

export default ContattiServiziFotoVideo;
