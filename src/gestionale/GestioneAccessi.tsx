import React, { useEffect, useState } from 'react';
import { db } from '../backend/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import Header from '../components/HeaderComponents/Header';
import styles from './GestioneAccessi.module.css';

const PAGINE = [
  'gestionaleA4',
  'gestionaleA3',
  'utentiGestionale',
  'storicoDati',
  'foto-video-gestionale',
  'gestione-accessi',
  'qr-generator', 
   'bobine'// Aggiungi qui le pagine che vuoi gestire
];

const GestioneAccessi: React.FC = () => {
  const [ruoli, setRuoli] = useState<string[]>([]);
  const [ruoloSelezionato, setRuoloSelezionato] = useState<string>('');
  const [accessi, setAccessi] = useState<string[]>([]);
  const [nuovoRuolo, setNuovoRuolo] = useState<string>('');
  const [salvato, setSalvato] = useState<boolean>(false);
  const [ruoliUsati, setRuoliUsati] = useState<Set<string>>(new Set());
  const [ruoloEliminato, setRuoloEliminato] = useState<string | null>(null);



  useEffect(() => {
    const fetchRuoli = async () => {
      const ruoliUtenti = new Set<string>();
      const snapshotUtenti = await getDocs(collection(db, "users"));
      snapshotUtenti.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.ruolo) ruoliUtenti.add(data.ruolo);
      });

      setRuoliUsati(ruoliUtenti); // 👈 Salva i ruoli usati realmente

      const ruoliAccessi = new Set<string>();
      const snapshotAccessi = await getDocs(collection(db, "ruoliPagineAccesso"));
      snapshotAccessi.forEach((docSnap) => {
        ruoliAccessi.add(docSnap.id);
      });

      const unioneRuoli = new Set([
        ...Array.from(ruoliUtenti),
        ...Array.from(ruoliAccessi),
      ]);

      setRuoli(Array.from(unioneRuoli));
    };

    fetchRuoli();
  }, []);

  useEffect(() => {
    const fetchAccessi = async () => {
      if (!ruoloSelezionato) return;
      const snap = await getDoc(doc(db, 'ruoliPagineAccesso', ruoloSelezionato));
      if (snap.exists()) {
        setAccessi(snap.data().accessoPagine || []);
      } else {
        setAccessi([]);
      }
    };
    fetchAccessi();
  }, [ruoloSelezionato]);

  const toggleAccesso = (pagina: string) => {
    setAccessi(prev =>
      prev.includes(pagina)
        ? prev.filter(p => p !== pagina)
        : [...prev, pagina]
    );
  };

  const salvaAccessi = async () => {
    if (!ruoloSelezionato) return;
    await setDoc(doc(db, 'ruoliPagineAccesso', ruoloSelezionato), {
      accessoPagine: accessi,
    });
    setSalvato(true);
    setTimeout(() => setSalvato(false), 2000);
  };

  const creaNuovoRuolo = () => {
    const ruolo = nuovoRuolo.trim();
    if (ruolo && !ruoli.includes(ruolo)) {
      setRuoli(prev => [...prev, ruolo]);
      setNuovoRuolo('');
    }
  };


  const eliminaRuolo = async (ruolo: string) => {
    await deleteDoc(doc(db, "ruoliPagineAccesso", ruolo));
    setRuoli(prev => prev.filter(r => r !== ruolo));

    if (ruolo === ruoloSelezionato) setRuoloSelezionato('');

    setRuoloEliminato(ruolo);
    setTimeout(() => setRuoloEliminato(null), 2000); // ✔️ sparisce dopo 2 secondi
  };

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>🔐 Gestione Accessi per Ruolo</h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
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
              >
                🗑 Elimina ruolo
              </button>
              {ruoloEliminato === ruoloSelezionato && (
                <span style={{ color: 'limegreen' }}>✔️</span>
              )}
            </div>
          )}
        </div>


        {ruoloSelezionato && (
          <div className={styles.box}>
            <h3>Pagine accessibili per <span className={styles.highlight}>{ruoloSelezionato}</span></h3>
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

            <button onClick={salvaAccessi} className={styles.button}>
              💾 Salva Accessi
            </button>
            {salvato && <span style={{ marginLeft: 10, color: 'limegreen' }}>✔️</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default GestioneAccessi;
