import React, { useState } from "react";
import { db } from "../backend/firebase";
import {
    collection,
    getDocs,
    query,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "./StoricoDati.module.css";
import Header from "../components/Header";

const StoricoDati: React.FC = () => {
    const [dataInizio, setDataInizio] = useState("");
    const [dataFine, setDataFine] = useState("");
    const [ricercaUtente, setRicercaUtente] = useState("");
    const [filtroTipo, setFiltroTipo] = useState<string>("Tutti");
    const [anteprimaA4, setAnteprimaA4] = useState<any[]>([]);
    const [anteprimaA3, setAnteprimaA3] = useState<any[]>([]);
    const [totaleA4, setTotaleA4] = useState(0);
    const [totaleA3, setTotaleA3] = useState(0);

    const matchesUtente = (ordine: any) => {
        if (!ricercaUtente) return true;
        const lower = ricercaUtente.toLowerCase();
        return (
            ordine.nome?.toLowerCase().includes(lower) ||
            ordine.cognome?.toLowerCase().includes(lower) ||
            ordine.email?.toLowerCase().includes(lower) ||
            ordine.telefono?.toLowerCase().includes(lower)
        );
    };

    const resetFiltri = () => {
        setDataInizio("");
        setDataFine("");
        setRicercaUtente("");
        setFiltroTipo("Tutti");
        setAnteprimaA4([]);
        setAnteprimaA3([]);
        setTotaleA4(0);
        setTotaleA3(0);
    };

    const formatFilename = (base: string) => {
        const parts: string[] = [base];
        if (ricercaUtente.trim()) {
            const nomePulito = ricercaUtente.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
            parts.push(nomePulito);
        }
        if (dataInizio) parts.push("dal_" + dataInizio);
        if (dataFine) parts.push("al_" + dataFine);
        return parts.join("_") + ".xlsx";
    };

    const exportOrdini = async (tipo: "A4" | "A3") => {
        const baseRef = collection(db, "ArchivioOrdini");
        const snapshot = await getDocs(query(baseRef));

        const ordini: any[] = [];
        let totaleSpeso = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.tipo !== tipo) return;
            if (!matchesUtente(data)) return;

            const ts = data.timestamp?.toDate?.();
            const inizio = dataInizio ? new Date(dataInizio) : null;
            const fine = dataFine ? new Date(dataFine + "T23:59:59") : null;
            if ((inizio && ts < inizio) || (fine && ts > fine)) return;

            const prezzo = parseFloat(data.prezzo || 0);
            totaleSpeso += prezzo;

            ordini.push({
                Nome: data.nome || "",
                Cognome: data.cognome || "",
                Email: data.email || "",
                Telefono: data.telefono || "",
                Timestamp: ts?.toLocaleString("it-IT") || "",
                Prezzo: prezzo.toFixed(2),
                Tipo: tipo
            });
        });

        if (ordini.length > 0 && ricercaUtente.trim()) {
            ordini.push({});
            ordini.push({
                Nome: "Totale speso:",
                Prezzo: totaleSpeso.toFixed(2) + " €"
            });
        }

        if (tipo === "A4") {
            setAnteprimaA4([...ordini]);
            setTotaleA4(totaleSpeso);
        } else {
            setAnteprimaA3([...ordini]);
            setTotaleA3(totaleSpeso);
        }

        const worksheet = XLSX.utils.json_to_sheet(ordini);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Ordini_${tipo}`);

        const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        saveAs(blob, formatFilename(`ordini_${tipo}`));
    };

    const generaAnteprima = async () => {
        const baseRef = collection(db, "ArchivioOrdini");
        const snapshot = await getDocs(query(baseRef));

        const ordiniA4: any[] = [];
        const ordiniA3: any[] = [];
        let totaleA4 = 0;
        let totaleA3 = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            if (!matchesUtente(data)) return;

            const ts = data.timestamp?.toDate?.();
            const inizio = dataInizio ? new Date(dataInizio) : null;
            const fine = dataFine ? new Date(dataFine + "T23:59:59") : null;
            if ((inizio && ts < inizio) || (fine && ts > fine)) return;

            const prezzo = parseFloat(data.prezzo || 0);
            const ordine = {
                Nome: data.nome || "",
                Cognome: data.cognome || "",
                Email: data.email || "",
                Telefono: data.telefono || "",
                Timestamp: ts?.toLocaleString("it-IT") || "",
                Prezzo: prezzo.toFixed(2),
                Tipo: data.tipo || ""
            };

            if (data.tipo === "A4") {
                totaleA4 += prezzo;
                ordiniA4.push(ordine);
            } else if (data.tipo === "A3") {
                totaleA3 += prezzo;
                ordiniA3.push(ordine);
            }
        });

        if (filtroTipo === "Tutti" || filtroTipo === "A4") {
            setAnteprimaA4([...ordiniA4, { Nome: "Totale:", Prezzo: totaleA4.toFixed(2) + " €" }]);
            setTotaleA4(totaleA4);
        }

        if (filtroTipo === "Tutti" || filtroTipo === "A3") {
            setAnteprimaA3([...ordiniA3, { Nome: "Totale:", Prezzo: totaleA3.toFixed(2) + " €" }]);
            setTotaleA3(totaleA3);
        }
    };


    function exportUtenti(): void {
        throw new Error("Function not implemented.");
    }

    return (
        <div>
            <Header />
            <div className={styles.container}>
                <h2 className={styles.title}>📦 Storico Dati e Download</h2>

                <div className={styles.filterControls}>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Dal:</label>
                        <input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} className={styles.input} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Al:</label>
                        <input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} className={styles.input} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Cerca Utente:</label>
                        <input type="text" placeholder="Nome, Cognome, Email, Telefono" value={ricercaUtente} onChange={(e) => setRicercaUtente(e.target.value)} className={styles.input} />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Tipo Ordine:</label>
                        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={styles.input}>
                            <option value="Tutti">Tutti</option>
                            <option value="A4">A4</option>
                            <option value="A3">A3</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                    <button className={styles.button} onClick={generaAnteprima}>
                        🔍 Mostra Risultati
                    </button>
                    <button className={styles.button} onClick={resetFiltri}>
                        ♻️ Resetta Filtri
                    </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "20px" }}>
                    <button className={styles.button} onClick={() => exportUtenti()}>📥 Esporta Utenti</button>
                    <button className={styles.button} onClick={() => exportOrdini("A4")}>📄 Esporta Ordini A4</button>
                    <button className={styles.button} onClick={() => exportOrdini("A3")}>📄 Esporta Ordini A3</button>
                </div>

                {(anteprimaA4.length > 0 || anteprimaA3.length > 0) && (
                    <div style={{ marginTop: "30px" }}>
                        <h3 className={styles.label}>📊 Anteprima Risultati</h3>

                        {anteprimaA4.length > 0 && (
                            <>
                                <h4 style={{ color: "#deb500" }}>Ordini A4 — Totale: {totaleA4.toFixed(2)} €</h4>
                                <ul className={styles.orderList}>
                                    {anteprimaA4.map((item, idx) => (
                                        <li key={idx} className={styles.orderItem}>
                                            <strong>{item.Nome} {item.Cognome}</strong> — {item.Email}<br />
                                            🗓️ {item.Timestamp} — 💶 {item.Prezzo}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {anteprimaA3.length > 0 && (
                            <>
                                <h4 style={{ color: "#deb500" }}>Ordini A3 — Totale: {totaleA3.toFixed(2)} €</h4>
                                <ul className={styles.orderList}>
                                    {anteprimaA3.map((item, idx) => (
                                        <li key={idx} className={styles.orderItem}>
                                            <strong>{item.Nome} {item.Cognome}</strong> — {item.Email}<br />
                                            🗓️ {item.Timestamp} — 💶 {item.Prezzo}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoricoDati;