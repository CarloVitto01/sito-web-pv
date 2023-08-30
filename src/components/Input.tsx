import { useDropzone } from "react-dropzone";
import classes from "./Input.module.css";
import { Document, Page } from "react-pdf";
import { useState } from "react";
import { pdfjs } from "react-pdf";
import Loading from "./Loading";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const Input = () => {
  const [file, setFile] = useState<any>();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [newPage, setNewPage] = useState<number>(0);

  const handleKeyPress = (e: any) => {
    if(e.key === "enter"){
      setPageNumber(newPage);
      console.log("Enter");
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
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

  return (
    <div className={classes["container"]}>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p className={classes["text"]}>Inserisci il file qui</p>
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
                  height={600}
                  width={400}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  className={classes["pdfPage"]}
                  loading={<Loading />}
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
                <p style={{whiteSpace: "nowrap"}}>Vai a pagina: </p>
                <input
                  type="number"
                  onChange={(e)=>setNewPage(parseInt(e.target.value))}
                  onKeyDown={handleKeyPress}
                />
                </div>
              </div>
              <div className={classes["buttonsContainer"]}>
                <button
                  className={classes["buttonPage"]}
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => changePage(-1)}
                >
                  {"<"}
                </button>
                <button
                  className={classes["buttonPage"]}
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
