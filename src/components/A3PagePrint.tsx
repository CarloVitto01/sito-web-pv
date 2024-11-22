// src/A4PagePrint.tsx
import "../App.css";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Intro from "../components/Intro";
import ContainerCards from "../components/ContainerCards";
import SingleDelimiter from "../components/SingleDelimiter";
import Modal from "../components/Modal";
import FinalModal from "../components/FinalModal";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "../backend/firebase";
import { db } from "../backend/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { v4 } from "uuid";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { TOKEN, CHAT_ID } from "../backend/telegram";
import { FormData } from "../types/FormData";
import { FileHandler } from "../types/FileHandler";
import Form from "./Form";
import NumeroCopie from "./NumeroCopie";
import MultiInput from "./MultiInput";

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
    });
    const [file, setFile] = useState<File[]>([]);
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

    // Prevent scrolling when modal is open
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
            isValid: data.isValid,
        });
    }, []);

    const newValue = useCallback((value: string) => {
        switch (value) {
            case "Colore":
                setInchiostro(inchiostroEnum.COLORE);
                break;
            case "Bianco e nero":
                setInchiostro(inchiostroEnum.BIANCOENERO);
                break;
            case "Fronte":
                setPagina(paginaEnum.FRONTE);
                break;
            case "Fronte-retro":
                setPagina(paginaEnum.FRONTE_RETRO);
                break;
            case "Verticale":
                setLayout(layoutEnum.VERTICALE);
                break;
            case "Orizzontale":
                setLayout(layoutEnum.ORIZZONTALE);
                break;
            case "Auto":
                setLayout(layoutEnum.AUTO);
                break;
            case "Normale":
                setGrammatura(grammaturaEnum.NORMALE);
                break;
            case "Cartoncino":
                setGrammatura(grammaturaEnum.CARTONCINO);
                break;
            case "Si":
                setPlastificazione(plastificazioneEnum.SI);
                break;
            case "No":
                setPlastificazione(plastificazioneEnum.NO);
                break;
        }
    }, []);

    const setPDFHandler = useCallback((files: FileHandler[], totalPages: number) => {
        // Filtra i file per rimuovere eventuali null
        const validFiles = files.map(fileHandler => fileHandler.file).filter((file): file is File => file !== null);

        setFile(validFiles); // Imposta i file validi
        setNumeroPaginePDF(totalPages); // Imposta il numero totale di pagine
        console.log("Totale numero di pagine:", totalPages);
    }, []);



    // Calculate total order
    useEffect(() => {
        const calcoloPreventivo = () => {
            let totale = 0;
            let pagine = numeroPaginePDF;
            console.log("Numero Pagine:", pagine);
            let fogli;
            let foglio = grammatura === grammaturaEnum.CARTONCINO ? grammaturaCartoncino : grammaturaNormale;
            let inchiostroTotale;
            let prezzoInchiostro =
                inchiostro === inchiostroEnum.COLORE ? colore : biancoNero;

            console.log("Numero Pagine:", pagine);
            console.log("Inchiostro Prezzo:", prezzoInchiostro);

            if (pagina === paginaEnum.FRONTE_RETRO) {
                fogli = Math.ceil(pagine / 2);
                inchiostroTotale = 2 * prezzoInchiostro;
            } else {
                fogli = pagine;
                inchiostroTotale = prezzoInchiostro;
            }

            console.log("Numero Pagine:", pagine);

            totale += fogli * (foglio + inchiostroTotale);
            console.log(foglio)
            totale *= numeroCopie;

            console.log("Numero fogli:", fogli);

            if (plastificazione === plastificazioneEnum.SI) {
                totale += 0.30 * pagine;
            }
            if (numeroCopie === 0) {
                totale = 0;
            }

            console.log("Totale:", totale);

            return totale.toFixed(2);
        };

        if (numeroPaginePDF > 0) {
            let total = calcoloPreventivo();
            setPreventivo(total);
        }
    }, [
        inchiostro,
        pagina,
        layout,
        numeroPaginePDF,
        numeroCopie,
        plastificazione,
        grammatura,
    ]);


    // Send data to the Firebase server
    const submitFormHandler = useCallback(async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        setFormSubmitting(true);
        if (file.length === 0 || !data.isValid) { // Controlla se ci sono file
            setFormSubmitting(false); // Assicurati di impostare formSubmitting su false se non ci sono file
            return;
        }

        const id = v4();
        const paths: string[] = []; // Array per memorizzare i percorsi dei file
        const urls: string[] = []; // Array per memorizzare gli URL dei file

        // Carica i file uno per uno
        for (const singleFile of file) {
            const path = `PDF/${data.surname + data.name + "|" + singleFile.name.trim().replace(".pdf", "").replace(/\s/g, "").replace(/\(/g, "[").replace(/\)/g, "]") + "|" + id}.pdf`;
            paths.push(path); // Aggiungi il percorso all'array

            const fileRef = ref(storage, path);
            const snapshot = await uploadBytes(fileRef, singleFile);
            const url = await getDownloadURL(snapshot.ref);
            urls.push(url); // Aggiungi l'URL all'array
        }

        // Crea il messaggio con i link dei file
        const fileLinks = urls.map((url, index) => `- [File ${index + 1}](${url.replace(/\(/g, "[").replace(/\)/g, "]")})`).join("\n");

        const dataToUpload = {
            id: id,
            paths: paths,
            nome: data.name,
            cognome: data.surname,
            email: data.email,
            telefono: data.telephoneNumber,
            files: urls,
            grammatura: grammatura === grammaturaEnum.CARTONCINO ? "Cartoncino" : "Normale",
            colore: inchiostro === inchiostroEnum.COLORE ? "Colore" : "Bianco e nero",
            pagina: pagina === 1 ? "Fronte" : "Fronte-retro",
            layout: layout === 0 ? "Orizzontale" : layout === 1 ? "Verticale" : "Auto",
            plastificazione: plastificazione === plastificazioneEnum.SI ? "Si" : "No",
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
                *NUOVO ORDINE A3*
                *Nome*: ${dataToUpload.nome}
                *Cognome*: ${dataToUpload.cognome}
                *Email*: ${dataToUpload.email}
                *Telefono*: ${dataToUpload.telefono}
                *Link ai file:*
                ${fileLinks}
                *Grammatura*: ${dataToUpload.grammatura}
                *Colore*: ${dataToUpload.colore}
                *Pagina*: ${dataToUpload.pagina}
                *Layout*: ${dataToUpload.layout}
                *Plastificazione*: ${dataToUpload.plastificazione}
                *Copie*: ${dataToUpload.copie}
                *Prezzo*: ${preventivo}€
                `;
                const apiUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
                const data = {
                    chat_id: CHAT_ID,
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
    }, [data.email, data.isValid, data.name, data.surname, data.telephoneNumber, file, grammatura, inchiostro, layout, numeroCopie, numeroPaginePDF, pagina, plastificazione, preventivo]);    // Final modal handling
    const closeFinalModalHandler = useCallback(() => {
        setFormSubmitted(false);
        setFormSubmitting(false);
        setFormError(false);
        window.location.reload(); // Ricarica la pagina
    }, []);
    const setCopiesHandler = useCallback((value: number) => {
        setNumeroCopie(value);
    }, []);

    return (
        <div className="container">
            <Header />
            <Intro />
            <SingleDelimiter />
            <Form onSendData={setDataHandler} />
            <SingleDelimiter />
            <MultiInput onSendData={setPDFHandler} />
            <SingleDelimiter />
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
            <SingleDelimiter />
            <ContainerCards
                title="Colore:"
                components={useMemo(
                    () => [
                        {
                            title: "Colore",
                            imageSrc: require("../assets/images/Colore.jpg"),
                            disabled: false,
                            errorMessage: ""
                        },
                        {
                            title: "Bianco e nero",
                            imageSrc: require("../assets/images/Bianco_e_nero.jpg"),
                            disabled: false,
                            errorMessage: ""
                        },
                    ],
                    []
                )}
                defaultValue="Colore"
                onSendData={newValue}
            />
            <SingleDelimiter />
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
            <SingleDelimiter />
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
            <SingleDelimiter />
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
            <SingleDelimiter />
            <NumeroCopie onSendData={setCopiesHandler} />
            <SingleDelimiter />
            <Modal
                totalOrder={preventivo}
                onSubmit={submitFormHandler}
                disabled={!data.isValid || !file}
            />
            <Footer />
            {(formSubmitted || formSubmitting) && (
                <FinalModal
                    onConfirm={closeFinalModalHandler}
                    loading={formSubmitting ? "submitting" : "submitted"}
                />
            )}
            {formError && (
                <FinalModal onConfirm={closeFinalModalHandler} loading={"error"} />
            )}
        </div>
    );
};

export default A3PagePrint;