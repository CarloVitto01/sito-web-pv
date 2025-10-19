// src/gestionale/GestionaleA4/A4Gestionale.tsx
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
import styles from "./A4Gestionale.module.css";
import Header from "../../components/HeaderComponents/Header";
import { getStorage, ref, deleteObject } from "firebase/storage";

type Costi = {
  foglio: number;
  biancoNero: number;
  colore: number;
  anelli: number;
  fascetta: number;
  ciappatura: number;
  spirale: number;
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
  file?: string[];
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

// NEW: default dei costi interni
const defaultInterni: Costi = {
  foglio: 0.009,        // carta comune a foglio
  biancoNero: 0.005,    // inchiostro/manutenzione B/N a foglio
  colore: 0.020,        // inchiostro/manutenzione colore a foglio
  anelli: 0.50,         // materiale anelli
  fascetta: 0.30,       // fascetta/busta
  ciappatura: 0.05,     // punti
  spirale: 0.80,        // spirale/buste/copertina
};

const defaultExtras: CostoExtra[] = [
  { id: crypto.randomUUID(), nome: "Scarto lavorazione", unita: "percentuale", costo: 2, note: "2% sul lordo", attivo: true },
];

const A4Gestionale: React.FC = () => {
  const [costi, setCosti] = useState<Costi>(defaultCosti);
  const [interni, setInterni] = useState<Costi>(defaultInterni); // NEW
  const [costiAcquisto, setCostiAcquisto] = useState<CostoExtra[]>(defaultExtras);
  const [ordini, setOrdini] = useState<Ordine[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // ======== Firestore: live config ========
  useEffect(() => {
    const costiRef = doc(db, "configA4", "costi");
    const unsub = onSnapshot(costiRef, (snap) => {
      if (!snap.exists()) {
        setCosti(defaultCosti);
        setInterni(defaultInterni);
        setCostiAcquisto(defaultExtras);
        return;
      }
      const data = snap.data() as any;

      // costi base (se li usi altrove)
      setCosti({
        foglio: Number(data?.foglio ?? defaultCosti.foglio) || 0,
        biancoNero: Number(data?.biancoNero ?? defaultCosti.biancoNero) || 0,
        colore: Number(data?.colore ?? defaultCosti.colore) || 0,
        anelli: Number(data?.anelli ?? defaultCosti.anelli) || 0,
        fascetta: Number(data?.fascetta ?? defaultCosti.fascetta) || 0,
        ciappatura: Number(data?.ciappatura ?? defaultCosti.ciappatura) || 0,
        spirale: Number(data?.spirale ?? defaultCosti.spirale) || 0,
      });

      // NEW: costi interni dedicati
      const i = data?.interni ?? {};
      setInterni({
        foglio: Number(i?.foglio ?? defaultInterni.foglio) || 0,
        biancoNero: Number(i?.biancoNero ?? defaultInterni.biancoNero) || 0,
        colore: Number(i?.colore ?? defaultInterni.colore) || 0,
        anelli: Number(i?.anelli ?? defaultInterni.anelli) || 0,
        fascetta: Number(i?.fascetta ?? defaultInterni.fascetta) || 0,
        ciappatura: Number(i?.ciappatura ?? defaultInterni.ciappatura) || 0,
        spirale: Number(i?.spirale ?? defaultInterni.spirale) || 0,
      });

      // extra
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
        setCostiAcquisto(defaultExtras);
      }
    });
    return () => unsub();
  }, []);

  // ======== Firestore: ordini A4 ========
  useEffect(() => {
    const fetchOrdini = async () => {
      const querySnapshot = await getDocs(collection(db, "StampePDFA4"));
      const docs: Ordine[] = querySnapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;
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

  // ======== Handlers base ========
  const handleChangeBase = (e: React.ChangeEvent<HTMLInputElement>, setFn: React.Dispatch<React.SetStateAction<Costi>>) => {
    const { name, value } = e.target;
    const n = parseFloat(value.replace(",", "."));
    setFn((prev) => ({ ...prev, [name]: isNaN(n) ? 0 : n }));
  };

  // ======== Extra ========
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

  // ======== Save ========
  const handleSave = async () => {
    try {
      setSaveState("saving");
      const refDoc = doc(db, "configA4", "costi");
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
          interni: { ...interni }, // NEW: salvo i costi interni per campo
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

  // ======== Delete ordine + files ========
  const handleDelete = async (id: string) => {
    const ordine = ordini.find((o) => o.id === id);
    if (!ordine) return;
    if (!window.confirm(`Eliminare definitivamente l’ordine di ${ordine.nome} ${ordine.cognome}?`)) return;

    const storage = getStorage();
    if (ordine?.file?.length) {
      for (const fileUrl of ordine.file) {
        try {
          const decodedUrl = decodeURIComponent(fileUrl.split("?")[0]);
          const pathStart = decodedUrl.indexOf("/o/") + 3;
          const pathEnd = decodedUrl.indexOf(".pdf", pathStart) + 4;
          const fullPath = decodedUrl.substring(pathStart, pathEnd).replace(/%2F/g, "/");
          await deleteObject(ref(storage, fullPath));
        } catch (err) {
          console.error("Errore eliminazione file:", fileUrl, err);
        }
      }
    }
    await deleteDoc(doc(db, "StampePDFA4", id));
    setOrdini((prev) => prev.filter((o) => o.id !== id));
  };

  // ======== UI ========
  const renderGrid = (state: Costi, setFn: React.Dispatch<React.SetStateAction<Costi>>) => (
    <div className={styles.grid}>
      {Object.entries(state).map(([key, value]) => (
        <div key={key} className={styles.field}>
          <label className={styles.label} htmlFor={`${key}`}>{key}</label>
          <input
            id={`${key}`}
            name={key}
            type="number"
            step="0.001"
            min={0}
            className={styles.input}
            value={value}
            onChange={(e) => handleChangeBase(e, setFn)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.wrapper}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🛠️ Gestionale A4</h1>
            <p className={styles.pageSubtitle}>
              Imposta i <strong>costi base</strong> (facoltativi) e i <strong>costi interni</strong> per ogni voce. Questi ultimi verranno usati per il calcolo del margine netto.
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

        {/* Costi base (eventuale listino) */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>⚙️ Costi base A4</h2>
          </div>
          {renderGrid(costi, setCosti)}
        </section>

        {/* NEW: Costi interni */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.title}>💶 Costi interni A4</h2>
          </div>
          {renderGrid(interni, setInterni)}
          <p className={styles.helper}>
            Questi valori sono i <em>costi reali</em> per unità usati in <strong>Storico Dati</strong> per
            calcolare “Costi interni (€)” e di conseguenza il “Margine netto (€)”.
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
                          <input type="checkbox" checked={row.attivo} onChange={(e) => updateExtra(row.id, "attivo", e.target.checked)} />
                          <span className={styles.slider} />
                        </label>
                      </td>
                      <td>
                        <input className={styles.input} placeholder="Es. Carta premium 120g" value={row.nome} onChange={(e) => updateExtra(row.id, "nome", e.target.value)} />
                      </td>
                      <td>
                        <select className={styles.select} value={row.unita} onChange={(e) => updateExtra(row.id, "unita", e.target.value as CostoExtra["unita"])}>
                          <option value="per_foglio">Per foglio</option>
                          <option value="per_fascicolo">Per fascicolo</option>
                          <option value="per_ordine">Per ordine</option>
                          <option value="percentuale">Percentuale (%)</option>
                        </select>
                      </td>
                      <td>
                        <input className={styles.input} type="number" step="0.001" min={0} value={row.costo} onChange={(e) => updateExtra(row.id, "costo", parseFloat(e.target.value) || 0)} />
                      </td>
                      <td>
                        <input className={styles.input} placeholder='es. "rilegatura", "inchiostro", "grammatura"' value={row.campo ?? ""} onChange={(e) => updateExtra(row.id, "campo", e.target.value)} />
                      </td>
                      <td>
                        <input className={styles.input} placeholder="stringa (case-insensitive)" value={row.match ?? ""} onChange={(e) => updateExtra(row.id, "match", e.target.value)} />
                      </td>
                      <td>
                        <input className={styles.input} placeholder="Nota opzionale" value={row.note ?? ""} onChange={(e) => updateExtra(row.id, "note", e.target.value)} />
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
            <h2 className={styles.title}>📁 Ordini A4</h2>
          </div>
          <ul className={styles.orderList}>
            {ordini.map((ordine) => (
              <li key={ordine.id} className={styles.orderItem}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderName}>{ordine.nome} {ordine.cognome}</div>
                  <div className={styles.orderMeta}>{ordine.telefono} · {ordine.email}</div>
                  {ordine.file?.length ? (
                    <ul className={styles.fileList}>
                      {ordine.file.map((link, index) => (
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

export default A4Gestionale;
