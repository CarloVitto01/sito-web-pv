// src/pages/AccountPage.tsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// ✅ Adatta il path se diverso
import "./AccountPage.css";
import Header from "../../Header";
import Footer from "../../Footer";

const AccountPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate("/login");
                return;
            }

            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserData(docSnap.data());
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

        try {
            await updateDoc(doc(db, "users", user.uid), userData);
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


                        <label>Telefono:</label>
                        <input name="telefono" value={userData.telefono || ""} onChange={handleChange} required />

                        <label>Corso di Laurea:</label>
                        <input name="corsoLaurea" value={userData.corsoLaurea || ""} onChange={handleChange} />

                        <label>Anno Accademico:</label>
                        <input name="annoAccademico" value={userData.annoAccademico || ""} onChange={handleChange} />

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
                </div>
            </div>
            <Footer />
        </>
    );
};

export default AccountPage;
