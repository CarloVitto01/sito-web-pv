import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../backend/firebase"; // TODO: sostituire con BE Spring quando pronto
import { doc, getDoc } from "firebase/firestore";
import { TOKENSVILUPPO, CHAT_IDSVILUPPO } from "../../backend/telegram";

import styles from "./RichiestaStampa3D.module.css"; // crea il CSS a spec del modulo Sito Web
import Header from "../HeaderComponents/Header";
import Footer from "../FooterComponents/Footer";
import ModelPreview from "../3D/ModelPreview";


// ——————————————————————————————————————————————————————————
// Tipi
// ——————————————————————————————————————————————————————————
interface UserShape {
    displayName?: string;
    cognome?: string;
    email?: string;
    telefono?: string;
}

type Tech = "FDM" | "Resina (SLA/DLP)";

interface Example3DTemplate {
    id: string;
    title: string;
    category: "Gadget" | "Prototipo" | "Figura" | "Ricambio" | "Altro";
    short: string;
    preview: string; // path immagine di anteprima
    features: string[];
}

// ——————————————————————————————————————————————————————————
// Dati statici
// ——————————————————————————————————————————————————————————
const EXAMPLE_TEMPLATES: Example3DTemplate[] = [
    {
        id: "figura-hero",
        title: "Figura collezionabile",
        category: "Figura",
        short: "Miniatura/figurine ad alta qualità, ideale in resina.",
        preview: "/assets/3d/figure.jpg",
        features: ["Dettagli finissimi", "Primer & verniciabile", "Supporti rimossi"],
    },
    {
        id: "gadget-key",
        title: "Portachiavi personalizzato",
        category: "Gadget",
        short: "FDM economico, perfetto per piccoli lotti.",
        preview: "/assets/3d/keychain.jpg",
        features: ["Multi-colore (su richiesta)", "PLA/PETG", "Infill 20–40%"],
    },
    {
        id: "proto-case",
        title: "Prototipo tecnico (scocca)",
        category: "Prototipo",
        short: "Ingranaggi, scocche e parti funzionali.",
        preview: "/assets/3d/case.jpg",
        features: ["PETG/ABS", "Layer 0.2–0.28mm", "Tolleranze controllate"],
    },
    {
        id: "spare-clip",
        title: "Ricambio clip/supporto",
        category: "Ricambio",
        short: "Ricambio economico e robusto su misura.",
        preview: "/assets/3d/clip.jpg",
        features: ["PLA/PETG", "Test campione opzionale", "Batch multipli"],
    },
];

const MATERIALS_FDM = ["PLA", "PETG", "ABS", "TPU (flessibile)"] as const;
const MATERIALS_RESIN = ["Standard", "Tough", "ABS-like", "Trasparente"] as const;
const COLORS = ["Nero", "Bianco", "Grigio", "Rosso", "Blu", "Verde", "Trasparente (resina)"];
const FINISHING = [
    "Rimozione supporti",
    "Levigatura",
    "Primer",
    "Verniciatura mono-colore",
    "Verniciatura dettagliata",
];

const ALL_FEATURES_3D = [
    "Prototipazione rapida",
    "Piccole serie (batch)",
    "File confidenziale (NDA)",
    "Controllo tolleranze",
    "Prova dimensionale (test fit)",
    "Assemblaggio post-stampa",
    "Incollaggio parti",
    "File fixing (riparazione mesh)",
];

