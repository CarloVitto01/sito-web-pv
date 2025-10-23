import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../backend/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import styles from "./ConsegneGestionale.module.css";
import Header from "../../components/HeaderComponents/Header";

type TimeRange = { start: string; end: string };
type BlacklistRange = { from: string; to: string };

type DeliveryConfig = {
  weekdays: number[];         // 1..7 (1=Lun ... 7=Dom)
  timeRanges: TimeRange[];    // una o più fasce orarie
  slotsAhead: number;         // quanti slot totali generare
  timezone?: string;          // es. "Europe/Rome"
  blacklistDates?: string[];  // YYYY-MM-DD singole
  blacklistRanges?: BlacklistRange[]; // intervalli [from,to] in YYYY-MM-DD
};

const COLL = "configConsegne";
const DOCID = "settings";

const DEFAULT_CFG: DeliveryConfig = {
  weekdays: [1, 3, 5],
  timeRanges: [{ start: "12:00", end: "13:00" }],
  slotsAhead: 6,
  timezone: "Europe/Rome",
  blacklistDates: [],
  blacklistRanges: [],
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** Utils formattazione */
const toIt = (iso: string) => {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

const sortISO = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sortRange = (a: BlacklistRange, b: BlacklistRange) =>
  a.from === b.from ? sortISO(a.to, b.to) : sortISO(a.from, b.from);

const ConsegneGestionale: React.FC = () => {
  const [cfg, setCfg] = useState<DeliveryConfig>(DEFAULT_CFG);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"single" | "range">("single");
  const [singleDate, setSingleDate] = useState<string>(""); // YYYY-MM-DD
  const [rangeFrom, setRangeFrom] = useState<string>(""); // YYYY-MM-DD
  const [rangeTo, setRangeTo] = useState<string>(""); // YYYY-MM-DD
  const [modalError, setModalError] = useState<string | null>(null);

  // live load
  useEffect(() => {
    const ref = doc(db, COLL, DOCID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<DeliveryConfig>;
          setCfg({
            weekdays:
              Array.isArray(data.weekdays) && data.weekdays.length
                ? (data.weekdays as number[])
                : DEFAULT_CFG.weekdays,
            timeRanges:
              Array.isArray(data.timeRanges) && data.timeRanges.length
                ? (data.timeRanges as TimeRange[])
                : DEFAULT_CFG.timeRanges,
            slotsAhead:
              typeof data.slotsAhead === "number"
                ? data.slotsAhead
                : DEFAULT_CFG.slotsAhead,
            timezone:
              typeof data.timezone === "string" && data.timezone
                ? data.timezone
                : DEFAULT_CFG.timezone,
            blacklistDates: Array.isArray(data.blacklistDates)
              ? (data.blacklistDates as string[]).slice().sort(sortISO)
              : [],
            blacklistRanges: Array.isArray(data.blacklistRanges)
              ? (data.blacklistRanges as BlacklistRange[]).slice().sort(sortRange)
              : [],
          });
        } else {
          setCfg(DEFAULT_CFG);
        }
        setLoaded(true);
      },
      (err) => {
        console.error(err);
        setError("Impossibile leggere la configurazione.");
        setLoaded(true);
      }
    );
    return () => unsub();
  }, []);

  const toggleWeekday = (wd: number) => {
    setCfg((prev) => {
      const has = prev.weekdays.includes(wd);
      const weekdays = has
        ? prev.weekdays.filter((x) => x !== wd)
        : [...prev.weekdays, wd];
      weekdays.sort((a, b) => a - b);
      return { ...prev, weekdays };
    });
  };

  const updateTimeRange = (idx: number, key: "start" | "end", val: string) => {
    setCfg((prev) => {
      const tr = [...prev.timeRanges];
      tr[idx] = { ...tr[idx], [key]: val };
      return { ...prev, timeRanges: tr };
    });
  };

  const addTimeRange = () => {
    setCfg((prev) => ({
      ...prev,
      timeRanges: [...prev.timeRanges, { start: "12:00", end: "13:00" }],
    }));
  };

  const removeTimeRange = (idx: number) => {
    setCfg((prev) => {
      const tr = [...prev.timeRanges];
      tr.splice(idx, 1);
      return {
        ...prev,
        timeRanges: tr.length ? tr : [{ start: "12:00", end: "13:00" }],
      };
    });
  };

  // === Blacklist: Modal openers ===
  const openAddSingle = () => {
    setModalMode("single");
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setModalError(null);
    setModalOpen(true);
  };
  const openAddRange = () => {
    setModalMode("range");
    setSingleDate("");
    setRangeFrom("");
    setRangeTo("");
    setModalError(null);
    setModalOpen(true);
  };

  // === Blacklist: Add/Remove ===
  const addBlacklistSingle = () => {
    if (!singleDate) {
      setModalError("Seleziona una data.");
      return;
    }
    setCfg((prev) => {
      const setUnique = new Set([...(prev.blacklistDates || []), singleDate]);
      const arr = Array.from(setUnique).sort(sortISO);
      return { ...prev, blacklistDates: arr };
    });
    setModalOpen(false);
  };

  const addBlacklistRange = () => {
    if (!rangeFrom || !rangeTo) {
      setModalError("Compila entrambe le date (dal/al).");
      return;
    }
    if (rangeFrom > rangeTo) {
      setModalError("L'intervallo non è valido: 'dal' è successivo ad 'al'.");
      return;
    }
    setCfg((prev) => {
      const ranges = [...(prev.blacklistRanges || []), { from: rangeFrom, to: rangeTo }];
      ranges.sort(sortRange);
      return { ...prev, blacklistRanges: ranges };
    });
    setModalOpen(false);
  };

  const removeBlacklistDate = (d: string) => {
    setCfg((prev) => ({
      ...prev,
      blacklistDates: (prev.blacklistDates || []).filter((x) => x !== d),
    }));
  };

  const removeBlacklistRange = (r: BlacklistRange) => {
    setCfg((prev) => ({
      ...prev,
      blacklistRanges: (prev.blacklistRanges || []).filter(
        (x) => !(x.from === r.from && x.to === r.to)
      ),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const ref = doc(db, COLL, DOCID);
      await setDoc(
        ref,
        {
          weekdays: cfg.weekdays,
          timeRanges: cfg.timeRanges,
          slotsAhead: cfg.slotsAhead,
          timezone: cfg.timezone || "Europe/Rome",
          blacklistDates: cfg.blacklistDates || [],
          blacklistRanges: cfg.blacklistRanges || [],
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

  const preview = useMemo(() => {
    const singles =
      (cfg.blacklistDates || []).length
        ? `Escluse singole: ${(cfg.blacklistDates || [])
          .map(toIt)
          .join(", ")}`
        : "";
    const ranges =
      (cfg.blacklistRanges || []).length
        ? `Intervalli: ${(cfg.blacklistRanges || [])
          .map((r) => `${toIt(r.from)}–${toIt(r.to)}`)
          .join(" | ")}`
        : "";
    return [
      `Giorni: ${cfg.weekdays
        .slice()
        .sort()
        .map((w) => DAY_LABELS[w % 7])
        .join(", ")}`,
      `Fasce: ${cfg.timeRanges.map((t) => `${t.start}-${t.end}`).join(" | ")}`,
      `Slots mostrati: ${cfg.slotsAhead}`,
      singles,
      ranges,
    ]
      .filter(Boolean)
      .join(" • ");
  }, [cfg]);

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Gestione Consegne (Riepilogo A4/A3)</h2>
        {!loaded ? <p>Caricamento…</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        {/* Giorni */}
        <section className={styles.card}>
          <h3>Giorni della settimana</h3>
          <div className={styles.daysGrid}>
            {DAY_LABELS.map((lab, i) => {
              const wd = i === 0 ? 7 : i; // 1..7 con 7=Dom
              const checked = cfg.weekdays.includes(wd);
              return (
                <label
                  key={wd}
                  className={`${styles.day} ${checked ? styles.dayOn : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWeekday(wd)}
                  />
                  {lab}
                </label>
              );
            })}
          </div>
        </section>

        {/* Fasce orarie */}
        <section className={styles.card}>
          <h3>Fasce orarie</h3>
          {cfg.timeRanges.map((tr, idx) => (
            <div key={idx} className={styles.rangeRow}>
              <div>
                <label>Inizio</label>
                <input
                  type="time"
                  value={tr.start}
                  onChange={(e) => updateTimeRange(idx, "start", e.target.value)}
                />
              </div>
              <div>
                <label>Fine</label>
                <input
                  type="time"
                  value={tr.end}
                  onChange={(e) => updateTimeRange(idx, "end", e.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeTimeRange(idx)}
              >
                Rimuovi
              </button>
            </div>
          ))}
          <button type="button" className={styles.addBtn} onClick={addTimeRange}>
            + Aggiungi fascia
          </button>
        </section>

        {/* Altri parametri */}
        <section className={styles.card}>
          <h3>Impostazioni</h3>
          <div className={styles.inline}>
            <label>Slots da mostrare</label>
            <input
              type="number"
              min={1}
              max={48}
              value={cfg.slotsAhead}
              onChange={(e) =>
                setCfg((prev) => ({
                  ...prev,
                  slotsAhead: Math.max(
                    1,
                    Math.min(48, Number(e.target.value) || 1)
                  ),
                }))
              }
            />
          </div>
          <div className={styles.inline}>
            <label>Timezone</label>
            <input
              type="text"
              value={cfg.timezone || ""}
              placeholder="Europe/Rome"
              onChange={(e) =>
                setCfg((prev) => ({ ...prev, timezone: e.target.value }))
              }
            />
          </div>
        </section>

        {/* Date da escludere */}
        <section className={styles.card}>
          <h3>Date da escludere (festivi/chiusure)</h3>

          {(cfg.blacklistDates && cfg.blacklistDates.length > 0) || (cfg.blacklistRanges && cfg.blacklistRanges.length > 0) ? (
            <>
              <div className={styles.blacklist}>
                {(cfg.blacklistDates || []).map((d) => (
                  <span key={`d-${d}`} className={styles.badge}>
                    {toIt(d)}{" "}
                    <button
                      onClick={() => removeBlacklistDate(d)}
                      title="Rimuovi"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {(cfg.blacklistRanges || []).map((r, i) => (
                  <span key={`r-${i}-${r.from}-${r.to}`} className={`${styles.badge} ${styles.badgeRange}`}>
                    {toIt(r.from)} → {toIt(r.to)}{" "}
                    <button
                      onClick={() => removeBlacklistRange(r)}
                      title="Rimuovi intervallo"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className={styles.muted}>Nessuna data o intervallo escluso.</p>
          )}

          <div className={styles.actionsRow}>
            <button type="button" className={styles.addBtn} onClick={openAddSingle}>
              + Aggiungi data singola
            </button>
            <button type="button" className={styles.addBtn} onClick={openAddRange}>
              + Aggiungi intervallo
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h3>Anteprima</h3>
          <p className={styles.preview}>{preview}</p>
        </section>

        <div className={styles.actions}>
          <button className={styles.saveBtn} onClick={save} disabled={saving}>
            {saving ? "Salvataggio…" : "Salva configurazione"}
          </button>
        </div>
      </div>

      {modalOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setModalOpen(false)} />
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
            {/* 👇 UNICO PANNELLO */}
            <div className={styles.modalPanel}>
              <div className={styles.modalHeader}>
                <h3 id="dlg-title">
                  {modalMode === "single" ? "Aggiungi data singola" : "Aggiungi intervallo date"}
                </h3>
              </div>

              <div className={styles.modalBody}>
                {modalMode === "single" ? (
                  <div className={styles.inline}>
                    <label>Data (DD/MM/YYYY)</label>
                    <input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
                  </div>
                ) : (
                  <>
                    <div className={styles.inline}>
                      <label>Dal (DD/MM/YYYY)</label>
                      <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                    </div>
                    <div className={styles.inline}>
                      <label>Al (DD/MM/YYYY)</label>
                      <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                    </div>
                  </>
                )}
                {modalError && <p className={styles.error}>{modalError}</p>}
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button onClick={() => setModalOpen(false)} className={styles.secondaryBtn}>Annulla</button>
                  {modalMode === "single" ? (
                    <button onClick={addBlacklistSingle} className={styles.primaryBtn}>Aggiungi</button>
                  ) : (
                    <button onClick={addBlacklistRange} className={styles.primaryBtn}>Aggiungi intervallo</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ConsegneGestionale;
