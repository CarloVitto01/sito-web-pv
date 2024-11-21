import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import classes from "./Input.module.css";
import { Document, Page, pdfjs } from "react-pdf";
import Loading from "./Loading";
import { FileHandler } from "../types/FileHandler";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PropsContainer {
  onSendData: (value: FileHandler[]) => void;
}

const MultiInput: React.FC<PropsContainer> = ({ onSendData }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [numPages, setNumPages] = useState<number[]>([]);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [newPage, setNewPage] = useState<number[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  };

  const onDocumentLoadSuccess = (index: number, { numPages }: { numPages: number }): void => {
    setNumPages((prev) => {
      const updated = [...prev];
      updated[index] = numPages;
      return updated;
    });
    setPageNumbers((prev) => {
      const updated = [...prev];
      updated[index] = 1;
      return updated;
    });
    setNewPage((prev) => {
      const updated = [...prev];
      updated[index] = 1;
      return updated;
    });

    const updatedFiles = files.map((file, i) => ({
      numPages: numPages,
      file,
    }));
    onSendData(updatedFiles);
    console.log("File data sent:", updatedFiles);
  };

  const changePage = (index: number, offset: number) => {
    setPageNumbers((prev) => {
      const updated = [...prev];
      updated[index] = prev[index] + offset;
      return updated;
    });
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const width = window.innerWidth;

  useEffect(() => {
    console.log("Files:", files);
    console.log("NumPages:", numPages);
    console.log("PageNumbers:", pageNumbers);
    console.log("NewPage:", newPage);
  }, [files, numPages, pageNumbers, newPage]);

  return (
    <div className={classes["container"]}>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p className={classes["text"]}>Inserisci i file PDF qui</p>
      </div>
      <div>
        {files.map((file, index) => (
          <div key={index}>
            <Document
              file={file}
              onLoadSuccess={(numPages) => onDocumentLoadSuccess(index, numPages)}
              error="Il file caricato non è nel formato corretto. Riprova."
              loading={<Loading />}
              noData="Nessun file PDF selezionato."
            >
              <Page
                pageNumber={pageNumbers[index] || 1}
                height={width <= 500 ? 50 : 600}
                width={width <= 500 ? 150 : 400}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className={classes["pdfPage"]}
                loading={<Loading />}
                error={<p style={{ whiteSpace: "nowrap" }}>Pagina non disponibile</p>}
                canvasBackground="white"
              />
            </Document>
            <div>
              <div className={classes["pages-container"]}>
                <p className={classes["pagesText"]}>
                  Pagina {pageNumbers[index] || 1} di {numPages[index] || "--"}
                </p>
                <div className={classes["select-page"]}>
                  <p style={{ whiteSpace: "nowrap" }}>Vai a pagina: </p>
                  <input
                    className={classes["numberInput"]}
                    type="number"
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      setNewPage((prev) => {
                        const updated = [...prev];
                        updated[index] = page;
                        return updated;
                      });
                    }}
                  />
                </div>
              </div>
              <div className={classes["buttonsContainer"]}>
                <button
                  type="button"
                  disabled={pageNumbers[index] <= 1}
                  onClick={() => changePage(index, -1)}
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  disabled={pageNumbers[index] >= numPages[index]}
                  onClick={() => changePage(index, 1)}
                >
                  {">"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(MultiInput);
