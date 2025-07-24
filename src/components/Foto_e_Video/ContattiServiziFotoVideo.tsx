import React, { useEffect, useState } from "react";
import { auth, db } from "../../backend/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TOKENFOTOVIDEO, CHAT_IDFOTOVIDEO } from "../../backend/telegram";
import styles from "./ContattiServiziFotoVideo.module.css";
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";

const ContattiServiziFotoVideo = () => {
    const [userData, setUserData] = useState<any>(null);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

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
                <h2>Richiedi informazioni per servizi Foto & Video</h2>

                {userData ? (
                    <div className={styles.box}>
                        <p><strong>Nome:</strong> {userData.displayName}</p>
                        <p><strong>Cognome:</strong> {userData.cognome}</p>
                        <p><strong>Email:</strong> {userData.email}</p>
                        <p><strong>Telefono:</strong> {userData.telefono}</p>

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
            </div>

            <Footer />
        </>
    );
};

export default ContattiServiziFotoVideo;
