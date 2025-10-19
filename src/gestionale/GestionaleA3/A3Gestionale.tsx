// src/gestionale/GestionaleA3/A3Gestionale.tsx
import React, { useEffect, useState } from "react";
import { db } from "../../backend/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import styles from "./A3Gestionale.module.css";
import Header from "../../components/HeaderComponents/Header";
import { getStorage, ref, deleteObject } from "firebase/storage";

/* ===== Tipi ===== */
type CostiA3 = {
  grammaturaNormale: number;
  grammaturaCartoncino: number;
  biancoNero: number;
  colore: number;
  plastificazione: number;
};

type InterniA3 = {
  foglio: number;        // costo reale carta A3 a foglio
  biancoNero: number;    // costo reale BN per lato
  colore: number;        // costo reale colore per lato
  plastificazione: number; // costo reale plastificazione per foglio
};

type CostoExtra = {
  id: string;
  nome: string;
  unita: "per_foglio" | "per_ordine" | "percentuale" | "per_fascicolo";
  costo: number;
  note?: string;
  attivo: boolean;
  campo?: string;
  match?: string;
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

/* ===== Default ===== */
const defaultCostiA3: CostiA3 = {
  grammaturaNormale: 0.12,
  grammaturaCartoncino: 0.17,
  biancoNero: 0.03,
  colore: 0.13,
  plastificazione: 0.3,
};

const defaultInterniA3: InterniA3 = {
  foglio: 0.06,
  biancoNero: 0.010,
  colore: 0.030,
  plastificazione: 0.15,
};

const seedExtras: CostoExtra[] = [
  { id: crypto.randomUUID(), nome: "Scarto lavorazione", unita: "percentuale", costo: 2, note: "2% sul lordo", attivo: true },
];

/* ===== Component ===== */
const A3Gestionale: React.FC = () => {
  const [costi, setCosti] = useState<CostiA3>(defaultCostiA3);
  const [interni, setInterni] = useState<InterniA3>(defaultInterniA3);
  const [costiAcquisto, setCostiAcquisto] = useState<CostoExtra[]>(seedExtras);

  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  /* ===== Firestore: live config ===== */
  useEffect(() => {
    const costiRef = doc(db, "configA3", "costi");
    const unsub = onSnapshot(costiRef, (snap) => {
      if (!snap.exists()) {
        setCosti(defaultCostiA3);
        setInterni(defaultInterniA3);
        setCostiAcquisto(seedExtras);
        return;
      }
      const data = snap.data() as any;

      setCosti({
        grammaturaNormale: Number(data?.grammaturaNormale ?? defaultCostiA3.grammaturaNormale) || 0,
        grammaturaCartoncino: Number(data?.grammaturaCartoncino ?? defaultCostiA3.grammaturaCartoncino) || 0,
        biancoNero: Number(data?.biancoNero ?? defaultCostiA3.biancoNero) || 0,
        colore: Number(data?.colore ?? defaultCostiA3.colore) || 0,
        plastificazione: Number(data?.plastificazione ?? defaultCostiA3.plastificazione) || 0,
      });

      const i = data?.interni ?? {};
      setInterni({
        foglio: Number(i?.foglio ?? defaultInterniA3.foglio) || 0,
        biancoNero: Number(i?.biancoNero ?? defaultInterniA3.biancoNero) || 0,
        colore: Number(i?.colore ?? defaultInterniA3.colore) || 0,
        plastificazione: Number(i?.plastificazione ?? defaultInterniA3.plastificazione) || 0,
      });

      if (Array.isArray(data?.costiAcquisto)) {
        const safe: CostoExtra[] = data.costiAcquisto
          .map((x: any) => ({
            id: String(x.id ?? crypto.randomUUID()),
            nome: String(x.nome ?? ""),
            unita: (x.unita as CostoExtra["unita"]) ?? "per_ordine",
            costo: Number(x.costo ?? 0) || 0,
            note: x.note ? String(x.note) : "",
            attivo: Boolean(x.attivo ?? true),
            campo: x.campo ? String(x.campo) : "",
            match: x.match ? String(x.match) : "",
          }))
          .filter((x: CostoExtra) => x.nome.trim().length > 0);
        setCostiAcquisto(safe);
      } else {
        setCostiAcquisto(seedExtras);
      }
    });
    return () => unsub();
  }, []);

  /* ===== Firestore: ordini A3 ===== */
  useEffect(() => {
    const fetchOrdini = async () => {
      const querySnapshot = await getDocs(collection(db, "StampePDFA3"));
      const docs: Ordine[] = querySnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;
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

  /* ===== Handlers ===== */
  const handleChange = <T extends object>(
    setter: React.Dispatch<React.SetStateAction<T>>
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const n = parseFloat((value || "").toString().replace(",", "."));
    setter((prev) => ({ ...prev, [name]: isNaN(n) ? 0 : n } as T));
  };

  const addExtraRow = () => {
    setCostiAcquisto((prev) => [
      {
        id: crypto.randomUUID(),
        nome: "",
        unita: "per_ordine",
        costo: 0,
        note: "",
        attivo: true,
        campo: "",
        match: "",
      },
      ...prev,
    ]);
  };

  const updateExtra = <K extends keyof CostoExtra>(id: string, key: K, value: CostoExtra[K]) => {
    setCostiAcquisto((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const deleteExtra = (id: string) => {
    setCostiAcquisto((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSave = async () => {
    try {
      setSaveState("saving");
      const refDoc = doc(db, "configA3", "costi");

      const cleanedExtras = costiAcquisto
        .filter((x) => x.nome.trim().length > 0)
        .map((x) => ({
          ...x,
          costo: Number.isFinite(x.costo) ? x.costo : 0,
          campo: (x.campo ?? "").trim(),
          match: (x.match ?? "").trim(),
        }));

      await setDoc(
        refDoc,
        {
          ...costi,
          interni: { ...interni },
          costiAcquisto: cleanedExtras,
        },
        { merge: true }
      );

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    const ordine = ordini.find((o) => o.id === id);
    if (!ordine) return;
    if (!window.confirm(`Eliminare definitivamente l’ordine di ${ordine.nome} ${ordine.cognome}?`)) return;

    const storage = getStorage();
    if (ordine?.files?.length) {
      for (const fileUrl of ordine.files) {
        try {
          const decodedUrl = decodeURIComponent(fileUrl.split("?")[0]);
          const pathStart = decodedUrl.indexOf("/o/") + 3;
          const pathEnd = decodedUrl.indexOf(".pdf", pathStart) + 4;
          const fullPath = decodedUrl.substring(pathStart, pathEnd).replace(/%2F/g, "/");
          await deleteObject(ref(storage, fullPath));
        } catch (err) {
          console.error("❌ Errore eliminazione file:", fileUrl, err);
        }
      }
    }
    await deleteDoc(doc(db, "StampePDFA3", id));
    setOrdini((prev) => prev.filter((o) => o.id !== id));
  };

  /* ===== UI helpers ===== */
  const renderGrid = <T extends object>(
    state: T,
    setFn: React.Dispatch<React.SetStateAction<T>>
  ) => (
    <div className={styles.grid}>
      {Object.entries(state as Record<string, number>).map(([key, value]) => (
        <div key={key} className={styles.field}>
          <label className={styles.label} htmlFor={key}>{key}</label>
          <input
            id={key}
            name={key}
            type="number"
            step="0.001"
            min={0}
            className={styles.input}
            value={value}
            onChange={handleChange(setFn)}
          />
        </div>
      ))}
    </div>
  );

  /* ===== Render ===== */
  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.wrapper}>
        {/* Header pagina */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🛠️ Gestionale A3</h1>
            <p className={styles.pageSubtitle}>
              Imposta i <strong>costi base</strong> e i <strong>costi interni</strong> per il formato A3. I costi interni sono usati in <em>Storico Dati</em> per il margine netto.
            </p>
          </div>
          <div className={styles.actionsBar} aria-live="polite" role="status">
            <button onClick={handleSave} className={styles.primaryBtn} disabled={saveState === "saving"}>
              {saveState === "saving" ? "⏳ Salvataggio…" : "💾 Salva impostazioni"}
            </button>
            {saveState === "saved" && <span className={styles.badgeSuccess}>✅ Salvato</span>}
            {saveState === "error" && <span className={styles.badgeWarn}>⚠️ Errore</span>}
          </div>
        </div>

        {/* Costi base A3 */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>⚙️ Costi base A3</h2>
          </div>
          {renderGrid<CostiA3>(costi, setCosti)}
        </section>

        {/* Costi interni A3 */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>💶 Costi interni A3</h2>
          </div>
          {renderGrid<InterniA3>(interni, setInterni)}
          <p className={styles.helper}>
            Questi valori sono i <em>costi reali</em> per unità usati in <strong>Storico Dati</strong>.
          </p>
        </section>

        {/* Extra condizionali */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>📦 Costi extra (condizionali)</h2>
            <button className={styles.ghostBtn} onClick={addExtraRow}>➕ Aggiungi costo</button>
          </div>

          {costiAcquisto.length === 0 ? (
            <p className={styles.muted}>Nessun extra. Aggiungi nuovi costi condizionali con “Aggiungi costo”.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Attivo</th>
                    <th>Nome</th>
                    <th>Unità</th>
                    <th>Valore</th>
                    <th>Campo</th>
                    <th>Match</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {costiAcquisto.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <label className={styles.switch}>
                          <input
                            type="checkbox"
                            checked={row.attivo}
                            onChange={(e) => updateExtra(row.id, "attivo", e.target.checked)}
                          />
                          <span className={styles.slider} />
                        </label>
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          placeholder="Es. Carta cartoncino A3"
                          value={row.nome}
                          onChange={(e) => updateExtra(row.id, "nome", e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.select}
                          value={row.unita}
                          onChange={(e) =>
                            updateExtra(row.id, "unita", e.target.value as CostoExtra["unita"])
                          }
                        >
                          <option value="per_foglio">Per foglio</option>
                          <option value="per_fascicolo">Per fascicolo</option>
                          <option value="per_ordine">Per ordine</option>
                          <option value="percentuale">Percentuale (%)</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          type="number"
                          step="0.001"
                          min={0}
                          value={row.costo}
                          onChange={(e) => updateExtra(row.id, "costo", parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          placeholder='es. "grammatura", "inchiostro", "plastificazione", "rilegatura"'
                          value={row.campo ?? ""}
                          onChange={(e) => updateExtra(row.id, "campo", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          placeholder="stringa (case-insensitive)"
                          value={row.match ?? ""}
                          onChange={(e) => updateExtra(row.id, "match", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.input}
                          placeholder="Nota opzionale"
                          value={row.note ?? ""}
                          onChange={(e) => updateExtra(row.id, "note", e.target.value)}
                        />
                      </td>
                      <td className={styles.cellRight}>
                        <button className={styles.deleteButton} onClick={() => deleteExtra(row.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={styles.helper}>
                “Percentuale” applica una % sul lordo; le altre unità moltiplicano per fogli/fascicoli/ordine.
                Se imposti <strong>Campo/Match</strong>, l’extra si applica solo quando il campo dell’ordine contiene il testo indicato.
              </p>
            </div>
          )}
        </section>

        {/* ORDINI */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>📁 Ordini A3</h2>
          </div>
          <ul className={styles.orderList}>
            {ordini.map((ordine) => (
              <li key={ordine.id} className={styles.orderItem}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderName}>{ordine.nome} {ordine.cognome}</div>
                  <div className={styles.orderMeta}>{ordine.telefono} · {ordine.email}</div>
                  {ordine.files?.length ? (
                    <ul className={styles.fileList}>
                      {ordine.files.map((link, index) => (
                        <li key={index}><a href={link} target="_blank" rel="noopener noreferrer">📄 PDF {index + 1}</a></li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button onClick={() => handleDelete(ordine.id)} className={styles.dangerBtn}>🗑️ Elimina ordine</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default A3Gestionale;
