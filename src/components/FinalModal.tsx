import classes from "./FinalModal.module.css";
import ReactDOM from "react-dom";
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface finalModalOverlayProps {
  onConfirm: () => void;
  loading: "submitting" | "submitted" | "error";
}

interface backdropProps {
  onConfirm: () => void;
}

const Backdrop: React.FC<backdropProps> = ({ onConfirm }) => {
  return <div className={classes["backdrop"]} onClick={onConfirm} />;
};

const FinalModalOverlay: React.FC<finalModalOverlayProps> = ({
  onConfirm,
  loading,
}) => {
  return (
    <div className={classes["container"]}>
      <header>
        {loading === "submitted" ? (
          <h1>Caricamento avvenuto con successo</h1>
        ) : loading === "submitting" ? (
          <h1>Caricamento in corso</h1>
        ) : (
          <h1>Errore</h1>
        )}
      </header>
      <div className={classes["content"]}>
        {loading === "submitted" ? (
          <p>Sarai contatto presto da un nostro operatore.</p>
        ) : loading === "submitting" ? (
          <div className={classes["spinner-container"]}>
            <FontAwesomeIcon icon={faSpinner} className={classes["spinner"]} />
            <p>Attendi fino al completo caricamento del file.</p>
          </div>
        ) : (
          <p>
            Si è verificato un errore durante il caricamento del file. Riprova.
          </p>
        )}
      </div>
      <footer>
        <button onClick={onConfirm}>CHIUDI</button>
      </footer>
    </div>
  );
};

const FinalModal: React.FC<finalModalOverlayProps> = ({
  onConfirm,
  loading,
}) => {
  const backdropRoot = document.getElementById("backdrop-root");
  const overlayRoot = document.getElementById("overlay-root");

  if (!backdropRoot || !overlayRoot) {
    return null;
  }

  return (
    <>
      {ReactDOM.createPortal(<Backdrop onConfirm={onConfirm} />, backdropRoot)}
      {ReactDOM.createPortal(
        <FinalModalOverlay onConfirm={onConfirm} loading={loading} />,
        overlayRoot
      )}
    </>
  );
};

export default React.memo(FinalModal);
