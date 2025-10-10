import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../backend/firebase";
import Header from "../../components/HeaderComponents/Header";
import styles from "./WebGestionale.module.css";

/** ---------- Tipi ---------- */
type TemplateCategory =
  | "facciata"
  | "ecommerce"
  | "portfolio"
  | "blog"
  | "booking"
  | "catalogo"
  | "landing"
  | "istituzionale";

type TemplateMeta = {
  id: string;              // doc id
  title: string;
  short: string;
  category: TemplateCategory;
  previewUrl: string;      // URL immagine anteprima
  demoPath: string;        // link demo/anteprima
  pagesIncluded: string[];
  features: string[];
  minBudget?: number;      // override minimo categoria
  published: boolean;
  order: number;
  createdAt?: any;
  updatedAt?: any;
};

/** ---------- Firestore ---------- */
const TEMPLATES_COL = "web_templates";

/** ---------- Helpers ---------- */
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const blank: Omit<TemplateMeta, "id"> = {
  title: "",
  short: "",
  category: "facciata",
  previewUrl: "",
  demoPath: "",
  pagesIncluded: ["Home", "Contatti"],
  features: ["Responsive design"],
  minBudget: undefined,
  published: true,
  order: 0,
};

/** Tag editor piccolo e veloce */
const TagEditor: React.FC<{
  values: string[];
  placeholder?: string;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}> = ({ values, onAdd, onRemove, placeholder }) => {
  const [val, setVal] = useState("");
  return (
    <div>
      <div className={styles.tagRow}>
        <input
          className={styles.input}
          placeholder={placeholder || "Aggiungi e premi Invio"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = val.trim();
              if (v) onAdd(v);
              setVal("");
            }
          }}
        />
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            const v = val.trim();
            if (v) onAdd(v);
            setVal("");
          }}
        >
          Aggiungi
        </button>
      </div>
      <div className={styles.tagsWrap}>
        {values.map((v) => (
          <span key={v} className={styles.tag}>
            {v}
            <button
              type="button"
              className={styles.tagX}
              aria-label={`Rimuovi ${v}`}
              onClick={() => onRemove(v)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

/** ---------- Componente ---------- */
const WebGestionale: React.FC = () => {
  // Lista
  const [items, setItems] = useState<TemplateMeta[]>([]);
  const [search, setSearch] = useState("");

  // Form unico (crea o modifica)
  const [form, setForm] = useState<Omit<TemplateMeta, "id">>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carica lista realtime (ordinata per "order")
  useEffect(() => {
    const qRef = query(collection(db, TEMPLATES_COL), orderBy("order", "asc"));
    const unsub = onSnapshot(qRef, (snap) => {
      const next: TemplateMeta[] = snap.docs.map((d) => ({
        ...(d.data() as any),
        id: d.id,
      }));
      setItems(next);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return items;
    return items.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.short.toLowerCase().includes(term) ||
        (t.features || []).some((f) => f.toLowerCase().includes(term))
    );
  }, [items, search]);

  /** Azioni form */
  const resetForm = () => {
    setForm(blank);
    setEditingId(null);
  };

  const startEdit = (tpl: TemplateMeta) => {
    const { id, ...rest } = tpl;
    setForm({ ...rest });
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addFeature = (v: string) =>
    setForm((p) => ({
      ...p,
      features: Array.from(new Set([...(p.features || []), v])),
    }));

  const removeFeature = (v: string) =>
    setForm((p) => ({ ...p, features: p.features.filter((x) => x !== v) }));

  const addPage = (v: string) =>
    setForm((p) => ({
      ...p,
      pagesIncluded: Array.from(new Set([...(p.pagesIncluded || []), v])),
    }));

  const removePage = (v: string) =>
    setForm((p) => ({
      ...p,
      pagesIncluded: p.pagesIncluded.filter((x) => x !== v),
    }));

  const safeConfirm = (msg: string) =>
    typeof window !== "undefined" ? window.confirm(msg) : true;

  const handleDelete = async (id: string) => {
    if (!safeConfirm("Eliminare definitivamente questo template?")) return;
    await deleteDoc(doc(db, TEMPLATES_COL, id));
    if (editingId === id) resetForm();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Validazione minima
    if (!form.title.trim()) return alert("Titolo obbligatorio");
    if (!form.previewUrl.trim()) return alert("Anteprima (URL) obbligatoria");
    if (!form.demoPath.trim()) return alert("Link demo obbligatorio");

    setSaving(true);
    try {
      const now = serverTimestamp();
      if (editingId) {
        const payload: any = { ...form, updatedAt: now };
        await updateDoc(doc(db, TEMPLATES_COL, editingId), payload);
      } else {
        // id = slug del titolo (evita collisioni)
        let base = slugify(form.title) || `tpl-${Date.now()}`;
        let finalId = base;
        let i = 1;
        while ((await getDoc(doc(db, TEMPLATES_COL, finalId))).exists()) {
          finalId = `${base}-${i++}`;
        }
        const payload: any = { ...form, createdAt: now, updatedAt: now };
        await setDoc(doc(db, TEMPLATES_COL, finalId), payload);
      }
      resetForm();
    } catch (err) {
      console.error("[WebGestionale] save error:", err);
      alert("Errore durante il salvataggio.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <Header />
      <h1 className={styles.title}>Template Web — gestione semplice</h1>

      {/* FORM RAPIDO: crea/modifica */}
      <form className={styles.card} onSubmit={save} noValidate>
        <h2 className={styles.cardTitle}>
          {editingId ? "Modifica template" : "Nuovo template"}
        </h2>

        <div className={styles.grid}>
          <div>
            <label className={styles.label}>Titolo*</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="es. Portfolio Minimal"
            />
          </div>

          <div>
            <label className={styles.label}>Sottotitolo breve</label>
            <input
              className={styles.input}
              value={form.short}
              onChange={(e) => setForm({ ...form, short: e.target.value })}
              placeholder="Descrizione in una riga"
            />
          </div>

          <div>
            <label className={styles.label}>Categoria*</label>
            <select
              className={styles.select}
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as TemplateCategory })
              }
            >
              <option value="facciata">Facciata</option>
              <option value="ecommerce">E-commerce</option>
              <option value="portfolio">Portfolio</option>
              <option value="blog">Blog</option>
              <option value="booking">Booking</option>
              <option value="catalogo">Catalogo</option>
              <option value="landing">Landing</option>
              <option value="istituzionale">Istituzionale</option>
            </select>
          </div>

          <div>
            <label className={styles.label}>Anteprima (URL immagine)*</label>
            <input
              className={styles.input}
              value={form.previewUrl}
              onChange={(e) => setForm({ ...form, previewUrl: e.target.value })}
              placeholder="https://…/preview.jpg"
            />
            {form.previewUrl && (
              <div className={styles.previewWrap}>
                <img className={styles.preview} src={form.previewUrl} alt="preview" />
              </div>
            )}
          </div>

          <div>
            <label className={styles.label}>Link demo (URL)*</label>
            <input
              className={styles.input}
              value={form.demoPath}
              onChange={(e) => setForm({ ...form, demoPath: e.target.value })}
              placeholder="https://…"
            />
          </div>

          <div>
            <label className={styles.label}>Minimo (override categoria) €</label>
            <input
              className={styles.input}
              type="number"
              min={0}
              placeholder="es. 1500"
              value={form.minBudget ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  minBudget: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div>
            <label className={styles.label}>Ordine</label>
            <input
              className={styles.input}
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className={styles.label}>Pubblicato</label>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={!!form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        <div className={styles.grid}>
          <div>
            <label className={styles.label}>Pagine incluse</label>
            <TagEditor
              values={form.pagesIncluded}
              placeholder="Aggiungi pagina e premi Invio"
              onAdd={addPage}
              onRemove={removePage}
            />
          </div>

          <div>
            <label className={styles.label}>Funzionalità</label>
            <TagEditor
              values={form.features}
              placeholder="Aggiungi feature e premi Invio"
              onAdd={addFeature}
              onRemove={removeFeature}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          {editingId && (
            <button
              className={styles.buttonGhost}
              type="button"
              onClick={resetForm}
            >
              Annulla
            </button>
          )}
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? "Salvo…" : editingId ? "Salva modifiche" : "Crea template"}
          </button>
        </div>
      </form>

      {/* FILTRI LISTA */}
      <div className={styles.row}>
        <input
          className={styles.input}
          placeholder="Cerca per titolo/feature…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LISTA TEMPLATES */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Anteprima</th>
              <th>Titolo</th>
              <th>Categoria</th>
              <th>Min €</th>
              <th>Pubblicato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>{t.order ?? 0}</td>
                <td>
                  <img className={styles.thumb} src={t.previewUrl} alt={t.title} />
                </td>
                <td>
                  <div className={styles.cellTitle}>{t.title}</div>
                  <div className={styles.cellSub}>{t.short}</div>
                </td>
                <td className={styles.capitalize}>{t.category}</td>
                <td>{t.minBudget ? `€ ${t.minBudget}` : "–"}</td>
                <td>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={!!t.published}
                      onChange={(e) =>
                        updateDoc(doc(db, TEMPLATES_COL, t.id), {
                          published: e.target.checked,
                          updatedAt: serverTimestamp(),
                        })
                      }
                    />
                    <span className={styles.slider} />
                  </label>
                </td>
                <td>
                  <div className={styles.actions}>
                    <a
                      className={styles.buttonGhost}
                      href={t.demoPath}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Apri demo
                    </a>
                    <button
                      className={styles.button}
                      type="button"
                      onClick={() => startEdit(t)}
                    >
                      Modifica
                    </button>
                    <button
                      className={styles.buttonDanger}
                      type="button"
                      onClick={() => handleDelete(t.id)}
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className={styles.emptyTd} colSpan={7}>
                  Nessun template
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WebGestionale;
