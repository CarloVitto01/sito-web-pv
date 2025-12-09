import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import Header from "../../components/HeaderComponents/Header";
import styles from "./ScontiGestionale.module.css"; // puoi riusare lo stesso CSS per ora

type PromoConfig = {
  enabled: boolean;
  name?: string;
  description?: string;
  percent: number;      // es. 10 = 10%
  startDate?: string;   // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  minPdf?: number;      // min numero PDF
};

const COLL_PROMO = "configPromo";
const DOC_PROMO = "current";

const DEFAULT_PROMO: PromoConfig = {
  enabled: false,
  name: "Promo Natale",
  description: "Sconto sulle stampe PDF per il periodo natalizio.",
  percent: 10,
  startDate: "", // vuoto = nessun limite
  endDate: "",
  minPdf: 1,
};

const ScontiGestionale: React.FC = () => {
  const [promo, setPromo] = useState<PromoConfig>(DEFAULT_PROMO);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, COLL_PROMO, DOC_PROMO);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PromoConfig>;
          setPromo({
            enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_PROMO.enabled,
            name: typeof data.name === "string" ? data.name : DEFAULT_PROMO.name,
            description:
              typeof data.description === "string" ? data.description : DEFAULT_PROMO.description,
            percent: typeof data.percent === "number" ? data.percent : DEFAULT_PROMO.percent,
            startDate: typeof data.startDate === "string" ? data.startDate : DEFAULT_PROMO.startDate,
            endDate: typeof data.endDate === "string" ? data.endDate : DEFAULT_PROMO.endDate,
            minPdf: typeof data.minPdf === "number" ? data.minPdf : DEFAULT_PROMO.minPdf,
          });
        } else {
          setPromo(DEFAULT_PROMO);
        }
        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setError("Impossibile leggere la configurazione sconti.");
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, COLL_PROMO, DOC_PROMO);
      await setDoc(
        ref,
        {
          enabled: promo.enabled,
          name: promo.name || "",
          description: promo.description || "",
          percent: Number.isFinite(promo.percent) ? promo.percent : 0,
          startDate: promo.startDate || "",
          endDate: promo.endDate || "",
          minPdf: promo.minPdf ?? 1,
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      setError("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Gestione Sconti / Promo</h2>

        {!loaded && <p>Caricamento…</p>}
        {error && <p className={styles.error}>{error}</p>}

        <section className={styles.card}>
          <h3>Stato promo</h3>
          <div className={styles.inline}>
            <label>
              <input
                type="checkbox"
                checked={promo.enabled}
                onChange={(e) =>
                  setPromo((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />{" "}
              Promo attiva
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h3>Dati promo</h3>
          <div className={styles.inline}>
            <label>Nome promo</label>
            <input
              type="text"
              value={promo.name || ""}
              onChange={(e) =>
                setPromo((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className={styles.inline}>
            <label>Descrizione (banner)</label>
            <input
              type="text"
              value={promo.description || ""}
              onChange={(e) =>
                setPromo((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className={styles.inline}>
            <label>Sconto (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={promo.percent}
              onChange={(e) =>
                setPromo((prev) => ({
                  ...prev,
                  percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                }))
              }
            />
          </div>

          <div className={styles.inline}>
            <label>Data inizio (opzionale)</label>
            <input
              type="date"
              value={promo.startDate || ""}
              onChange={(e) =>
                setPromo((prev) => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>

          <div className={styles.inline}>
            <label>Data fine (opzionale)</label>
            <input
              type="date"
              value={promo.endDate || ""}
              onChange={(e) =>
                setPromo((prev) => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>

          <div className={styles.inline}>
            <label>Minimo numero PDF per applicare lo sconto</label>
            <input
              type="number"
              min={1}
              value={promo.minPdf ?? 1}
              onChange={(e) =>
                setPromo((prev) => ({
                  ...prev,
                  minPdf: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? "Salvataggio…" : "Salva configurazione"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScontiGestionale;
