// src/pages/AccountPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../../backend/firebase";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
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

const fmtDate = (isoLike: string | Date | undefined | null) => {
  try {
    const d = typeof isoLike === "string" ? new Date(isoLike) : isoLike instanceof Date ? isoLike : null;
    if (!d || isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch {
    return "-";
  }
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
      const archiveQuery = query(collection(db, "ArchivioOrdini"), where("uid", "==", user.uid));

      const [archiveSnapshot, docSnap] = await Promise.all([getDocs(archiveQuery), getDoc(docRef)]);

      // 👇 Mapping + normalizzazione timestamp + calcolo ms per sort
      const userOrders: Order[] = archiveSnapshot.docs.map((d) => {
        const data = d.data() as any;

        let tsISO: string | null = null;
        let ms = 0;

        if (data?.timestamp?.toDate) {
          const dt = (data.timestamp as FirestoreTimestampLike).toDate!();
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
        const v = o.totaleFinale ?? o.prezzo;
        return sum + parsePrice(v);
      }, 0);
      setTotalSpent(total);

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
    if (page > totalPages) setPage(totalPages);
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

      setUserData((prev: any) => ({ ...prev, corsoLaurea: "", annoAccademico: "" }));
    }

    try {
      await updateDoc(doc(db, "users", user.uid), updatedData);
      setSuccess("Dati aggiornati con successo!");
    } catch (err) {
      setError("Errore durante l'aggiornamento.");
    }
  };

  const handlePasswordReset = () => {
    const user = auth.currentUser;
    if (!user?.email) return;
    import("firebase/auth").then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(auth, user.email!)
        .then(() => setSuccess("Email per il cambio password inviata!"))
        .catch(() => setError("Errore durante l'invio dell'email."));
    });
  };

  if (loading) {
    return (
      <div className="account-loading">
        <div className="pv-spinner" aria-label="Caricamento" />
        <p>Caricamento in corso…</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="account-page">
        <div className="account-shell">
          {/* HEADER SUMMARY */}
          <section className="account-hero">
            <div className="hero-left">
              <h1>Il Mio Account</h1>
              <p className="hero-sub">Gestisci i tuoi dati e rivedi gli ordini effettuati su <span className="pv">Photo &amp; Vision</span>.</p>
              <div className="hero-stats">
                <div className="stat-card" role="status" aria-label={`Ordini effettuati: ${orders.length}`}>
                  <div className="stat-value">{orders.length}</div>
                  <div className="stat-label">Ordini</div>
                </div>
                <div className="stat-card" role="status" aria-label={`Totale speso: €${fmtEuro(totalSpent)}`}>
                  <div className="stat-value">€{fmtEuro(totalSpent)}</div>
                  <div className="stat-label">Totale speso</div>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <button type="button" className="btn-ghost" onClick={() => navigate("/")}>🏠 Home</button>
              <button type="button" className="btn-gold" onClick={handlePasswordReset}>🔑 Cambia Password</button>
            </div>
          </section>

          {(success || error) && (
            <div className={`alert ${success ? "alert-success" : "alert-error"}`} role="alert">
              {success || error}
            </div>
          )}

          {/* TWO-COLUMN LAYOUT */}
          <div className="account-grid">
            {/* LEFT: FORM */}
            <section className="card pv-form" aria-labelledby="dati-personali">
              <h2 id="dati-personali">Dati personali</h2>
              <form onSubmit={handleUpdate} className="form-grid">
                <label>
                  <span>Nome</span>
                  <input name="displayName" value={userData?.displayName || ""} onChange={handleChange} required />
                </label>

                <label>
                  <span>Cognome</span>
                  <input name="cognome" value={userData?.cognome || ""} onChange={handleChange} required />
                </label>

                <label>
                  <span>Email</span>
                  <input value={auth.currentUser?.email || ""} readOnly />
                </label>

                <label>
                  <span>Telefono</span>
                  <input name="telefono" value={userData?.telefono || ""} onChange={handleChange} required />
                </label>

                <div className="switch-row">
                  <label htmlFor="isStudente" className="switch-label">Studente universitario (Ecotekne)?</label>
                  <input type="checkbox" id="isStudente" className="switch" checked={isStudente} onChange={async (e) => {
                    const checked = e.target.checked;
                    setIsStudente(checked);

                    if (!checked) {
                      setUserData((prev: any) => ({ ...prev, corsoLaurea: "", annoAccademico: "" }));
                      const user = auth.currentUser;
                      if (user) {
                        try {
                          await updateDoc(doc(db, "users", user.uid), { corsoLaurea: "", annoAccademico: "" });
                        } catch { }
                      }
                    }
                  }} />
                </div>

                {isStudente && (
                  <>
                    <label>
                      <span>Corso di Laurea</span>
                      <input name="corsoLaurea" value={userData?.corsoLaurea || ""} onChange={handleChange} />
                    </label>

                    <label>
                      <span>Anno Accademico</span>
                      <input name="annoAccademico" value={userData?.annoAccademico || ""} onChange={handleChange} />
                    </label>
                  </>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-gold">💾 Aggiorna Dati</button>
                </div>
              </form>
            </section>

            {/* RIGHT: ORDERS */}
            <section className="card pv-orders" aria-labelledby="storico-ordini">
              <div className="orders-head">
                <h2 id="storico-ordini">Storico ordini</h2>
                <span className="orders-count" aria-label={`Totale ordini: ${orders.length}`}>{orders.length}</span>
              </div>

              {orders.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-ill" aria-hidden>🗂️</div>
                  <p>Nessun ordine trovato.</p>
                </div>
              ) : (
                <>
                  <ul className="orders-list">
                    {paginatedOrders.map((order) => {
                      const total = fmtEuro(parsePrice(order.totaleFinale ?? order.prezzo));
                      const dateStr = typeof order.timestamp === "string"
                        ? fmtDate(order.timestamp)
                        : fmtDate(order.timestamp?.toDate?.());
                      return (
                        <li key={order.id} className="order-item">
                          <div className="order-icon" aria-hidden>🧾</div>
                          <div className="order-main">
                            <div className="order-top">
                              <span className="order-type">{order.tipo ?? "Ordine"}</span>
                              <span className="order-total">€{total}</span>
                            </div>
                            <div className="order-meta">
                              <span className="badge">{dateStr}</span>
                              {order?.stato && <span className={`badge ${String(order.stato).toLowerCase()}`}>{String(order.stato)}</span>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="pagination">
                    <button className="btn-ghost" type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      ◀︎ Precedenti
                    </button>
                    <span className="page-info">Pagina {page} di {totalPages}</span>
                    <button className="btn-ghost" type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                      Successivi ▶︎
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AccountPage;