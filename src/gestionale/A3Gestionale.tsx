import React, { useEffect, useState } from "react";
import { db } from "../backend/firebase";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    setDoc,
} from "firebase/firestore";
import styles from "./A3Gestionale.module.css";
import Header from "../components/HeaderComponents/Header";

type CostiA3 = {
    grammaturaNormale: number;
    grammaturaCartoncino: number;
    biancoNero: number;
    colore: number;
    plastificazione: number;
};

type Ordine = {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    tipo?: string;
    files?: string[];
};

const defaultCostiA3: CostiA3 = {
    grammaturaNormale: 0.12,
    grammaturaCartoncino: 0.17,
    biancoNero: 0.03,
    colore: 0.13,
    plastificazione: 0.30,
};

const A3Gestionale: React.FC = () => {
    const [costi, setCosti] = useState<CostiA3>(defaultCostiA3);
    const [ordini, setOrdini] = useState<Ordine[]>([]);

    useEffect(() => {
        const costiRef = doc(db, "configA3", "costi");
        const unsub = onSnapshot(costiRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (
                    typeof data.grammaturaNormale === "number" &&
                    typeof data.grammaturaCartoncino === "number" &&
                    typeof data.biancoNero === "number" &&
                    typeof data.colore === "number" &&
                    typeof data.plastificazione === "number"
                ) {
                    setCosti(data as CostiA3);
                }
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const fetchOrdini = async () => {
            const querySnapshot = await getDocs(collection(db, "StampePDFA3"));
            const docs: Ordine[] = querySnapshot.docs
                .map((docSnap) => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        nome: data.nome,
                        cognome: data.cognome,
                        telefono: data.telefono,
                        email: data.email,
                        tipo: data.tipo || "A3",
                        files: Array.isArray(data.files) ? data.files : [data.files].filter(Boolean),
                    };
                })
                .filter((doc) => doc.tipo === "A3");
            setOrdini(docs);
        };
        fetchOrdini();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCosti((prev) => ({
            ...prev,
            [name]: parseFloat(value),
        }));
    };

    const handleSave = async () => {
        const ref = doc(db, "configA3", "costi");
        await setDoc(ref, costi);
        alert("Costi A3 aggiornati!");
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, "StampePDFA3", id));
        setOrdini((prev) => prev.filter((o) => o.id !== id));
    };

    return (
        <div>

            <Header />
            <div className={styles.container}>
                <h2 className={styles.title}>🛠️ Gestionale Costi A3</h2>

                <div className={styles.grid}>
                    {Object.entries(costi).map(([key, value]) => (
                        <div key={key} className={styles.field}>
                            <label className={styles.label} htmlFor={key}>{key}</label>
                            <input
                                id={key}
                                name={key}
                                type="number"
                                value={value}
                                step="0.001"
                                className={styles.input}
                                onChange={handleChange}
                            />
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className={styles.button}>💾 Salva Costi</button>

                <h2 className={styles.title} style={{ marginTop: 40 }}>📁 Ordini A3</h2>
                <ul className={styles.orderList}>
                    {ordini.map((ordine) => (
                        <li key={ordine.id} className={styles.orderItem}>
                            <div>
                                {ordine.nome} {ordine.cognome} - {ordine.telefono} - {ordine.email}
                                {ordine.files && ordine.files.length > 0 && (
                                    <ul style={{ marginTop: 5 }}>
                                        {ordine.files.map((link, index) => (
                                            <li key={index}>
                                                <a href={link} target="_blank" rel="noopener noreferrer">
                                                    📄 PDF {index + 1}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <button onClick={() => handleDelete(ordine.id)} className={styles.deleteButton}>
                                🗑️ Elimina
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default A3Gestionale;