// src/A4PagePrint.tsx
import "../App.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Intro from "../components/Intro";
import ContainerCards from "../components/ContainerCards";
import SingleDelimiter from "../components/SingleDelimiter";
//import Modal from "../components/Modal";
//import FinalModal from "../components/FinalModal";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../backend/firebase";
import { db } from "../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { TOKENA3, CHAT_IDA3 } from "../backend/telegram";
import { FormData } from "../types/FormData";
import { FileHandler } from "../types/FileHandler";
import Form from "./Form";
import NumeroCopie from "./NumeroCopie";
import MultiInput from "./MultiInput";
import classes from "../components/A3PagePrint.module.css";
import RiepilogoOrdineA3 from "../components/RiepilogoOrdineA3";


// Constants
const grammaturaNormale: number = 0.12;
const grammaturaCartoncino: number = 0.17;
const biancoNero: number = 0.03;
const colore: number = 0.13;


const inchiostroEnum = {
    BIANCOENERO: 0,
    COLORE: 1,
};

const paginaEnum = {
    FRONTE_RETRO: 0,
    FRONTE: 1,
};

const plastificazioneEnum = {
    SI: 0,
    NO: 1,
};

const layoutEnum = {
    ORIZZONTALE: 0,
    VERTICALE: 1,
    AUTO: 2,
};

