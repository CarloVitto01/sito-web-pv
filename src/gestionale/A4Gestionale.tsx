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
import styles from "./A4Gestionale.module.css";

type Costi = {
  foglio: number;
  biancoNero: number;
  colore: number;
  anelli: number;
  fascetta: number;
  ciappatura: number;
  spirale: number;
};

type Ordine = {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  tipo?: string;
  file?: string[]; // ⬅️ Array di link ai PDF
};


const defaultCosti: Costi = {
  foglio: 0.03,
  biancoNero: 0.015,
  colore: 0.075,
  anelli: 1.5,
  fascetta: 1,
  ciappatura: 0.1,
  spirale: 2,
};

const A4Gestionale: React.FC = () => {
  const [costi, setCosti] = useState<Costi>(defaultCosti);
  const [ordini, setOrdini] = useState<Ordine[]>([]);

  useEffect(() => {
    const costiRef = doc(db, "configA4", "costi");
    const unsub = onSnapshot(costiRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (
          typeof data.foglio === "number" &&
          typeof data.biancoNero === "number" &&
          typeof data.colore === "number" &&
          typeof data.anelli === "number" &&
          typeof data.fascetta === "number" &&
          typeof data.ciappatura === "number" &&
          typeof data.spirale === "number"
        ) {
          setCosti(data as Costi);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
  const fetchOrdini = async () => {
    const querySnapshot = await getDocs(collection(db, "StampePDF"));
    const docs: Ordine[] = querySnapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nome: data.nome,
          cognome: data.cognome,
          telefono: data.telefono,
          email: data.email,
          tipo: data.tipo || "A4",
          file: Array.isArray(data.file) ? data.file : [data.file].filter(Boolean),
        };
      })
      .filter((doc) => doc.tipo === "A4");
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
    const ref = doc(db, "configA4", "costi");
    await setDoc(ref, costi);
    alert("Costi aggiornati!");
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "StampePDF", id));
    setOrdini((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className={styles.container}>
  <h2 className={styles.title}>🛠️ Gestionale Costi A4</h2>

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

  <h2 className={styles.title} style={{ marginTop: 40 }}>📁 Ordini A4</h2>
  <ul className={styles.orderList}>
    {ordini.map((ordine) => (
      <li key={ordine.id} className={styles.orderItem}>
        <div>
          {ordine.nome} {ordine.cognome} - {ordine.telefono} - {ordine.email}
          {ordine.file && ordine.file.length > 0 && (
            <ul style={{ marginTop: 5 }}>
              {ordine.file.map((link, index) => (
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

  );
};

export default A4Gestionale;