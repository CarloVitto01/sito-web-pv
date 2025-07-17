import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import classes from "./MultiInput.module.css";
import { FileHandler } from "../types/FileHandler";
import { Document, Page } from "react-pdf";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Loading from "./Loading";
import { GrCaretNext, GrCaretPrevious } from "react-icons/gr";
import { AiOutlineClose } from "react-icons/ai";
import { MdDelete, MdOutlinePreview } from "react-icons/md";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PropsContainer {
    onSendData: (value: FileHandler[], totalPages: number) => void;
}

const MultiInput: React.FC<PropsContainer> = ({ onSendData }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [numPages, setNumPages] = useState<number[]>([]);
    const [/*totalNumPages*/, setTotalNumPages] = useState<number>(0);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    };

    const onDocumentLoadSuccess = (index: number, { numPages }: { numPages: number }): void => {
        setNumPages((prev) => {
            const updated = [...prev];
            updated[index] = numPages;
            return updated;
        });
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
    });

    useEffect(() => {
        // Calcola il numero totale di pagine solo quando numPages cambia
        const newTotalNumPages = numPages.reduce((acc, num) => acc + num, 0);
        setTotalNumPages(newTotalNumPages);

        // Invia i dati solo se ci sono file e numPages è stato aggiornato
        if (files.length > 0 && numPages.length > 0) {
            const updatedFiles = files.map((file, i) => ({
                numPages: numPages[i] || 0,
                file,
            }));
            onSendData(updatedFiles, newTotalNumPages);
        }
    }, [files, numPages, onSendData]);

    const openPopup = (file: File, index: number) => {
        setCurrentFile(file);
        setCurrentFileIndex(index);
        setPageNumber(1); // Reset to first page on open
        setIsOpen(true);
    };

    const closePopup = () => {
        setIsOpen(false);
        setCurrentFile(null);
        setCurrentFileIndex(null);
    };

    const removeFile = (index: number) => {
        setFiles((prevFiles) => {
            const updatedFiles = prevFiles.filter((_, i) => i !== index);
            // Ricalcola il numero totale di pagine
            const updatedNumPages = numPages.filter((_, i) => i !== index);
            setNumPages(updatedNumPages);
            // Ricalcola il totale delle pagine
            const newTotalNumPages = updatedNumPages.reduce((acc, num) => acc + num, 0);
            setTotalNumPages(newTotalNumPages);
            // Invia i dati aggiornati
            onSendData(updatedFiles.map((file, i) => ({ numPages: updatedNumPages[i] || 0, file })), newTotalNumPages);
            return updatedFiles;
        });
    };

    const changePage = (offset: number) => {
        setPageNumber((prevPageNumber) => prevPageNumber + offset);
    };

    const width = window.innerWidth;

    return (
        <div className={classes["containerMultiInput"]}>
            <div {...getRootProps({ className: classes.dropzone })}>
                <input {...getInputProps()} />
                <p className={classes["textMultiInput"]}>Inserisci i file PDF qui</p>
            </div>
            <div className={classes["sottotitoloMultiInput"]}>
                <p className={classes["title"]}>o trascina e lascia il file PDF qui</p>
            </div>
            <div className={classes["containerPDFMultiInput"]}>
                {files.map((file, index) => (
                    <div key={index} className={classes.pdfContainer}>
                        <img src={require("../assets/images/PDF_file_icon.svg.png")} alt="PDF Icon" className={classes["pdfIcon"]} />
                        <span className={classes["pdfName"]}>
                            {file.name.length > 30
                                ? file.name.slice(0, 30) + '...'
                                : file.name}
                            - {numPages[index] || 0}
                            {numPages[index] === 1 ? ' pagina' : ' pagine'}
                        </span>
                        <div className={classes.pdfContainerButton}>
                            <div className={classes["button-container"]}>
                                <div className={classes["artButton"]} onClick={() => openPopup(file, index)}>
                                    <MdOutlinePreview />
                                </div>
                            </div>
                            <div className={classes["button-container"]}>
                                <div className={classes["artButton"]} onClick={() => removeFile(index)}>
                                    <MdDelete />
                                </div>
                            </div>
                        </div>


                        <Document file={file} onLoadSuccess={(data) => onDocumentLoadSuccess(index, data)} />
                    </div>
                ))}
            </div>
            {/*<div className={classes["totalPages"]}>
                <p><strong>Totale Pagine: {totalNumPages}</strong></p>
                <p><strong>Totale PDF: {files.length}</strong></p>
            </div>*/}
            {isOpen && currentFile && currentFileIndex !== null && (
                <div className={classes["popup"]}>
                    <div className={classes["popupContent"]}>
                        <Document
                            file={currentFile} onLoadSuccess={({ numPages }) => setNumPages((prev) => {
                                const updated = [...prev];
                                updated[currentFileIndex] = numPages;
                                return updated;
                            })}
                            loading={<Loading />}
                        >
                            <Page
                                pageNumber={pageNumber}
                                height={width <= 500 ? 100 : 600}
                                width={width <= 500 ? 300 : 400}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                className={classes["pdfPage"]}
                                loading={<Loading />}
                                error={
                                    <p style={{ whiteSpace: "nowrap" }}>
                                        Pagina non disponibile
                                    </p>
                                }
                                canvasBackground="white"
                            />
                        </Document>
                        <div className={classes["pagination"]}>
                            <div className={classes["button-container"]}>
                                <div
                                    className={classes["artButton"]}
                                    onClick={() => pageNumber > 1 && changePage(-1)}
                                    style={{ opacity: pageNumber <= 1 ? 0.5 : 1, pointerEvents: pageNumber <= 1 ? 'none' : 'auto' }}
                                >
                                    <GrCaretPrevious />
                                </div>
                            </div>
                            <span style={{color:"white"}}>Pagina {pageNumber} di {numPages[currentFileIndex]}</span>
                            <div className={classes["button-container"]}>
                                <div
                                    className={classes["artButton"]}
                                    onClick={() => pageNumber < numPages[currentFileIndex] && changePage(1)}
                                    style={{ opacity: pageNumber >= numPages[currentFileIndex] ? 0.5 : 1, pointerEvents: pageNumber >= numPages[currentFileIndex] ? 'none' : 'auto' }}
                                >
                                    <GrCaretNext />
                                </div>
                            </div>
                            <div className={classes["button-container"]}>
                                <div className={classes["artButton"]} onClick={closePopup}><AiOutlineClose /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiInput;