// ——————————————————————————————————————————————————————————
// Helper stima costi (indicativa)
// ——————————————————————————————————————————————————————————
function estimateCost(params: {
    tech: Tech;
    estVolumeCm3: number; // volume STL stimato (cm^3) o bounding box * fattore
    infill: number; // 0–100 (solo FDM)
    copies: number;
    finishing: string[];
    colorChanges: number;
}): number {
    const { tech, estVolumeCm3, infill, copies, finishing, colorChanges } = params;

    // Tariffe indicativo
    const setup = tech === "FDM" ? 3 : 5; // €
    const rateMaterial = tech === "FDM" ? 0.06 : 0.20; // €/g (FDM) ~ €/ml (resina) approx su cm^3
    const densityFactor = tech === "FDM" ? 1.24 : 1.05; // PLA ~1.24 g/cm3, resina ~1.05 g/cm3

    // Infill impatta volume effettivo (FDM). Shells non considerate qui.
    const effectiveVolume = tech === "FDM" ? estVolumeCm3 * (0.25 + (infill / 100) * 0.6) : estVolumeCm3; // semplificazione
    const gramsOrMl = effectiveVolume * densityFactor;
    let cost = setup + gramsOrMl * rateMaterial;

    // Finishing
    const finishingMap: Record<string, number> = {
        "Rimozione supporti": 2,
        "Levigatura": 4,
        "Primer": 3,
        "Verniciatura mono-colore": 8,
        "Verniciatura dettagliata": 18,
    };
    finishing.forEach((f) => (cost += finishingMap[f] || 0));

    // Cambio colore (FDM) o resin mix handling
    cost += colorChanges * (tech === "FDM" ? 3 : 2);

    cost = cost * copies;

    // Minimo ordine
    if (cost < 10) cost = 10;

    return Math.round(cost * 100) / 100;
}

