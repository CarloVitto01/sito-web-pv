import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import classes from "./MultiInput.module.css";
import Loading from "./Loading";
import { FileHandler } from "../types/FileHandler";
import { Document } from "react-pdf";

interface PropsContainer {
    onSendData: (value: FileHandler[], totalPages: number) => void;
}

const MultiInput: React.FC<PropsContainer> = ({ onSendData }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [numPages, setNumPages] = useState<number[]>([]);
    const [totalNumPages, setTotalNumPages] = useState<number>(0);

    const onDrop = (acceptedFiles: File[]) => {
        setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
    };

    const onDocumentLoadSuccess = (index: number, { numPages }: { numPages: number }): void => {
        setNumPages((prev) => {
            const updated = [...prev];
            updated[index] = numPages;
            return updated;
        });
        setTotalNumPages((prev) => prev + numPages);
    };

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
        },
    });

    useEffect(() => {
        const updatedFiles = files.map((file, i) => ({
            numPages: numPages[i] || 0,
            file,
        }));
        onSendData(updatedFiles, totalNumPages); // Passa il nuovo totale
    }, [files, numPages, totalNumPages, onSendData]);

    return (
        <div className={classes["containerMultiInput"]}>
            <div {...getRootProps({ className: classes.dropzone })}>
                <input {...getInputProps()} />
                <p className={classes["textMultiInput"]}>Inserisci i file PDF qui</p>
            </div>
            <div className={classes["containerPDFMultiInput"]}>
                {files.map((file, index) => (
                    <div key={index} className={classes.pdfContainer}>
                        <Document
                            file={file}
                            onLoadSuccess={(numPages) => onDocumentLoadSuccess(index, numPages)}
                            error="Il file caricato non è nel formato corretto. Riprova."
                            loading={<Loading />}
                            noData="Nessun file PDF selezionato."
                        >
                            {/* Non mostriamo le pagine, ma gestiamo il conteggio */}
                        </Document>
                        <img src={"https://play-lh.googleusercontent.com/oFQmEzOrE0d3MfZ2A_Mm7FTso94um6JfXb3Biz_LH1xk4vWFVUbnTF0wNZfpVevYhoCl"} alt="PDF Icon" className={classes["pdfIcon"]} />
                        <span className={classes.pdfName}>
                            {file.name} - {numPages[index] || 0} {numPages[index] === 1 ? 'pagina' : 'pagine'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(MultiInput);