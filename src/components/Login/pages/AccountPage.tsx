// src/pages/AccountPage.tsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// ✅ Adatta il path se diverso
import "./AccountPage.css";
import Header from "../../HeaderComponents/Header";
import Footer from "../../FooterComponents/Footer";

const AccountPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [orders, setOrders] = useState<any[]>([]);
    const [isStudente, setIsStudente] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate("/login");
                return;
            }

            const docRef = doc(db, "users", user.uid);
            const archiveQuery = query(
                collection(db, "ArchivioOrdini"), // 👈 nuova collezione permanente
                where("uid", "==", user.uid)
            );

            const archiveSnapshot = await getDocs(archiveQuery);
            const userOrders = archiveSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate
                        ? data.timestamp.toDate().toISOString()
                        : null,
                };
            });

            setOrders(userOrders);

            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                setUserData(userData);
                setIsStudente(!!userData.corsoLaurea || !!userData.annoAccademico); // ✅ Imposta il checkbox se ci sono dati studente
            }

            setLoading(false);
        };

        fetchData();
    }, [navigate]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const user = auth.currentUser;
        if (!user) return;

        // Clona i dati dell'utente
        const updatedData = { ...userData };

        // Se il checkbox non è selezionato, rimuovi i dati universitari
        if (!isStudente) {
            delete updatedData.corsoLaurea;
            delete updatedData.annoAccademico;

            // Rimuovili anche dallo stato locale per svuotare i campi
            setUserData((prev: any) => ({
                ...prev,
                corsoLaurea: "",
                annoAccademico: "",
            }));
        }

        try {
            await updateDoc(doc(db, "users", user.uid), updatedData);
            setSuccess("Dati aggiornati con successo!");
        } catch (err: any) {
            setError("Errore durante l'aggiornamento.");
        }
    };


    if (loading) return <p>Caricamento in corso...</p>;

    return (
        <>
            <Header />
            <div className="account-page">
                <div className="account-container">
                    <h2>Il Mio Account</h2>
                    <form onSubmit={handleUpdate}>
                        <label>Nome:</label>
                        <input name="displayName" value={userData.displayName || ""} onChange={handleChange} required />

                        <label>Cognome:</label>
                        <input name="cognome" value={userData.cognome || ""} onChange={handleChange} required />

                        <label>Email:</label>
                        <input value={auth.currentUser?.email || ""} readOnly />

                        <button
                            type="button"
                            className="home-button"
                            onClick={() => {
                                const user = auth.currentUser;
                                if (user?.email) {
                                    import("firebase/auth").then(({ sendPasswordResetEmail }) => {
                                        sendPasswordResetEmail(auth, user.email!)
                                            .then(() => {
                                                setSuccess("Email per il cambio password inviata!");
                                            })
                                            .catch(() => {
                                                setError("Errore durante l'invio dell'email.");
                                            });
                                    });
                                }
                            }}
                        >
                            Cambia Password
                        </button> 
                        <br />
                        <label>Telefono:</label>
                        <input name="telefono" value={userData.telefono || ""} onChange={handleChange} required /> 

                        <div className="account-checkbox-wrapper">
                            <label htmlFor="isStudente">
                                Sei uno studente universitario (Ecotekne)?
                            </label>
                            <input
                                type="checkbox"
                                id="isStudente"
                                checked={isStudente}
                                onChange={async (e) => {
                                    const checked = e.target.checked;
                                    setIsStudente(checked);

                                    if (!checked) {
                                        setUserData((prev: any) => ({
                                            ...prev,
                                            corsoLaurea: "",
                                            annoAccademico: "",
                                        }));

                                        const user = auth.currentUser;
                                        if (user) {
                                            try {
                                                await updateDoc(doc(db, "users", user.uid), {
                                                    corsoLaurea: "",
                                                    annoAccademico: "",
                                                });

                                            } catch (err) {

                                            }
                                        }
                                    }
                                }}

                            />
                        </div>
                        {isStudente && (
                            <>
                                <label>Corso di Laurea:</label>
                                <input
                                    name="corsoLaurea"
                                    value={userData.corsoLaurea || ""}
                                    onChange={handleChange}
                                />

                                <label>Anno Accademico:</label>
                                <input
                                    name="annoAccademico"
                                    value={userData.annoAccademico || ""}
                                    onChange={handleChange}
                                />
                            </>
                        )}


                        <div className="button-row">
                            <button type="submit" className="home-button">
                                Aggiorna Dati
                            </button>
                            <button type="button" className="home-button" onClick={() => navigate("/")}>
                                Torna alla Home
                            </button>


                        </div>
                        {success && <p className="success-message">{success}</p>}
                        {error && <p className="error-message">{error}</p>}
                    </form>

                    <div className="orders-summary">
                        <h3>Ordini Effettuati: {orders.length}</h3>
                        {orders.length === 0 ? (
                            <p>Nessun ordine trovato.</p>
                        ) : (
                            <ul>
                                {orders.map((order) => (
                                    <li key={order.id} style={{ marginBottom: "1rem" }}>
                                        <div>
                                            <strong>Tipo:</strong> {order.tipo} |{" "}
                                            <strong>Totale:</strong> €{Number(order.prezzo).toFixed(2)} |{" "}
                                            <strong>Data:</strong>{" "}
                                            {typeof order.timestamp === "string"
                                                ? new Date(order.timestamp).toLocaleDateString("it-IT", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                })
                                                : order.timestamp?.toDate?.().toLocaleDateString("it-IT", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                })}

                                        </div>
                                    </li>
                                ))}
                            </ul>

                        )}
                    </div>

                </div>
            </div>
            <Footer />
        </>
    );
};

export default AccountPage;
