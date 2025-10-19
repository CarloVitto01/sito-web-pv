// src/A4PagePrint.tsx
import "../../App.css";
import Footer from "../FooterComponents/Footer";
import Header from "../HeaderComponents/Header";
import Intro from "../IntroComponents/Intro";
import ContainerCards from "../CardComponents/ContainerCards";
import SingleDelimiter from "../SingleDelimiterComponents/SingleDelimiter";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { auth, storage, db } from "../../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { TOKENA3, CHAT_IDA3 } from "../../backend/telegram";
import { FormData } from "../../types/FormData";
import { FileHandler } from "../../types/FileHandler";
import Form from "../FormComponents/Form";
import NumeroCopie from "../NumeroCopieComponents/NumeroCopie";
import MultiInput from "../MultiInputComponents/MultiInput";
import classes from "../A3/A3PagePrint.module.css";
import RiepilogoOrdineA3 from "../RiepilogoOrdineComponents/RiepilogoOrdineA3";
import { onAuthStateChanged } from "firebase/auth";
import Banner from "../Banner/Banner";

// Formatter € (aggiunta)
const fmtEuro = (n?: number | string) =>
    typeof n === "number"
        ? n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : Number(n || 0).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

//Constants

const inchiostroEnum = { BIANCOENERO: 0, COLORE: 1 };
const paginaEnum = { FRONTE_RETRO: 0, FRONTE: 1 };
const plastificazioneEnum = { SI: 0, NO: 1 };
const layoutEnum = { ORIZZONTALE: 0, VERTICALE: 1, AUTO: 2 };
const grammaturaEnum = { NORMALE: 0, CARTONCINO: 1 };

