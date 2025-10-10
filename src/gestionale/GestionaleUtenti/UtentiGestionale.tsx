import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchUtenti = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users: Utente[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();

        if (!data.ruolo) {
          await updateDoc(doc(db, "users", docSnap.id), { ruolo: "PublicUser" });
        }

        users.push({
          id: docSnap.id,
          displayName: data.displayName,
          cognome: data.cognome,
          email: data.email,
          telefono: data.telefono,
          ruolo: data.ruolo || "PublicUser",
          corsoLaurea: data.corsoLaurea || "",
          annoAccademico: data.annoAccademico || "",
        });
      }

      setUtenti(users);
    };

    const fetchRuoli = async () => {
      const snapshot = await getDocs(collection(db, "ruoliPagineAccesso"));
      const ruoli = snapshot.docs.map(doc => doc.id);
      setRuoliDisponibili(ruoli);
    };

    fetchUtenti();
    fetchRuoli();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo utente?")) {
      await deleteDoc(doc(db, "users", id));
      setUtenti((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const userRef = doc(db, "users", id);
    await updateDoc(userRef, { ruolo: newRole });
    setUtenti((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, ruolo: newRole } : user
      )
    );
  };

  const utentiFiltrati = utenti.filter((u) => {
    const matchRuolo = filtroRuolo === "Tutti" || u.ruolo === filtroRuolo;
    const lowerQuery = query.toLowerCase();
    const matchTesto =
      (u.displayName?.toLowerCase().includes(lowerQuery) || "") ||
      (u.cognome?.toLowerCase().includes(lowerQuery) || "") ||
      (u.email?.toLowerCase().includes(lowerQuery) || "");
    return matchRuolo && matchTesto;
  });

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h2 className={styles.title}>👥 Riepilogo Utenti Registrati</h2>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <select
            value={filtroRuolo}
            onChange={(e) => setFiltroRuolo(e.target.value)}
            className={styles.input}
          >
            <option value="Tutti">🔎 Tutti i ruoli</option>
            {ruoliDisponibili.map((ruolo) => (
              <option key={ruolo} value={ruolo}>{ruolo}</option>
            ))}
          </select>

          <input
            type="text"
            value={query}
            placeholder="Cerca per nome, cognome o email..."
            onChange={(e) => setQuery(e.target.value)}
            className={styles.input}
            style={{ flexGrow: 1, minWidth: 200 }}
          />
        </div>

        <ul className={styles.orderList}>
          {utentiFiltrati.map((user) => (
            <li key={user.id} className={styles.orderItem}>
              <div>
                <strong>{user.displayName} {user.cognome}</strong><br />
                📧 {user.email}<br />
                📱 {user.telefono}<br />
                🎓 {user.corsoLaurea} — {user.annoAccademico}<br />
                🔐 Ruolo:{" "}
                <select
                  value={user.ruolo}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  className={styles.input}
                >
                  {ruoliDisponibili.map((ruolo) => (
                    <option key={ruolo} value={ruolo}>
                      {ruolo}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={() => handleDelete(user.id)} className={styles.deleteButton}>
                🗑️ Elimina
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UtentiGestionale;
