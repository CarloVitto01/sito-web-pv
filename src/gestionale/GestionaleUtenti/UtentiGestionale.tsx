import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../backend/firebase";
import Header from "../../components/HeaderComponents/Header";
import styles from "./UtentiGestionale.module.css";

type Utente = {
  id: string;
  displayName: string;
  cognome: string;
  email: string;
  telefono: string;
  ruolo: string;
  corsoLaurea?: string;
  annoAccademico?: string;
};

const UtentiGestionale: React.FC = () => {
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [filtroRuolo, setFiltroRuolo] = useState<string>("Tutti");
  const [query, setQuery] = useState<string>("");
  const [ruoliDisponibili, setRuoliDisponibili] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Ruoli
      const snapshotRuoli = await getDocs(collection(db, "ruoliPagineAccesso"));
      const ruoli = snapshotRuoli.docs.map(d => d.id);
      // assicurati che PublicUser sia sempre presente
      const setRuoli = new Set([...ruoli, "PublicUser"]);
      setRuoliDisponibili(Array.from(setRuoli));

      // Utenti
      const querySnapshot = await getDocs(collection(db, "users"));
      const users: Utente[] = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as any;

        if (!data.ruolo) {
          // fallback coerente col requisito
          await updateDoc(doc(db, "users", docSnap.id), { ruolo: "PublicUser" });
        }

        users.push({
          id: docSnap.id,
          displayName: data.displayName ?? "",
          cognome: data.cognome ?? "",
          email: data.email ?? "",
          telefono: data.telefono ?? "",
          ruolo: data.ruolo || "PublicUser",
          corsoLaurea: data.corsoLaurea ?? "",
          annoAccademico: data.annoAccademico ?? "",
        });
      }

      setUtenti(users);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo utente?")) {
      await deleteDoc(doc(db, "users", id));
      setUtenti(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const userRef = doc(db, "users", id);
    await updateDoc(userRef, { ruolo: newRole });
    setUtenti(prev => prev.map(u => (u.id === id ? { ...u, ruolo: newRole } : u)));
  };

  // 🔎 filtro fixato (evita .includes su undefined e ritorna booleanamente)
  const utentiFiltrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    return utenti.filter(u => {
      const matchRuolo = filtroRuolo === "Tutti" || u.ruolo === filtroRuolo;
      const testo =
        `${u.displayName ?? ""} ${u.cognome ?? ""} ${u.email ?? ""}`.toLowerCase();
      const matchTesto = q === "" || testo.includes(q);
      return matchRuolo && matchTesto;
    });
  }, [utenti, filtroRuolo, query]);

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>👥 Riepilogo Utenti Registrati</h2>

        {/* FILTRI (sticky) */}
        <div className={styles.filterBar}>
          <select
            value={filtroRuolo}
            onChange={(e) => setFiltroRuolo(e.target.value)}
            className={styles.input}
            aria-label="Filtra per ruolo"
          >
            <option value="Tutti">🔎 Tutti i ruoli</option>
            {ruoliDisponibili.map((ruolo) => (
              <option key={ruolo} value={ruolo}>{ruolo}</option>
            ))}
          </select>

          <input
            type="text"
            value={query}
            placeholder="Cerca per nome, cognome o email…"
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
            aria-label="Ricerca utente"
          />
        </div>

        {/* LOADING / EMPTY */}
        {loading ? (
          <div className={styles.emptyState}>Caricamento utenti…</div>
        ) : utentiFiltrati.length === 0 ? (
          <div className={styles.emptyState}>
            Nessun utente trovato con i filtri correnti.
          </div>
        ) : (
          <div className={styles.grid}>
            {utentiFiltrati.map((user) => (
              <article key={user.id} className={styles.card}>
                <header className={styles.cardHeader}>
                  <div className={styles.avatar}>{(user.displayName || user.cognome || "U")[0].toUpperCase()}</div>
                  <div className={styles.headerText}>
                    <h3 className={styles.name}>
                      {user.displayName} {user.cognome}
                    </h3>
                    <span className={styles.roleBadge}>{user.ruolo}</span>
                  </div>
                </header>

                <div className={styles.cardBody}>
                  <p className={styles.row}>
                    📧 <a href={`mailto:${user.email}`} className={styles.link}>{user.email || "—"}</a>
                  </p>
                  <p className={styles.row}>
                    📱 <a href={`tel:${user.telefono}`} className={styles.link}>{user.telefono || "—"}</a>
                  </p>
                  <p className={styles.row}>
                    🎓 {user.corsoLaurea || "—"}{(user.corsoLaurea || user.annoAccademico) && " — "}{user.annoAccademico || ""}
                  </p>

                  <div className={styles.controlGroup}>
                    <label className={styles.label}>Ruolo</label>
                    <select
                      value={user.ruolo}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={styles.roleSelect}
                    >
                      {ruoliDisponibili.map((ruolo) => (
                        <option key={ruolo} value={ruolo}>{ruolo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <footer className={styles.cardFooter}>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className={styles.deleteButton}
                    aria-label={`Elimina ${user.displayName} ${user.cognome}`}
                  >
                    🗑️ Elimina
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtentiGestionale;