const A3PagePrint = () => {
    const [data, setData] = useState<FormData>({
        name: "",
        surname: "",
        email: "",
        telephoneNumber: "",
        corsoLaurea: "",
        annoAccademico: ""
    });
    const [fileData, setFileData] = useState<{ file: File; pages: number }[]>([]);
    const [numeroPaginePDF, setNumeroPaginePDF] = useState<number>(0);
    const [inchiostro, setInchiostro] = useState<number>(inchiostroEnum.COLORE);
    const [grammatura, setGrammatura] = useState<number>(grammaturaEnum.NORMALE);
    const [pagina, setPagina] = useState<number>(paginaEnum.FRONTE);
    const [layout, setLayout] = useState<number>(layoutEnum.AUTO);
    const [numeroCopie, setNumeroCopie] = useState<number>(1);
    const [preventivo, setPreventivo] = useState<string>("0.00");
    const [plastificazione, setPlastificazione] = useState<number>(plastificazioneEnum.SI);
    const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
    const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<boolean>(false);
    const [numeroPDF, setNumeroPDF] = useState<number>(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [costi, setCosti] = useState({
        grammaturaNormale: 0.12,
        grammaturaCartoncino: 0.17,
        biancoNero: 0.03,
        colore: 0.13,
        plastificazione: 0.30
    });

    useEffect(() => {
        const costiRef = doc(db, "configA3", "costi");
        const unsub = onSnapshot(costiRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (
                    typeof data.grammaturaNormale === "number" &&
                    typeof data.grammaturaCartoncino === "number" &&
                    typeof data.biancoNero === "number" &&
                    typeof data.colore === "number" &&
                    typeof data.plastificazione === "number"
                ) {
                    setCosti(data as {
                        grammaturaNormale: number;
                        grammaturaCartoncino: number;
                        biancoNero: number;
                        colore: number;
                        plastificazione: number;
                    });
                }
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (formSubmitted || formSubmitting || formError) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [formSubmitted, formSubmitting, formError]);

    // Form Data Handling
    const setDataHandler = useCallback((data: FormData) => {
        setData({
            name: data.name,
            surname: data.surname,
            email: data.email,
            telephoneNumber: data.telephoneNumber,
            corsoLaurea: data.corsoLaurea,
            annoAccademico: data.annoAccademico,
            isValid: data.isValid,
        });
    }, []);

    const newValue = useCallback((value: string) => {
        switch (value) {
            case "Colore": setInchiostro(inchiostroEnum.COLORE); break;
            case "Bianco e nero": setInchiostro(inchiostroEnum.BIANCOENERO); break;
            case "Fronte": setPagina(paginaEnum.FRONTE); break;
            case "Fronte-retro": setPagina(paginaEnum.FRONTE_RETRO); break;
            case "Verticale": setLayout(layoutEnum.VERTICALE); break;
            case "Orizzontale": setLayout(layoutEnum.ORIZZONTALE); break;
            case "Auto": setLayout(layoutEnum.AUTO); break;
            case "Normale": setGrammatura(grammaturaEnum.NORMALE); break;
            case "Cartoncino": setGrammatura(grammaturaEnum.CARTONCINO); break;
            case "Si": setPlastificazione(plastificazioneEnum.SI); break;
            case "No": setPlastificazione(plastificazioneEnum.NO); break;
        }
    }, []);

    const setPDFHandler = useCallback((files: FileHandler[], totalPages: number) => {
        const validFiles = files
            .filter((f) => f.file !== null)
            .map((f) => ({
                file: f.file as File,
                pages: f.numPages || 0,
            }));

        setFileData(validFiles);
        setNumeroPDF(validFiles.length);
        setNumeroPaginePDF(totalPages);
    }, []);

    const setCopiesHandler = useCallback((value: number) => {
        setNumeroCopie(value);
    }, []);

    // Calculate total order
    useEffect(() => {
        const calcoloPreventivo = () => {
            let totale = 0;
            let pagine = numeroPaginePDF;
            let fogli =
                pagina === paginaEnum.FRONTE_RETRO ? Math.ceil(pagine / 2) : pagine;
            let costoFoglio =
                grammatura === grammaturaEnum.CARTONCINO
                    ? costi.grammaturaCartoncino
                    : costi.grammaturaNormale;
            let costoInchiostro =
                inchiostro === inchiostroEnum.COLORE ? costi.colore : costi.biancoNero;
            let inchiostroTotale =
                pagina === paginaEnum.FRONTE_RETRO ? 2 * costoInchiostro : costoInchiostro;

            // ✅ Calcolo base per fogli e inchiostro
            totale += fogli * (costoFoglio + inchiostroTotale);
            totale *= numeroCopie;

            // ✅ Plastificazione moltiplicata per pagine e copie
            if (plastificazione === plastificazioneEnum.SI) {
                totale += costi.plastificazione * pagine * numeroCopie;
            }

            if (numeroCopie === 0) totale = 0;

            return totale.toFixed(2);
        };

        if (numeroPaginePDF > 0) setPreventivo(calcoloPreventivo());
        if (numeroPDF === 0) setPreventivo("0.00");
    }, [costi, inchiostro, pagina, numeroPaginePDF, numeroCopie, plastificazione, grammatura, numeroPDF]);

    // --- Helpers quantità per A3 ---
    // n° fogli per copia: se fronte-retro => ceil(pagine/2), altrimenti = pagine
    const computeNFogliPerCopiaA3 = (pagineTot: number, paginaMode: number) => {
        const fogli = paginaMode === paginaEnum.FRONTE_RETRO ? Math.ceil(pagineTot / 2) : pagineTot;
        return Math.max(0, fogli);
    };

    // 🔁 AGGIORNATO: ora accetta (event) oppure (paymentPayload, event)
    const submitFormHandler = useCallback(async (arg1?: any, arg2?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        // 🆕 normalizza parametri senza rompere l’esistente
        const isPaymentPayload = (o: any) => o && typeof o === "object" && ("method" in o);
        const payment = isPaymentPayload(arg1)
            ? (arg1 as {
                method: "CASH" | "PAYPAL";
                confirmed: boolean;
                amount?: number;
                orderId?: string;
                captureId?: string;
                payerEmail?: string;
                breakdown?: {
                    imponibile: number;
                    iva: number;
                    trasporto: number;
                    feePayPal: number;
                };
            })
            : undefined;
        const event = isPaymentPayload(arg1) ? arg2 : (arg1 as React.MouseEvent<HTMLButtonElement, MouseEvent> | undefined);

        event?.preventDefault();

        // 🔐 Allineamento ad A4: richiedi login
        if (!auth.currentUser) {
            alert("Per effettuare un ordine è necessario effettuare il login.");
            window.location.href = "/login";
            return;
        }
        setFormSubmitting(true);

        if (fileData.length === 0 || !data.isValid) {
            setFormSubmitting(false);
            return;
        }

        const id = v4();
        const paths: string[] = [];
        const urls: string[] = [];

        // Upload file
        for (const { file } of fileData) {
            const path = `PDF/${data.surname + data.name + "|" + file.name.trim().replace(".pdf", "").replace(/\s/g, "").replace(/\(/g, "[").replace(/\)/g, "]") + "|" + id}.pdf`;
            paths.push(path);

            const fileRef = ref(storage, path);
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);
            urls.push(url);
        }

        // ✅ Messaggio con numero di pagine accanto al link
        const fileLinks = urls.map((url, index) => {
            const pages = fileData[index].pages;
            return `- [File ${index + 1} - ${pages} pagine](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`;
        }).join("\n");

        // 🆕 calcolo descrizioni pagamento (fallback se non passato)
        const metodoPagamento =
            payment?.method === "PAYPAL"
                ? "PayPal"
                : payment?.method === "CASH"
                    ? "Contanti"
                    : "n/d";

        const statoPagamento =
            payment?.method === "PAYPAL"
                ? (payment.confirmed ? "Pagato (conferma utente)" : "Non verificato")
                : payment?.method === "CASH"
                    ? "Da saldare alla consegna"
                    : "Non specificato";

        // 🧮 Quantità necessarie per StoricoDati (costi interni)
        const nFogliPerCopia = computeNFogliPerCopiaA3(numeroPaginePDF, pagina);
        const nFogli = nFogliPerCopia * Math.max(1, numeroCopie);

        // chiavi comode per i filtri "Campo/Match" degli extra A3
        const isColore = inchiostro === inchiostroEnum.COLORE;
        const inchiostroKey = isColore ? "colore" : "biancoenero";
        const grammaturaKey = (grammatura === grammaturaEnum.CARTONCINO) ? "cartoncino" : "normale";
        const plastificazioneKey = (plastificazione === plastificazioneEnum.SI) ? "si" : "no";


        const dataToUpload = {
            id: id,
            path: paths,
            nome: data.name,
            cognome: data.surname,
            email: data.email,
            telefono: data.telephoneNumber,
            corsoLaurea: data.corsoLaurea,
            annoAccademico: data.annoAccademico,
            file: urls,
            grammatura: grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale",
            colore: inchiostro === inchiostroEnum.COLORE ? "Colore" : "Bianco e nero",
            pagina: pagina === 1 ? "Fronte" : "Fronte-retro",
            layout: layout === 0 ? "Orizzontale" : layout === 1 ? "Verticale" : "Auto",
            plastificazione: plastificazione === plastificazioneEnum.SI ? "Si" : "No",
            numeroPDF: numeroPDF,
            pagine: numeroPaginePDF,
            copie: numeroCopie,
            prezzo: preventivo,
            timestamp: serverTimestamp(),
            tipo: "A3",                 // aggiunto (non rimuove nulla)
            uid: auth.currentUser?.uid, // aggiunto (non rimuove nulla)
            // Se vuoi salvarli anche su Firestore, decommenta:
            // metodoPagamento,
            // statoPagamento,
            // ✅ NUOVI CAMPI (usati da StoricoDati per i costi interni)
            nFogli,                  // <-- importantissimo per i per_foglio
            nFogliPerCopia,          // (facoltativo ma utile)
            inchiostro: inchiostroKey,       // "colore" | "biancoenero"
            grammaturaKey,                   // "normale" | "cartoncino"
            plastificazioneKey,
        };
        const collectionRef = collection(db, "StampePDFA3");
        const PDFref = doc(collectionRef, id);


        setDoc(PDFref, dataToUpload)
            .then(async () => {
                // 🔄 AGGIORNA I DATI UTENTE SU RACCOLTA "users"
                if (auth.currentUser) {
                    const userRef = doc(db, "users", auth.currentUser.uid);
                    await updateDoc(userRef, {
                        displayName: dataToUpload.nome,
                        cognome: dataToUpload.cognome,
                        email: dataToUpload.email,
                        telefono: dataToUpload.telefono,
                        corsoLaurea: dataToUpload.corsoLaurea,
                        annoAccademico: dataToUpload.annoAccademico,
                    });
                }

                setFormSubmitting(false);
                setFormSubmitted(true);

                // 🆕 Totale finale: usa payment.amount (IVA+trasporto+fee) con fallback al preventivo
                const totaleFinale =
                    typeof payment?.amount === "number" ? payment.amount : Number(preventivo);

                // ✅ CREA versione ridotta dell'ordine senza file PDF
                const { file, path, ...rest } = dataToUpload;
                const datiSnelliti = {
                    ...rest,
                    totaleFinale,                             // già presente
                    metodoPagamento,                          // ✅ nuovo
                    trasporto: payment?.breakdown?.trasporto ?? 0,    // ✅ nuovo
                    imponibile: payment?.breakdown?.imponibile ?? undefined, // ✅ nuovo
                    iva: payment?.breakdown?.iva ?? undefined,         // ✅ nuovo
                    paypalFee: payment?.breakdown?.feePayPal ?? 0,     // ✅ nuovo
                    timestamp: serverTimestamp(),
                    // ✅ ripetizione campi tecnici
                    nFogli,
                    nFogliPerCopia,
                    inchiostro: inchiostroKey,
                    grammaturaKey,
                    plastificazioneKey,
                };



                await setDoc(doc(db, "ArchivioOrdini", id), datiSnelliti);


                // 🧾 Dettagli PayPal facoltativi
                const extraPP =
                    payment?.method === "PAYPAL"
                        ? `\n🧾 *PayPal OrderID*: ${payment.orderId ?? "-"}\n🧾 *CaptureID*: ${payment.captureId ?? "-"}\n👤 *Payer*: ${payment.payerEmail ?? "-"}\n`
                        : "";

                // 🆕 Messaggio Telegram aggiornato con Totale finale
                const messageText = `
=====================
  *NUOVO ORDINE A3*
=====================

📝 *Dettagli Ordine:*
*Nome*: ${dataToUpload.nome}
*Cognome*: ${dataToUpload.cognome}
*Email*: ${dataToUpload.email}
*Telefono*: ${dataToUpload.telefono}
*Corso Laurea*: ${dataToUpload.corsoLaurea}
*Anno Accademico*: ${dataToUpload.annoAccademico}

📁 *Link ai file:* 📄
${fileLinks}

⚖ *Grammatura*: ${dataToUpload.grammatura}
🎨 *Colore*: ${dataToUpload.colore}
📄 *Pagina*: ${dataToUpload.pagina}
📐 *Layout*: ${dataToUpload.layout}
*Plastificazione*: ${dataToUpload.plastificazione}
🔢 *Copie*: ${dataToUpload.copie}

💳 *Metodo di pagamento*: ${metodoPagamento}
✅ *Stato pagamento*: ${statoPagamento}
💰 *Totale finale*: ${fmtEuro(totaleFinale)} €
${extraPP}`.trim();
                const apiUrl = `https://api.telegram.org/bot${TOKENA3}/sendMessage`;
                const payload = {
                    chat_id: CHAT_IDA3,
                    text: messageText,
                    parse_mode: "Markdown",
                };

                fetch(apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
                    .then((response) => {
                        if (!response.ok) {
                            console.log("Errore durante l'invio del messaggio:", response.statusText);
                        }
                    })
                    .catch((error) => {
                        console.error("Errore durante l'invio del messaggio:", error);
                    });
            })
            .catch((error) => {
                console.log(error);
                setFormError(true);
                setFormSubmitting(false);
            });
    },
        [
            data,
            fileData,
            grammatura,
            inchiostro,
            layout,
            numeroCopie,
            numeroPDF,
            numeroPaginePDF,
            pagina,
            plastificazione,
            preventivo
        ]
    );

    useEffect(() => {
        if (formSubmitted) {
            const timeout = setTimeout(() => {
                window.location.reload(); // 🔄 ricarica la pagina
            }, 3000); // ⏱️ attende 3 secondi prima del refresh
            return () => clearTimeout(timeout);
        }
    }, [formSubmitted]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setIsLoggedIn(true);
                const docRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(docRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setData({
                        name: userData.displayName || "",
                        surname: userData.cognome || "",
                        email: userData.email || "",
                        telephoneNumber: userData.telefono || "",
                        corsoLaurea: userData.corsoLaurea || "",
                        annoAccademico: userData.annoAccademico || "",
                        isValid: false
                    });
                }
            } else {
                setIsLoggedIn(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="container">
            <Header />
            <Banner />
            <Intro
                title={"STAMPA I TUOI DOCUMENTI A3"}
                text={"In questa pagina potrai ordinare la stampa del tuo documento, inserisci le caratteristiche disponibili nelle varie sezioni per poter avere dei documenti cartacei di qualità."}
            />
            <SingleDelimiter />
            <Form onSendData={setDataHandler} defaultValues={data} disabled={!isLoggedIn}
                readOnlyFields={isLoggedIn} />
            <SingleDelimiter />
            <MultiInput onSendData={setPDFHandler} />
            <SingleDelimiter />

            <div className={classes["subContainerA4"]}>
                <div className={classes["subContainerA4Left"]}>
                    <div className="container-containerCards"></div>
                    <ContainerCards
                        title="Grammatura:"
                        components={useMemo(
                            () => [
                                {
                                    title: "Normale",
                                    imageSrc: require("../../assets/images/Grammatura_normale_A3.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Cartoncino",
                                    imageSrc: require("../../assets/images/Grammatura_Cartoncino_A3.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                            ],
                            []
                        )}
                        defaultValue="Normale"
                        onSendData={newValue}
                    />
                    <ContainerCards
                        title="Colore:"
                        components={useMemo(
                            () => [
                                {
                                    title: "Colore",
                                    imageSrc: require("../../assets/images/Colore.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Bianco e nero",
                                    imageSrc: require("../../assets/images/Bianco_nero.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                            ],
                            []
                        )}
                        defaultValue="Colore"
                        onSendData={newValue}
                    />
                    <ContainerCards
                        title="Gestione pagina:"
                        components={useMemo(
                            () => [
                                {
                                    title: "Fronte",
                                    imageSrc: require("../../assets/images/Fronte.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Fronte-retro",
                                    imageSrc: require("../../assets/images/Fronte_retro.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                            ],
                            []
                        )}
                        defaultValue="Fronte"
                        onSendData={newValue}
                    />
                    <ContainerCards
                        title="Plastificazione:"
                        components={useMemo(
                            () => [
                                {
                                    title: "Si",
                                    imageSrc: require("../../assets/images/Plastificatrice_si.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "No",
                                    imageSrc: require("../../assets/images/Plastificatrice_no.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                            ],
                            []
                        )}
                        defaultValue="Si"
                        onSendData={newValue}
                    />
                    <ContainerCards
                        title="Layout:"
                        components={useMemo(
                            () => [
                                {
                                    title: "Auto",
                                    imageSrc: require("../../assets/images/Layout_auto.png"),
                                    disabled: false,
                                    errorMessage: "",
                                },
                                {
                                    title: "Orizzontale",
                                    imageSrc: require("../../assets/images/Orizzontale.png"),
                                    disabled: false,
                                    errorMessage: "",
                                },
                                {
                                    title: "Verticale",
                                    imageSrc: require("../../assets/images/Verticale.png"),
                                    disabled: false,
                                    errorMessage: "",
                                },
                            ],
                            []
                        )}
                        defaultValue="Auto"
                        onSendData={newValue}
                    />

                    <NumeroCopie onSendData={setCopiesHandler} />
                </div>

                <div className={classes["subContainerA4Right"]}>
                    <RiepilogoOrdineA3
                        numeroPDF={numeroPDF}
                        numeroPagine={numeroPaginePDF}
                        numeroCopie={numeroCopie}
                        grammatura={grammatura === 1 ? "Cartoncino" : "Normale"}
                        inchiostro={inchiostro === 1 ? "Colore" : "Bianco e nero"}
                        pagina={pagina === 1 ? "Fronte" : "Fronte-retro"}
                        layout={layout === 0 ? "Orizzontale" : layout === 1 ? "Verticale" : "Auto"}
                        plastificazione={plastificazione === 0 ? "Si" : "No"}
                        prezzo={preventivo}
                        onConfirmOrder={submitFormHandler} // compatibile con (payload, event) o solo (event)
                        disabled={!data.isValid || fileData.length === 0 || formSubmitting}
                        loading={formSubmitting}
                        submitted={formSubmitted}
                    />
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default A3PagePrint;
