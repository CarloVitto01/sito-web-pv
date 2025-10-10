// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
// ✅ Adatta il path se diverso
import "./AccountPage.css";
import Header from "../../HeaderComponents/Header";
import Footer from "../../FooterComponents/Footer";

const fmtEuro = (n?: number | string) =>
  typeof n === "number"
    ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parsePrice = (val: any) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val.replace(",", ".").replace(/[^\d.-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

// 👇 Tipo degli ordini letti da ArchivioOrdini
type FirestoreTimestampLike = { toDate?: () => Date };
type Order = {
  id: string;
  uid?: string;
  tipo?: string;
  prezzo?: number | string;        // alcuni documenti hanno solo "prezzo"
  totaleFinale?: number | string;  // altri hanno "totaleFinale"
  timestamp?: string | null | FirestoreTimestampLike; // ISO string o Firestore Timestamp
  _tsMillis?: number;              // campo ausiliario per sort (millisecondi)
  [key: string]: any;
};

const PAGE_SIZE = 10;

const AccountPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isStudente, setIsStudente] = useState(false);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [page, setPage] = useState<number>(1);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const archiveQuery = query(
        collection(db, "ArchivioOrdini"),
        where("uid", "==", user.uid)
      );

      const archiveSnapshot = await getDocs(archiveQuery);

      // 👇 Mapping + normalizzazione timestamp + calcolo ms per sort
      const userOrders: Order[] = archiveSnapshot.docs.map((d) => {
        const data = d.data() as any;

        let tsISO: string | null = null;
        let ms = 0;

        if (data?.timestamp?.toDate) {
          const dt = data.timestamp.toDate() as Date;
          tsISO = dt.toISOString();
          ms = dt.getTime();
        } else if (typeof data?.timestamp === "string") {
          tsISO = data.timestamp;
          ms = Date.parse(data.timestamp) || 0;
        } else {
          tsISO = null;
          ms = 0;
        }

        return {
          id: d.id,
          ...data,
          timestamp: tsISO ?? data?.timestamp ?? null,
          _tsMillis: ms,
        } as Order;
      });

      // 🔽 Ordina dal più recente (ms desc)
      userOrders.sort((a, b) => (b._tsMillis ?? 0) - (a._tsMillis ?? 0));

      setOrders(userOrders);

      // Calcolo totale speso (fallback totaleFinale → prezzo)
      const total = userOrders.reduce((sum, o) => {
        const v = (o.totaleFinale ?? o.prezzo);
        return sum + parsePrice(v);
      }, 0);
      setTotalSpent(total);

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const ud = docSnap.data();
        setUserData(ud);
        setIsStudente(!!ud.corsoLaurea || !!ud.annoAccademico);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // 🔁 Se cambia il numero di ordini e la pagina corrente “sfora”, torna all’ultima pagina valida
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [orders.length, totalPages, page]);

  // 📄 Slice per paginazione
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, page]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const user = auth.currentUser;
    if (!user) return;

    const updatedData = { ...userData };

    if (!isStudente) {
      delete updatedData.corsoLaurea;
      delete updatedData.annoAccademico;

      setUserData((prev: any) => ({
        ...prev,
        corsoLaurea: "",
        annoAccademico: "",
      }));
    }

    try {
      await updateDoc(doc(db, "users", user.uid), updatedData);
      setSuccess("Dati aggiornati con successo!");
    } catch {
      setError("Errore durante l'aggiornamento.");
    }
  };

  if (loading) return <p>Caricamento in corso...</p>;

  return (
    <>
      <Header />
      <div className="account-page">
        <div className="account-container">
          <h2>Il Mio Account</h2>
          <form onSubmit={handleUpdate}>
            <label>Nome:</label>
            <input name="displayName" value={userData?.displayName || ""} onChange={handleChange} required />

            <label>Cognome:</label>
            <input name="cognome" value={userData?.cognome || ""} onChange={handleChange} required />

            <label>Email:</label>
            <input value={auth.currentUser?.email || ""} readOnly />

            <button
              type="button"
              className="home-button"
              onClick={() => {
                const user = auth.currentUser;
                if (user?.email) {
                  import("firebase/auth").then(({ sendPasswordResetEmail }) => {
                    sendPasswordResetEmail(auth, user.email!)
                      .then(() => setSuccess("Email per il cambio password inviata!"))
                      .catch(() => setError("Errore durante l'invio dell'email."));
                  });
                }
              }}
            >
              Cambia Password
            </button>
            <br />
            <label>Telefono:</label>
            <input name="telefono" value={userData?.telefono || ""} onChange={handleChange} required />

            <div className="account-checkbox-wrapper">
              <label htmlFor="isStudente">Sei uno studente universitario (Ecotekne)?</label>
              <input
                type="checkbox"
                id="isStudente"
                checked={isStudente}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setIsStudente(checked);

                  if (!checked) {
                    setUserData((prev: any) => ({
                      ...prev,
                      corsoLaurea: "",
                      annoAccademico: "",
                    }));

                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await updateDoc(doc(db, "users", user.uid), {
                          corsoLaurea: "",
                          annoAccademico: "",
                        });
                      } catch {
                        // noop
                      }
                    }
                  }
                }}
              />
            </div>

            {isStudente && (
              <>
                <label>Corso di Laurea:</label>
                <input name="corsoLaurea" value={userData?.corsoLaurea || ""} onChange={handleChange} />

                <label>Anno Accademico:</label>
                <input name="annoAccademico" value={userData?.annoAccademico || ""} onChange={handleChange} />
              </>
            )}

            <div className="button-row">
              <button type="submit" className="home-button">Aggiorna Dati</button>
              <button type="button" className="home-button" onClick={() => navigate("/")}>Vai in Home</button>
            </div>

            {success && <p className="success-message">{success}</p>}
            {error && <p className="error-message">{error}</p>}
          </form>

          <div className="orders-summary">
            <h3>Ordini Effettuati: {orders.length}</h3>
            <h4>Totale Speso: €{fmtEuro(totalSpent)}</h4>

            {orders.length === 0 ? (
              <p>Nessun ordine trovato.</p>
            ) : (
              <>
                <ul>
                  {paginatedOrders.map((order) => (
                    <li key={order.id} style={{ marginBottom: "1rem" }}>
                      <div>
                        <strong>Tipo:</strong> {order.tipo ?? "-"}{" | "}
                        <strong>Totale:</strong>{" "}
                        €{fmtEuro(parsePrice(order.totaleFinale ?? order.prezzo))}{" | "}
                        <strong>Data:</strong>{" "}
                        {typeof order.timestamp === "string"
                          ? new Date(order.timestamp).toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })
                          : order.timestamp?.toDate?.().toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }) ?? "-"}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Navigazione semplice: 10 per pagina */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
                  <button
                    className="home-button"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ◀︎ Precedenti
                  </button>
                  <span style={{ opacity: 0.9 }}>
                    Pagina {page} di {totalPages}
                  </span>
                  <button
                    className="home-button"
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Successivi ▶︎
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountPage;
