import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import styles from "../GestionaleA4/A4Gestionale.module.css"; // riusa lo stesso stile dei costi A4

type Tasse = {
  ivaRate: number;          // 0.22 = 22%
  transportFeeEuro: number; // 1.00 €
  paypalPercent: number;    // 0.0349 = 3.49%
  paypalFixed: number;      // 0.35 €
};

const defaultTasse: Tasse = {
  ivaRate: 0.22,
  transportFeeEuro: 1,
  paypalPercent: 0.0349,
  paypalFixed: 0.35,
};

// Percorso Firestore centrale per le tasse
const FEES_COLLECTION = "configTasse";
const FEES_DOC = "fees";

const TasseGestionale: React.FC = () => {
  const [tasse, setTasse] = useState<Tasse>(defaultTasse);
  const [loaded, setLoaded] = useState(false);

  // carica in tempo reale la config
  useEffect(() => {
    const ref = doc(db, FEES_COLLECTION, FEES_DOC);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data() as Partial<Tasse>;
        setTasse({
          ivaRate: typeof d.ivaRate === "number" ? d.ivaRate : defaultTasse.ivaRate,
          transportFeeEuro: typeof d.transportFeeEuro === "number" ? d.transportFeeEuro : defaultTasse.transportFeeEuro,
          paypalPercent: typeof d.paypalPercent === "number" ? d.paypalPercent : defaultTasse.paypalPercent,
          paypalFixed: typeof d.paypalFixed === "number" ? d.paypalFixed : defaultTasse.paypalFixed,
        });
      } else {
        // crea doc con default se non esiste
        setDoc(ref, defaultTasse).catch(console.error);
        setTasse(defaultTasse);
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    const ref = doc(db, FEES_COLLECTION, FEES_DOC);
    await setDoc(ref, tasse, { merge: true });
    alert("Tasse aggiornate ✅");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🧮 Gestionale Tasse</h2>

      {!loaded ? (
        <p>Caricamento…</p>
      ) : (
        <>
          <div className={styles.grid}>
            {/* IVA % (mostri in percento, salvi in decimale) */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="ivaRate">IVA (%)</label>
              <input
                id="ivaRate"
                type="number"
                step="0.01"
                min={0}
                value={(tasse.ivaRate * 100).toString()}
                className={styles.input}
                onChange={(e) => setTasse(s => ({ ...s, ivaRate: Number(e.target.value) / 100 }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="transportFeeEuro">Trasporto (€)</label>
              <input
                id="transportFeeEuro"
                type="number"
                step="0.01"
                min={0}
                value={tasse.transportFeeEuro}
                className={styles.input}
                onChange={(e) => setTasse(s => ({ ...s, transportFeeEuro: Number(e.target.value) }))}
              />
            </div>

            {/* PayPal % (UI in %, salvi in frazione) */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="paypalPercent">PayPal (%)</label>
              <input
                id="paypalPercent"
                type="number"
                step="0.01"
                min={0}
                value={(tasse.paypalPercent * 100).toString()}
                className={styles.input}
                onChange={(e) => setTasse(s => ({ ...s, paypalPercent: Number(e.target.value) / 100 }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="paypalFixed">PayPal fisso (€)</label>
              <input
                id="paypalFixed"
                type="number"
                step="0.01"
                min={0}
                value={tasse.paypalFixed}
                className={styles.input}
                onChange={(e) => setTasse(s => ({ ...s, paypalFixed: Number(e.target.value) }))}
              />
            </div>
          </div>

          <button onClick={handleSave} className={styles.button}>💾 Salva Tasse</button>
        </>
      )}
    </div>
  );
};

export default TasseGestionale;