const grammaturaEnum = {
    NORMALE: 0,
    CARTONCINO: 1
}

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




    // Calculate total order
    useEffect(() => {
        const calcoloPreventivo = () => {
            let totale = 0;
            let pagine = numeroPaginePDF;
            let fogli;
            let foglio = grammatura === grammaturaEnum.CARTONCINO ? grammaturaCartoncino : grammaturaNormale;
            let inchiostroTotale;
            let prezzoInchiostro = inchiostro === inchiostroEnum.COLORE ? colore : biancoNero;

            if (pagina === paginaEnum.FRONTE_RETRO) {
                fogli = Math.ceil(pagine / 2);
                inchiostroTotale = 2 * prezzoInchiostro;
            } else {
                fogli = pagine;
                inchiostroTotale = prezzoInchiostro;
            }

            totale += fogli * (foglio + inchiostroTotale);
            totale *= numeroCopie;

            if (plastificazione === plastificazioneEnum.SI) {
                totale += 0.30 * pagine;
            }
            if (numeroCopie === 0) {
                totale = 0;
            }

            return totale.toFixed(2);
        };

        if (numeroPaginePDF > 0) {
            let total = calcoloPreventivo();
            setPreventivo(total);
        }
        if (numeroPDF === 0) {
            setPreventivo("0.00")
        }
    }, [inchiostro, pagina, layout, numeroPaginePDF, numeroCopie, plastificazione, grammatura, numeroPDF]);

    const submitFormHandler = useCallback(async (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event?.preventDefault();
        setFormSubmitting(true);
        if (fileData.length === 0 || !data.isValid) { // Controlla se ci sono file
            setFormSubmitting(false); // Assicurati di impostare formSubmitting su false se non ci sono file
            return;
        }

        const id = v4();
        const paths: string[] = []; // Array per memorizzare i percorsi dei file
        const urls: string[] = []; // Array per memorizzare gli URL dei file

        // Carica i file uno per uno
        for (const { file } of fileData) {
            const path = `PDF/${data.surname + data.name + "|" + file.name.trim().replace(".pdf", "").replace(/\s/g, "").replace(/\(/g, "[").replace(/\)/g, "]") + "|" + id}.pdf`;
            paths.push(path);

            const fileRef = ref(storage, path);
            const snapshot = await uploadBytes(fileRef, file);
            const url = await getDownloadURL(snapshot.ref);
            urls.push(url);
        }

        // Crea il messaggio con i link dei file
        const fileLinks = urls.map((url, index) => {
            const pages = fileData[index].pages;
            return `- [File ${index + 1} - ${pages} pagine](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`;
        }).join("\n");

        const dataToUpload = {
            id: id,
            paths: paths,
            nome: data.name,
            cognome: data.surname,
            email: data.email,
            telefono: data.telephoneNumber,
            corsoLaurea: data.corsoLaurea,
            annoAccademico: data.annoAccademico,
            files: urls,
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
        };

        const collectionRef = collection(db, "StampePDF");
        const PDFref = doc(collectionRef, id);
        setDoc(PDFref, dataToUpload)
            .then(() => {
                setFormSubmitting(false);
                setFormSubmitted(true);
                // Invia il messaggio a Telegram
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
💰💰 *Prezzo*: ${preventivo}€ 💰💰
`;
                const apiUrl = `https://api.telegram.org/bot${TOKENA3}/sendMessage`;
                const data = {
                    chat_id: CHAT_IDA3,
                    text: messageText,
                    parse_mode: "Markdown",
                };
                const requestOptions = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                };
                fetch(apiUrl, requestOptions)
                    .then((response) => {
                        if (response.ok) {
                            console.log("Messaggio inviato con successo");
                        } else {
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
    }, [data.annoAccademico, data.corsoLaurea, data.email, data.isValid, data.name, data.surname, data.telephoneNumber, fileData, grammatura, inchiostro, layout, numeroCopie, numeroPDF, numeroPaginePDF, pagina, plastificazione, preventivo]);



    // Send data to the Firebase server
    //const closeFinalModalHandler = useCallback(() => {
    //    setFormSubmitted(false);
    //    setFormSubmitting(false);
    //    setFormError(false);
    //    window.location.reload();
    //}, []);
    const setCopiesHandler = useCallback((value: number) => {
        setNumeroCopie(value);
    }, []);



    useEffect(() => {
        if (formSubmitted) {
            const timeout = setTimeout(() => {
                window.location.reload(); // 🔄 ricarica la pagina
            }, 3000); // ⏱️ attende 3 secondi prima del refresh
            return () => clearTimeout(timeout);
        }
    }, [formSubmitted]);


    return (
        <div className="container">
            <Header />
            <Intro
                title={"STAMPA I TUOI DOCUMENTI A3"}
                text={"In questa pagina potrai ordinare la stampa del tuo documento, inserisci le caratteristiche disponibili nelle varie sezioni per poter avere dei documenti cartacei di qualità."}
            />
            <SingleDelimiter />
            <Form onSendData={setDataHandler} />
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
                                    imageSrc: require("../assets/images/Colore.jpg"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Cartoncino",
                                    imageSrc: require("../assets/images/Bianco_e_nero.jpg"),
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
                                    imageSrc: require("../assets/images/Colori_ruota.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Bianco e nero",
                                    imageSrc: require("../assets/images/Bianco_Nero_Ruota.png"),
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
                                    imageSrc: require("../assets/images/Fronte.png"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "Fronte-retro",
                                    imageSrc: require("../assets/images/Fronte_retro.png"),
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
                                    imageSrc: require("../assets/images/Anelli.jpg"),
                                    disabled: false,
                                    errorMessage: ""
                                },
                                {
                                    title: "No",
                                    imageSrc: require("../assets/images/Nessuna.jpg"),
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
                                    imageSrc: require("../assets/images/2in1Orizzontale.jpg"),
                                    disabled: false,
                                    errorMessage: "",
                                },
                                {
                                    title: "Orizzontale",
                                    imageSrc: require("../assets/images/Orizzontale.jpg"),
                                    disabled: false,
                                    errorMessage: "",
                                },
                                {
                                    title: "Verticale",
                                    imageSrc: require("../assets/images/Verticale.jpg"),
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
                        onConfirmOrder={submitFormHandler}
                        disabled={!data.isValid || fileData.length === 0 || formSubmitting}
                        loading={formSubmitting}
                        submitted={formSubmitted}
                    />
                </div>
            </div>

            <Footer />
            {/*<Modal totalOrder={preventivo} onSubmit={submitFormHandler} disabled={!data.isValid || !file} />
            
            {(formSubmitted || formSubmitting) && <FinalModal onConfirm={closeFinalModalHandler} loading={formSubmitting ? "submitting" : "submitted"} />}
            {formError && <FinalModal onConfirm={closeFinalModalHandler} loading={"error"} />}*/}
        </div>
    );
};

export default A3PagePrint;