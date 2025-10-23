import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../backend/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import Header from '../../components/HeaderComponents/Header';
import styles from './GestioneAccessi.module.css';

const PAGINE = [
  'gestionaleA4',
  'gestionaleA3',
  'utentiGestionale',
  'storicoDati',
  'foto-video-gestionale',
  'gestione-accessi',
  'qr-generator',
  'bobine',
  'link',
  'gestionale-web',
  'tasse',
  'banner',
  'consegna',
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const GestioneAccessi: React.FC = () => {
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [ruoloSelezionato, setRuoloSelezionato] = useState<string>('');
  const [accessi, setAccessi] = useState<string[]>([]);
  const [nuovoRuolo, setNuovoRuolo] = useState<string>('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [ruoliUsati, setRuoliUsati] = useState<Set<string>>(new Set());
  const [ruoloEliminato, setRuoloEliminato] = useState<string | null>(null);

  // Mappa per gestione case-insensitive
  const ruoliLower = useMemo(() => new Set(ruoli.map(r => r.toLowerCase())), [ruoli]);

  useEffect(() => {
    const fetchRuoli = async () => {
      const ruoliUtenti = new Set<string>();
      const snapshotUtenti = await getDocs(collection(db, 'users'));
      snapshotUtenti.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data.ruolo) ruoliUtenti.add(String(data.ruolo));
      });

      setRuoliUsati(ruoliUtenti);

      const ruoliAccessi = new Set<string>();
      const snapshotAccessi = await getDocs(collection(db, 'ruoliPagineAccesso'));
      snapshotAccessi.forEach((docSnap) => {
        ruoliAccessi.add(docSnap.id);
      });

      const unioneRuoli = new Set([...Array.from(ruoliUtenti), ...Array.from(ruoliAccessi)]);
      setRuoli(Array.from(unioneRuoli).sort((a, b) => a.localeCompare(b)));
    };

    fetchRuoli();
  }, []);

  useEffect(() => {
    const fetchAccessi = async () => {
      if (!ruoloSelezionato) return;
      const snap = await getDoc(doc(db, 'ruoliPagineAccesso', ruoloSelezionato));
      if (snap.exists()) {
        setAccessi((snap.data() as any).accessoPagine || []);
      } else {
        setAccessi([]);
      }
    };
    fetchAccessi();
  }, [ruoloSelezionato]);

  const toggleAccesso = (pagina: string) => {
    setAccessi((prev) => (prev.includes(pagina) ? prev.filter((p) => p !== pagina) : [...prev, pagina]));
  };

  const salvaAccessi = async () => {
    if (!ruoloSelezionato) return;
    try {
      setSaveState('saving');
      await setDoc(
        doc(db, 'ruoliPagineAccesso', ruoloSelezionato),
        { accessoPagine: accessi },
        { merge: true }
      );
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (e) {
      console.error(e);
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const creaNuovoRuolo = async () => {
    const ruolo = nuovoRuolo.trim();
    if (!ruolo) return;
    if (ruoliLower.has(ruolo.toLowerCase())) {
      // già presente (anche con case diverso) → selezionalo
      setRuoloSelezionato(ruolo);
      setNuovoRuolo('');
      return;
    }
    // Aggiungi localmente
    setRuoli((prev) => [...prev, ruolo].sort((a, b) => a.localeCompare(b)));
    setNuovoRuolo('');
    setRuoloSelezionato(ruolo);
    // Crea doc vuoto (così compare anche su Firestore)
    try {
      await setDoc(doc(db, 'ruoliPagineAccesso', ruolo), { accessoPagine: [] }, { merge: true });
    } catch (e) {
      console.error('Errore creazione ruolo:', e);
    }
  };

  const eliminaRuolo = async (ruolo: string) => {
    // Non eliminare se in uso dagli utenti reali
    if (ruoliUsati.has(ruolo)) return;

    try {
      await deleteDoc(doc(db, 'ruoliPagineAccesso', ruolo));
    } catch (e) {
      console.error('Errore eliminazione ruolo:', e);
    }

    setRuoli((prev) => prev.filter((r) => r !== ruolo));
    if (ruolo === ruoloSelezionato) setRuoloSelezionato('');

    setRuoloEliminato(ruolo);
    setTimeout(() => setRuoloEliminato(null), 2000);
  };

  const selectedCount = accessi.length;

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>🔐 Gestione Accessi per Ruolo</h2>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <select
            value={ruoloSelezionato}
            onChange={(e) => setRuoloSelezionato(e.target.value)}
            className={styles.select}
          >
            <option value="">-- Seleziona ruolo --</option>
            {ruoli.map((ruolo) => (
              <option key={ruolo} value={ruolo}>
                {ruolo}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Crea nuovo ruolo..."
            value={nuovoRuolo}
            onChange={(e) => setNuovoRuolo(e.target.value)}
            className={styles.input}
            style={{ minWidth: 200 }}
          />
          <button onClick={creaNuovoRuolo} className={styles.button}>
            ➕ Aggiungi ruolo
          </button>

          {!ruoliUsati.has(ruoloSelezionato) && ruoloSelezionato && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => eliminaRuolo(ruoloSelezionato)}
                className={styles.button}
                style={{ backgroundColor: '#a00', color: '#fff' }}
                title="Elimina ruolo (solo se non assegnato ad alcun utente)"
              >
                🗑 Elimina ruolo
              </button>
              {ruoloEliminato === ruoloSelezionato && <span style={{ color: 'limegreen' }}>✔️</span>}
            </div>
          )}
        </div>

        {ruoloSelezionato && (
          <div className={styles.box}>
            <h3>
              Pagine accessibili per <span className={styles.highlight}>{ruoloSelezionato}</span>{' '}
              <small style={{ opacity: 0.8 }}>({selectedCount}/{PAGINE.length} selezionate)</small>
            </h3>

            <ul className={styles.pageList}>
              {PAGINE.map((pagina) => (
                <li key={pagina}>
                  <label>
                    <input
                      type="checkbox"
                      checked={accessi.includes(pagina)}
                      onChange={() => toggleAccesso(pagina)}
                    />{' '}
                    {pagina}
                  </label>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <button
                onClick={salvaAccessi}
                className={styles.button}
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? '⏳ Salvataggio…' : '💾 Salva Accessi'}
              </button>

              <div
                aria-live="polite"
                role="status"
                style={{
                  minHeight: 24,
                  fontWeight: 600,
                  opacity: saveState === 'saved' || saveState === 'error' ? 1 : 0,
                  transition: 'opacity .25s ease',
                }}
              >
                {saveState === 'saved' && <span>✅ Salvato</span>}
                {saveState === 'error' && <span>⚠️ Errore nel salvataggio</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestioneAccessi;
