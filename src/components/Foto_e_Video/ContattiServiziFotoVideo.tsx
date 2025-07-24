import React, { useEffect, useState } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TOKENFOTOVIDEO, CHAT_IDFOTOVIDEO } from "../../backend/telegram";
import styles from "./ContattiServiziFotoVideo.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

const ContattiServiziFotoVideo = () => {
    const [userData, setUserData] = useState<any>(null);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [modalMedia, setModalMedia] = useState<{ url: string; type: string } | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (auth.currentUser) {
                const docRef = doc(db, "users", auth.currentUser.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setUserData(snap.data());
                }
            }
        };
        fetchUserData();
    }, []);


    useEffect(() => {
        const fetchMedia = async () => {
            const q = query(collection(db, "mediaFotoVideo"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const docs = snapshot.docs.map((doc) => doc.data());
            setMediaList(docs);
        };
        fetchMedia();
    }, []);

    const sendMessage = async () => {
        if (!message.trim()) return;

        setIsSending(true);

        const fullMessage = `
===============================
*Richiesta Info Servizi Foto/Video*
===============================

👤 *Nome:* ${userData?.displayName || ""}
👤 *Cognome:* ${userData?.cognome || ""}
📧 *Email:* ${userData?.email || ""}
📞 *Telefono:* ${userData?.telefono || ""}

💬 *Messaggio utente:*
${message}
    `;

        try {
            await fetch(`https://api.telegram.org/bot${TOKENFOTOVIDEO}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: CHAT_IDFOTOVIDEO,
                    text: fullMessage,
                    parse_mode: "Markdown",
                }),
            });

            setIsSent(true);
            setMessage("");
        } catch (error) {
            console.error("Errore invio messaggio:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <Header />
            <div className={styles.container}>
                <section className={styles.intro}>
                    <h1>Servizi Professionali di Foto e Video</h1>
                    <p>
                        Offriamo riprese video, servizi fotografici per eventi, montaggi professionali
                        e contenuti promozionali personalizzati. Guarda alcuni dei nostri lavori qui sotto e contattaci per maggiori informazioni!
                    </p>
                </section>
                <section className={styles.formSection}>
                    <h2>Richiedi informazioni</h2>

                    {userData ? (
                        <div className={styles.box}>
                            <p><strong>Nome:</strong> {userData.displayName} <strong> Cognome:</strong> {userData.cognome} <strong>Email:</strong> {userData.email} <strong>Telefono:</strong> {userData.telefono}</p>

                            <textarea
                                className={styles.textarea}
                                placeholder="Scrivi qui la tua richiesta..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                            />

                            <button
                                className={styles.button}
                                onClick={sendMessage}
                                disabled={isSending || !message.trim()}
                            >
                                {isSending ? "Invio in corso..." : "Invia Richiesta"}
                            </button>

                            {isSent && <p className={styles.success}>Messaggio inviato con successo! 📩</p>}
                        </div>
                    ) : (
                        <p className={styles.loading}>Caricamento dati utente...</p>
                    )}
                </section>

                <section className={styles.showcase}>
                    <h2>I nostri lavori</h2>
                    <div className={styles.grid}>
                        {mediaList.map((item, idx) =>
                            item.type === "image" ? (
                                <img
                                    key={idx}
                                    src={item.url}
                                    alt={`media ${idx}`}
                                    className={styles.clickable}
                                    onClick={() => setModalMedia({ url: item.url, type: "image" })}
                                />
                            ) : (
                                <video
                                    key={idx}
                                    src={item.url}
                                    className={styles.clickable}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    onClick={() => setModalMedia({ url: item.url, type: "video" })}
                                />

                            )
                        )}
                    </div>


                </section>


            </div>
            {modalMedia && (
                <div className={styles.modalOverlay} onClick={() => setModalMedia(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        {modalMedia.type === "image" ? (
                            <img src={modalMedia.url} alt="fullscreen" />
                        ) : (
                            <video
                                src={modalMedia.url}
                                autoPlay
                                loop
                                controls
                                playsInline
                            />

                        )}
                        <button className={styles.modalClose} onClick={() => setModalMedia(null)}>✖</button>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default ContattiServiziFotoVideo;