// ——————————————————————————————————————————————————————————
// Componente
// ——————————————————————————————————————————————————————————
const RichiestaStampa3D: React.FC = () => {
    const [userData, setUserData] = useState<UserShape | null>(null);

    // Gallery filtro
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<Example3DTemplate["category"] | "tutte">("tutte");
    const filteredTemplates = useMemo(() => {
        return EXAMPLE_TEMPLATES.filter((t) => {
            const byCat = category === "tutte" ? true : t.category === category;
            const q = search.toLowerCase();
            const bySearch =
                !q ||
                t.title.toLowerCase().includes(q) ||
                t.short.toLowerCase().includes(q) ||
                t.features.some((f) => f.toLowerCase().includes(q));
            return byCat && bySearch;
        });
    }, [search, category]);

    // Selezioni principali
    const [selectedTemplate, setSelectedTemplate] = useState<Example3DTemplate | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

    const [tech, setTech] = useState<Tech>("FDM");
    const [material, setMaterial] = useState<string>(MATERIALS_FDM[0]);
    const [color, setColor] = useState<string>(COLORS[0]);
    const [layerHeight, setLayerHeight] = useState<number>(tech === "FDM" ? 0.2 : 0.05); // mm
    const [infill, setInfill] = useState<number>(20);
    const [supports, setSupports] = useState<boolean>(true);
    const [copies, setCopies] = useState<number>(1);

    // Dimensioni/volume
    const [length, setLength] = useState<number>(50); // mm
    const [width, setWidth] = useState<number>(50);
    const [height, setHeight] = useState<number>(50);
    const [scale, setScale] = useState<number>(100); // %
    const [knownVolume, setKnownVolume] = useState<string>(""); // opzionale cm^3

    // Finishing & extra
    const [finishing, setFinishing] = useState<string[]>(["Rimozione supporti"]);
    const [colorChanges, setColorChanges] = useState<number>(0);

    // File upload (solo metadati/nome file)
    const [files, setFiles] = useState<File[]>([]);

    // Logistica
    const [deadline, setDeadline] = useState<string>("");
    const [delivery, setDelivery] = useState<"Ritiro in sede" | "Spedizione">("Ritiro in sede");
    const [address, setAddress] = useState<string>("");

    const [notes, setNotes] = useState<string>("");
    const [privacyOk, setPrivacyOk] = useState(false);

    // UI
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);


    // Recupero utente
    useEffect(() => {
        const run = async () => {
            if (auth.currentUser) {
                const ref = doc(db, "users", auth.currentUser.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) setUserData(snap.data() as UserShape);
            }
        };
        run();
    }, []);

    // Calcolo volume stimato (cm^3) da bounding box * fattore grezzo
    const estVolumeCm3 = useMemo(() => {
        if (knownVolume.trim()) {
            const v = parseFloat(knownVolume);
            return isNaN(v) ? 0 : Math.max(0, v);
        }
        const s = Math.max(0.01, scale / 100);
        const l = (length * s) / 10; // cm
        const w = (width * s) / 10;
        const h = (height * s) / 10;
        const bbox = l * w * h; // cm^3
        const packingFactor = tech === "FDM" ? 0.18 : 0.35; // molto prudenziale
        return Math.round(bbox * packingFactor * 100) / 100;
    }, [length, width, height, scale, knownVolume, tech]);

    const estimatedCost = useMemo(() => {
        return estimateCost({ tech, estVolumeCm3, infill, copies, finishing, colorChanges });
    }, [tech, estVolumeCm3, infill, copies, finishing, colorChanges]);

    const canSubmit = privacyOk && !isSending && (files.length > 0 || notes.trim().length > 0);

    const toggleArrValue = (arr: string[], value: string, setFn: (v: string[]) => void) => {
        setFn(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);
    };

    const onFilesChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const list = e.target.files ? Array.from(e.target.files) : [];
        setFiles(list);
        setPreviewIndex(0); // mostra sempre il primo file caricato
    };

    // Adatta materiale quando cambia tecnologia
    useEffect(() => {
        if (tech === "FDM" && !MATERIALS_FDM.includes(material as any)) setMaterial(MATERIALS_FDM[0]);
        if (tech !== "FDM" && !MATERIALS_RESIN.includes(material as any)) setMaterial(MATERIALS_RESIN[0]);
        setLayerHeight(tech === "FDM" ? 0.2 : 0.05);
        if (tech !== "FDM") setInfill(100);
    }, [tech]);

    const sendTelegram = async () => {
        if (!canSubmit) return;
        setIsSending(true);

        const u = userData || {};

        const fileLines = files.length
            ? files.map((f) => `• ${f.name} (${Math.round(f.size / 1024)} KB)`).join("\n")
            : "(nessun file allegato)";

        const featureLines = selectedFeatures.length
            ? "• " + selectedFeatures.join("\n• ")
            : "(non specificate)";

        const finishingLines = finishing.length ? "• " + finishing.join("\n• ") : "(nessuno)";

        const msg = `
===============================
*Richiesta Stampa 3D*
===============================

👤 *Nome:* ${u.displayName || ""} ${u.cognome || ""}
📧 *Email:* ${u.email || ""}
📞 *Telefono:* ${u.telefono || ""}

🧩 *Esempio selezionato:* ${selectedTemplate ? `${selectedTemplate.title} (${selectedTemplate.category})` : "—"}

🖨️ *Tecnologia:* ${tech}
🧪 *Materiale:* ${material}
🎨 *Colore:* ${color}
📏 *Layer:* ${layerHeight} mm
🏗️ *Infill:* ${tech === "FDM" ? infill + "%" : "—"}
🧯 *Supporti:* ${supports ? "Sì" : "No"}
🔁 *Copie:* ${copies}

📦 *Dimensioni bbox (mm):* ${length}×${width}×${height} @ scala ${scale}%
📐 *Volume stimato:* ${estVolumeCm3} cm³

✨ *Finiture:*\n${finishingLines}
🎯 *Extra richieste:*\n${featureLines}
🔄 *Cambi colore:* ${colorChanges}

📎 *File allegati:*\n${fileLines}

🚚 *Consegna:* ${delivery}${delivery === "Spedizione" && address ? ` — ${address}` : ""}
📆 *Scadenza preferita:* ${deadline || "—"}

📝 *Note:*\n${notes || "(nessuna nota)"}

💶 *Stima indicativa:* ~ € ${estimatedCost}
(La stima è puramente indicativa e potrà variare dopo analisi STL.)
`;

        try {
            await fetch(`https://api.telegram.org/bot${TOKENSVILUPPO}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: CHAT_IDSVILUPPO, text: msg, parse_mode: "Markdown" }),
            });
            setIsSent(true);
            // Reset parziale
            setSelectedTemplate(null);
            setSelectedFeatures([]);
            setTech("FDM");
            setMaterial(MATERIALS_FDM[0]);
            setColor(COLORS[0]);
            setLayerHeight(0.2);
            setInfill(20);
            setSupports(true);
            setCopies(1);
            setLength(50); setWidth(50); setHeight(50); setScale(100); setKnownVolume("");
            setFinishing(["Rimozione supporti"]);
            setColorChanges(0);
            setFiles([]);
            setDeadline("");
            setDelivery("Ritiro in sede");
            setAddress("");
            setNotes("");
            setPrivacyOk(false);
        } catch (e) {
            console.error("Errore invio Telegram:", e);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <Header />
            <div className={styles.container}>
                {/* Intro */}
                <section className={styles.intro}>
                    <h1>Richiesta stampa 3D</h1>
                    <p className={styles.subtitle}>
                        Carica i file STL/OBJ/3MF oppure descrivi il modello. Seleziona tecnologia, materiale e finiture.
                        Ti risponderemo con tempi e costi definitivi.
                    </p>
                </section>

                {/* Filtro & ricerca galleria esempi */}
                <section className={styles.filters}>
                    <div className={styles.filterRow}>
                        <div className={styles.field}>
                            <label>Categoria</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={styles.select}>
                                <option value="tutte">Tutte</option>
                                <option value="Gadget">Gadget</option>
                                <option value="Prototipo">Prototipo</option>
                                <option value="Figura">Figura</option>
                                <option value="Ricambio">Ricambio</option>
                                <option value="Altro">Altro</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label>Cerca</label>
                            <input
                                className={styles.input}
                                placeholder="Cerca esempio o caratteristica…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </section>

                {/* Gallery esempi */}
                <section className={styles.showcase}>
                    <h2>Esempi / Idee di partenza</h2>
                    <div className={styles.grid}>
                        {filteredTemplates.map((t) => {
                            const active = selectedTemplate?.id === t.id;
                            return (
                                <div key={t.id} className={`${styles.card} ${active ? styles.cardActive : ""}`}>
                                    <div className={styles.previewWrap}>
                                        <img src={t.preview} alt={t.title} />
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardHead}>
                                            <h3>{t.title}</h3>
                                            <span className={styles.badge}>{t.category}</span>
                                        </div>
                                        <p className={styles.cardText}>{t.short}</p>
                                        <div className={styles.pills}>
                                            {t.features.slice(0, 4).map((f) => (
                                                <span key={f} className={styles.pill}>{f}</span>
                                            ))}
                                        </div>
                                        <div className={styles.cardActions}>
                                            <button className={styles.button} onClick={() => setSelectedTemplate(t)}>
                                                {active ? "Selezionato ✓" : "Seleziona"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {!filteredTemplates.length && (
                            <div className={styles.empty}>Nessun elemento trovato. Prova a cambiare filtri o ricerca.</div>
                        )}
                    </div>
                </section>

                {/* Configurazione */}
                <section className={styles.config}>
                    <h2>Configura il tuo lavoro di stampa</h2>

                    <div className={styles.formGrid}>
                        {/* Colonna SX */}
                        <div className={styles.formCol}>
                            {/* Upload */}
                            <div className={styles.field}>
                                <label>File modello (STL / OBJ / 3MF / ZIP)</label>
                                <input
                                    className={styles.input}
                                    type="file"
                                    accept=".stl,.obj,.3mf,.zip"
                                    multiple
                                    onChange={onFilesChange}
                                />

                                {!files.length && (
                                    <p className={styles.userHintDim}>
                                        Carica un file STL/OBJ/3MF per vedere l'anteprima 3D.
                                    </p>
                                )}

                                {!!files.length && (
                                    <ul className={styles.fileList}>
                                        {files.map((f) => (
                                            <li key={f.name}>{f.name} — {(f.size / 1024).toFixed(0)} KB</li>
                                        ))}
                                    </ul>
                                )}

                                {files.length > 0 && (
                                    <div className={styles.preview3dCard}>
                                        <div className={styles.preview3dHeader}>
                                            <h3>Anteprima 3D</h3>
                                            <small>File: {files[previewIndex].name}</small>
                                        </div>

                                        {/* Se carichi più file, scegli quale visualizzare */}
                                        {files.length > 1 && (
                                            <div className={styles.field} style={{ padding: "8px 12px" }}>
                                                <label>Visualizza file</label>
                                                <select
                                                    className={styles.select}
                                                    value={previewIndex}
                                                    onChange={(e) => setPreviewIndex(parseInt(e.target.value, 10))}
                                                >
                                                    {files.map((f, i) => (
                                                        <option key={f.name} value={i}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Canvas Three.js con orbita/zoom */}
                                        <ModelPreview file={files[previewIndex]} />

                                        <div className={styles.preview3dFooter}>
                                            Usa il mouse per ruotare/zoomare. La preview è indicativa.
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Tecnologia/materiale */}
                            <div className={styles.fieldRowWrap}>
                                <div className={styles.field}>
                                    <label>Tecnologia</label>
                                    <select className={styles.select} value={tech} onChange={(e) => setTech(e.target.value as Tech)}>
                                        <option>FDM</option>
                                        <option>Resina (SLA/DLP)</option>
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>Materiale</label>
                                    <select className={styles.select} value={material} onChange={(e) => setMaterial(e.target.value)}>
                                        {(tech === "FDM" ? MATERIALS_FDM : MATERIALS_RESIN).map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>Colore</label>
                                    <select className={styles.select} value={color} onChange={(e) => setColor(e.target.value)}>
                                        {COLORS.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.fieldRowWrap}>
                                <div className={styles.field}>
                                    <label>Layer height ({layerHeight} mm)</label>
                                    <input
                                        type="range"
                                        min={tech === "FDM" ? 0.08 : 0.02}
                                        max={tech === "FDM" ? 0.32 : 0.10}
                                        step={tech === "FDM" ? 0.02 : 0.01}
                                        value={layerHeight}
                                        onChange={(e) => setLayerHeight(parseFloat(e.target.value))}
                                    />
                                </div>
                                {tech === "FDM" && (
                                    <div className={styles.field}>
                                        <label>Infill ({infill}%)</label>
                                        <input type="range" min={0} max={100} step={5} value={infill} onChange={(e) => setInfill(parseInt(e.target.value))} />
                                    </div>
                                )}
                                <div className={styles.fieldCheckbox}>
                                    <label className={styles.checkLine}>
                                        <input type="checkbox" checked={supports} onChange={(e) => setSupports(e.target.checked)} />
                                        <span>Supporti necessari</span>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.fieldRowWrap}>
                                <div className={styles.field}>
                                    <label>Copie</label>
                                    <input className={styles.input} type="number" min={1} value={copies} onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || "1")))} />
                                </div>
                                <div className={styles.field}>
                                    <label>Cambi colore</label>
                                    <input className={styles.input} type="number" min={0} value={colorChanges} onChange={(e) => setColorChanges(Math.max(0, parseInt(e.target.value || "0")))} />
                                </div>
                            </div>

                            {/* Dimensioni/Volume */}
                            <div className={styles.field}>
                                <label>Dimensioni (bounding box in mm)</label>
                                <div className={styles.dimGrid}>
                                    <div>
                                        <span>L</span>
                                        <input className={styles.input} type="number" min={1} value={length} onChange={(e) => setLength(Math.max(1, parseFloat(e.target.value || "1")))} />
                                    </div>
                                    <div>
                                        <span>W</span>
                                        <input className={styles.input} type="number" min={1} value={width} onChange={(e) => setWidth(Math.max(1, parseFloat(e.target.value || "1")))} />
                                    </div>
                                    <div>
                                        <span>H</span>
                                        <input className={styles.input} type="number" min={1} value={height} onChange={(e) => setHeight(Math.max(1, parseFloat(e.target.value || "1")))} />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Scala ({scale}%)</label>
                                <input type="range" min={10} max={200} step={5} value={scale} onChange={(e) => setScale(parseInt(e.target.value))} />
                            </div>

                            <div className={styles.field}>
                                <label>Se conosci il volume del modello, inseriscilo (cm³)</label>
                                <input className={styles.input} placeholder="es. 42.5" value={knownVolume} onChange={(e) => setKnownVolume(e.target.value)} />
                                <small className={styles.hint}>In alternativa stimiamo dal bounding box con un fattore prudenziale.</small>
                            </div>

                            <div className={styles.field}>
                                <label>Finiture</label>
                                <div className={styles.checkGrid}>
                                    {FINISHING.map((f) => (
                                        <label key={f} className={styles.checkItem}>
                                            <input type="checkbox" checked={finishing.includes(f)} onChange={() => toggleArrValue(finishing, f, setFinishing)} />
                                            <span>{f}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Extra richiesti</label>
                                <div className={styles.checkGrid}>
                                    {ALL_FEATURES_3D.map((f) => (
                                        <label key={f} className={styles.checkItem}>
                                            <input type="checkbox" checked={selectedFeatures.includes(f)} onChange={() => toggleArrValue(selectedFeatures, f, setSelectedFeatures)} />
                                            <span>{f}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Colonna DX */}
                        <div className={styles.formCol}>
                            {/* Stima */}
                            <div className={styles.estimateCard}>
                                <h3>Stima indicativa</h3>
                                <p className={styles.estimateValue}>~ € {estimatedCost}</p>
                                <p className={styles.estimateNote}>La stima è solo indicativa e potrà variare dopo l'analisi dei file STL/OBJ.</p>
                                <ul className={styles.estimateBreakdown}>
                                    <li>Tecnologia: {tech}</li>
                                    <li>Materiale: {material}, Colore: {color}</li>
                                    <li>Layer: {layerHeight} mm, Infill: {tech === "FDM" ? `${infill}%` : "—"}</li>
                                    <li>Volume stimato: {estVolumeCm3} cm³ • Copie: {copies}</li>
                                </ul>
                            </div>

                            {/* Logistica */}
                            <div className={styles.fieldRowWrap}>
                                <div className={styles.field}>
                                    <label>Consegna</label>
                                    <select className={styles.select} value={delivery} onChange={(e) => setDelivery(e.target.value as any)}>
                                        <option>Ritiro in sede</option>
                                        <option>Spedizione</option>
                                    </select>
                                </div>
                                {delivery === "Spedizione" && (
                                    <div className={styles.field}>
                                        <label>Indirizzo per la spedizione</label>
                                        <input className={styles.input} placeholder="Via, n°, CAP, Città" value={address} onChange={(e) => setAddress(e.target.value)} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.fieldRowWrap}>
                                <div className={styles.field}>
                                    <label>Scadenza preferita</label>
                                    <input className={styles.input} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                                </div>
                            </div>

                            <div className={styles.field}>
                                <label>Note / Specifiche</label>
                                <textarea
                                    className={styles.textarea}
                                    rows={8}
                                    placeholder="Tolleranze richieste, uso finale, zone critiche, preferenze di orientamento, ecc."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className={styles.fieldRow}>
                                <label className={styles.checkLine}>
                                    <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} />
                                    <span>Ho letto l’informativa privacy e acconsento al trattamento dei dati per essere ricontattato.</span>
                                </label>
                            </div>

                            <div className={styles.submitRow}>
                                <button className={styles.buttonPrimary} disabled={!canSubmit} onClick={sendTelegram}>
                                    {isSending ? "Invio in corso…" : "Invia richiesta"}
                                </button>
                                {isSent && <span className={styles.success}>Richiesta inviata con successo! 📩</span>}
                            </div>

                            {userData ? (
                                <p className={styles.userHint}>
                                    Inviamo i tuoi dati precompilati: <strong>{userData.displayName} {userData.cognome}</strong> • <strong>{userData.email}</strong> • <strong>{userData.telefono}</strong>
                                </p>
                            ) : (
                                <p className={styles.userHintDim}>Accedi per precompilare automaticamente i tuoi dati.</p>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <Footer />
        </>
    );
};

export default RichiestaStampa3D;
