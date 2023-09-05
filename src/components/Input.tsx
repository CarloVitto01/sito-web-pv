import { useDropzone } from "react-dropzone";
import classes from "./Input.module.css";
import { Document, Page } from "react-pdf";
import { useState, useEffect } from "react";
import { pdfjs } from "react-pdf";
import Loading from "./Loading";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

interface propsContainer {
  onSendData: (value: any) => void;
}

const Input: React.FC<propsContainer> = ({ onSendData }) => {
  const [file, setFile] = useState<any>();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [newPage, setNewPage] = useState<number>(0);

  useEffect(() => {
    if (!newPage) {
      setNewPage(1);
    }
    const timerId = setTimeout(() => {
      setPageNumber(newPage);
    }, 0);

    return () => clearTimeout(timerId);
  }, [newPage]);

  const handleKeyPress = (e: any) => {
    console.log(e.key);
    if (e.key === "Enter") {
      setPageNumber(newPage);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
    onSendData({ numPages, file });
  }

  async function changePage(offset: number) {
    setPageNumber((prevPageNumber) => prevPageNumber + offset);
  }

  const onDrop = (acceptedFiles: any) => {
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const width = window.innerWidth;

  return (
    <div className={classes["container"]}>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p className={classes["text"]}>Inserisci il file PDF qui</p>
      </div>
      <div>
        {file && (
          <>
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              error="Il file caricato non è nel formato corretto. Riprova."
              loading={<Loading />}
              noData="Nessun file PDF selezionato."
            >
              <div>
                <Page
                  pageNumber={pageNumber}
                  height={width <= 500 ? 50 : 600}
                  width={width <= 500 ? 150 : 400}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className={classes["pdfPage"]}
                  loading={<Loading />}
                  error={
                    <p style={{ whiteSpace: "nowrap" }}>
                      Pagina non disponible
                    </p>
                  }
                  canvasBackground="white"
                />
              </div>
            </Document>
            <div>
              <div className={classes["pages-container"]}>
                <p className={classes["pagesText"]}>
                  Pagina {pageNumber || (numPages ? 1 : "--")} di{" "}
                  {numPages || "--"}
                </p>
                <div className={classes["select-page"]}>
                  <p style={{ whiteSpace: "nowrap" }}>Vai a pagina: </p>
                  <input
                    className={classes["numberInput"]}
                    type="number"
                    onChange={(e) => setNewPage(parseInt(e.target.value))}
                    onKeyDown={handleKeyPress}
                  />
                </div>
              </div>
              <div className={classes["buttonsContainer"]}>
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => changePage(-1)}
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  disabled={pageNumber >= numPages}
                  onClick={() => changePage(1)}
                >
                  {">"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Input;
