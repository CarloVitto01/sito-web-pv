import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import Header from "../../components/HeaderComponents/Header";
import styles from "./BannerGestionale.module.css";

type Variant = "info" | "warning" | "success" | "error" | "christmas";

type BannerData = {
  enabled: boolean;
  text: string;
  variant: Variant;
};

const defaultData: BannerData = {
  enabled: false,
  text: "",
  variant: "info",
};

const BannerGestionale: React.FC = () => {
  const [form, setForm] = useState<BannerData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, "config", "homeBanner");
    const unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() as Partial<BannerData> | undefined;
      if (d) {
        setForm({
          enabled: d.enabled ?? false,
          text: d.text ?? "",
          variant: (d.variant as Variant) ?? "info",
        });
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "config", "homeBanner"),
        {
          enabled: form.enabled,
          text: form.text,
          variant: form.variant,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSavedMsg("Salvato!");
      setTimeout(() => setSavedMsg(null), 1500);
    } catch (e: any) {
      setSavedMsg("Errore nel salvataggio");
      setTimeout(() => setSavedMsg(null), 2500);
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.card}>
        <h1>Banner Home</h1>

        <label className={styles.row}>
          <span>Attivo</span>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
          />
        </label>

        <label className={styles.col}>
          <span>Testo banner</span>
          <textarea
            rows={3}
            value={form.text}
            placeholder="Scrivi l'avviso da mostrare in home…"
            onChange={(e) =>
              setForm((f) => ({ ...f, text: e.target.value }))
            }
          />
        </label>

        <label className={styles.row}>
          <span>Stile</span>
          <select
            value={form.variant}
            onChange={(e) =>
              setForm((f) => ({ ...f, variant: e.target.value as Variant }))
            }
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="christmas">Promo Natale</option>
          </select>
        </label>

        <div className={styles.previewBlock}>
          <span>Anteprima</span>
          <div className={`${styles.preview} ${styles[form.variant]}`}>
            {form.text || "— nessun testo —"}
          </div>
        </div>

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvataggio…" : "Salva"}
        </button>
        {savedMsg && <div className={styles.savedMsg}>{savedMsg}</div>}
      </main>
    </div>
  );
};

export default BannerGestionale;
