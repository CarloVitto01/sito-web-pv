// src/gestionale/BobinePLAGestionale.tsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../backend/firebase";
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";
import styles from "./BobineGestionale.module.css";

type Spool = {
  id: string;
  label: string;
  material: string;
  hex: string;
  available: boolean;
  updatedAt?: any;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeHex(hex?: string) {
  if (!hex) return "#000000";
  let h = hex.trim();
  if (!h.startsWith("#")) h = "#" + h;
  if (h.length === 4) {
    const r = h[1], g = h[2], b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  return h.slice(0, 7).toLowerCase();
}

function setHexNormalized(setter: (v: string) => void, value: string) {
  let h = value.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    const r = h[1], g = h[2], b = h[3];
    h = `#${r}${r}${g}${g}${b}${b}`;
  }
  setter(h.slice(0, 7).toLowerCase());
}

const BobinePLAGestionale: React.FC = () => {
  const [spools, setSpools] = useState<Spool[]>([]);
  const [filter, setFilter] = useState<"all" | "available" | "unavailable">("all");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // form nuova/modifica
  const [editId, setEditId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [material, setMaterial] = useState("PLA");
  const [hex, setHex] = useState("#151515");
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    // Ordiniamo direttamente per label (niente indici compositi)
    const qRef = query(collection(db, "pla_spools"), orderBy("label", "asc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setLoadError(null);
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Spool, "id">) }));
        setSpools(rows);
      },
      (err) => {
        console.error("onSnapshot error:", err);
        setLoadError(err?.message ?? String(err));
      }
    );
    return () => unsub();
  }, []);

  // Filtro + ordinamento per label lato client
  const view = useMemo(() => {
    let rows = spools;
    if (filter === "available") rows = rows.filter((s) => s.available);
    if (filter === "unavailable") rows = rows.filter((s) => !s.available);
    return [...rows].sort((a, b) => a.label.localeCompare(b.label));
  }, [spools, filter]);

  function clearForm() {
    setEditId(null);
    setLabel("");
    setMaterial("PLA");
    setHex("#151515");
    setAvailable(true);
  }

  async function saveSpool(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      label: label.trim(),
      material: (material || "").trim() || "PLA",
      hex: normalizeHex(hex),
      available: !!available,
      updatedAt: serverTimestamp(),
    };

    if (!payload.label) return alert("Inserisci un nome/etichetta.");
    if (!/^#[0-9a-f]{6}$/i.test(payload.hex)) return alert("HEX non valido. Usa #RRGGBB.");

    setSaving(true);
    try {
      const id = editId ?? slugify(payload.label);
      if (!id) throw new Error("Label non valida per creare lo slug.");
      await setDoc(doc(db, "pla_spools", id), payload);
      clearForm();
    } catch (err: any) {
      console.error("saveSpool error:", err);
      alert("Errore durante il salvataggio: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(s: Spool) {
    setEditId(s.id);
    setLabel(s.label);
    setMaterial(s.material || "PLA");
    setHex(s.hex || "#151515");
    setAvailable(!!s.available);
  }

  async function toggleAvailable(s: Spool) {
    try {
      await updateDoc(doc(db, "pla_spools", s.id), {
        available: !s.available,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("toggleAvailable error:", err);
      alert("Errore aggiornando la disponibilità: " + (err?.message || String(err)));
    }
  }

  async function removeSpool(s: Spool) {
    if (!window.confirm(`Eliminare la bobina “${s.label}”?`)) return;
    try {
      await deleteDoc(doc(db, "pla_spools", s.id));
      if (editId === s.id) clearForm();
    } catch (err: any) {
      console.error("removeSpool error:", err);
      alert("Errore eliminando la bobina: " + (err?.message || String(err)));
    }
  }

  return (
    <div className={styles.container}>
      <h1>Gestionale Bobine PLA</h1>
      <p className={styles.subtitle}>
        Crea/aggiorna le bobine disponibili per la richiesta stampa 3D. Le bobine con
        <strong> Disponibile = NO</strong> non compaiono ai clienti.
      </p>

      {loadError && (
        <div className={styles.error}>
          Errore nel caricamento: {loadError}
          <br />
          (Controlla console: regole/permessi o indice Firestore)
        </div>
      )}

      <div className={styles.panelGrid}>
        {/* Lista */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Elenco bobine</h2>
            <div className={styles.filters}>
              <label>
                Vista:&nbsp;
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                  <option value="all">Tutte</option>
                  <option value="available">Solo disponibili</option>
                  <option value="unavailable">Solo non disponibili</option>
                </select>
              </label>
            </div>
          </div>

          {view.length === 0 ? (
            <p className={styles.muted}>Nessuna bobina trovata.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Colore</th>
                  <th>Label</th>
                  <th>Materiale</th>
                  <th>HEX</th>
                  <th>Disponibile</th>
                  <th style={{ width: 220 }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {view.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className={styles.swatch} style={{ background: normalizeHex(s.hex) }} />
                    </td>
                    <td>{s.label}</td>
                    <td>{s.material}</td>
                    <td><code>{normalizeHex(s.hex)}</code></td>
                    <td>
                      <span className={s.available ? styles.badgeOk : styles.badgeNo}>
                        {s.available ? "Sì" : "No"}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.btn} onClick={() => startEdit(s)}>Modifica</button>
                      <button className={styles.btn} onClick={() => toggleAvailable(s)}>
                        {s.available ? "Metti NON disp." : "Metti DISP."}
                      </button>
                      <button className={styles.btnDanger} onClick={() => removeSpool(s)}>Elimina</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Form */}
        <section className={styles.card}>
          <h2>{editId ? "Modifica bobina" : "Nuova bobina"}</h2>
          <form onSubmit={saveSpool} className={styles.form} noValidate>
            {!editId && (
              <p className={styles.hint}>
                L’ID verrà creato automaticamente dalla label (slug). Per cambiare l’ID,
                elimina e ricrea.
              </p>
            )}

            <label className={styles.field}>
              <span>Label</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Es. PLA Nero (1.75mm)"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Materiale</span>
              <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="PLA" />
            </label>

            <label className={styles.field}>
              <span>Colore</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="color"
                  value={normalizeHex(hex)}
                  onChange={(e) => setHex(e.target.value)}
                  aria-label="Selettore colore"
                  style={{ width: 46, height: 36, padding: 0, border: "1px solid #333", borderRadius: 8, background: "transparent" }}
                />
                <input
                  value={hex}
                  onChange={(e) => setHex(e.target.value)}
                  onBlur={(e) => setHexNormalized(setHex, e.target.value)}
                  placeholder="#151515"
                  pattern="^#?[0-9A-Fa-f]{6}$"
                  title="Inserisci un colore HEX (#RRGGBB)"
                  style={{ flex: 1, background: "#101010", color: "#fff", border: "1px solid #333", borderRadius: 10, padding: "8px 10px" }}
                  required
                />
              </div>
            </label>

            <label className={styles.checkbox}>
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
              <span>Disponibile</span>
            </label>

            <div className={styles.formActions}>
              <button className={styles.btnPrimary} type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : editId ? "Salva modifiche" : "Crea bobina"}
              </button>
              {editId && (
                <button className={styles.btn} type="button" onClick={clearForm} disabled={saving}>
                  Annulla modifica
                </button>
              )}
            </div>
          </form>

          <div className={styles.previewRow}>
            <span className={styles.swatchLg} style={{ background: normalizeHex(hex) }} />
            <code>{normalizeHex(hex)}</code>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BobinePLAGestionale;
