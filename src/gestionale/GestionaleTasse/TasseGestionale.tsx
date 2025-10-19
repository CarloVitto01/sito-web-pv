import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import styles from "./TasseGestionale.module.css";
import Header from "../../components/HeaderComponents/Header";

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

const FEES_COLLECTION = "configTasse";
const FEES_DOC = "fees";

const TasseGestionale: React.FC = () => {
  const [tasse, setTasse] = useState<Tasse>(defaultTasse);
  const [loaded, setLoaded] = useState(false);

  // UI state per il salvataggio
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
        setDoc(ref, defaultTasse).catch(console.error);
        setTasse(defaultTasse);
      }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      setSaveState("saving");
      const ref = doc(db, FEES_COLLECTION, FEES_DOC);
      await setDoc(ref, tasse, { merge: true });
      setSaveState("saved");
      // nasconde il visto dopo 2.5s
      const t = setTimeout(() => setSaveState("idle"), 2500);
      return () => clearTimeout(t);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      const t = setTimeout(() => setSaveState("idle"), 3000);
      return () => clearTimeout(t);
    }
  };

  return (
    <>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>🧮 Gestionale Tasse</h2>

        {!loaded ? (
          <p>Caricamento…</p>
        ) : (
          <>
            <div className={styles.grid}>
              {/* IVA % (UI in %, salvo in decimale) */}
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

              {/* PayPal % (UI in %, salvo in frazione) */}
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

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
              <button
                onClick={handleSave}
                className={styles.button}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "⏳ Salvataggio…" : "💾 Salva Tasse"}
              </button>

              {/* “Visto”/stato salvataggio */}
              <div
                aria-live="polite"
                role="status"
                style={{
                  minHeight: 24,
                  fontWeight: 600,
                  opacity: saveState === "saved" || saveState === "error" ? 1 : 0,
                  transition: "opacity .25s ease",
                }}
              >
                {saveState === "saved" && <span>✅ Salvato</span>}
                {saveState === "error" && <span>⚠️ Errore nel salvataggio</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default TasseGestionale;
