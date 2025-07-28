import React, { useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../../backend/firebase";
import "./RecoverEmail.css";
import { useNavigate } from "react-router-dom";

const RecoverEmail: React.FC = () => {
  const [telefono, setTelefono] = useState("");
  const [emailRecuperata, setEmailRecuperata] = useState("");
  const [errore, setErrore] = useState("");
  const navigate = useNavigate();

  const cercaEmail = async () => {
    setErrore("");
    setEmailRecuperata("");

    try {
      const snapshot = await getDocs(collection(db, "users"));
      const utente = snapshot.docs.find((doc) => {
        const data = doc.data();
        return data.telefono === telefono;
      });

      if (utente) {
        setEmailRecuperata(utente.data().email);
      } else {
        setErrore("Nessun utente trovato con questo numero.");
      }
    } catch (err) {
      console.error(err);
      setErrore("Errore durante la ricerca. Riprova più tardi.");
    }
  };

  return (
    <div className="recover-email-page">
      <div className="recover-email-container">
        <h2>Recupera la tua Email</h2>
        <label>Numero di telefono:</label>
        <input
          type="text"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <button onClick={cercaEmail}>Cerca</button>

        {emailRecuperata && (
          <>
            <p className="success-message">
              ✅ La tua email è: <strong>{emailRecuperata}</strong>
            </p>
            <button
              className="login-button"
              onClick={() => navigate("/login")}
              style={{ marginTop: "20px" }}
            >
              Torna al Login
            </button>
          </>
        )}

        {errore && <p className="error-message">{errore}</p>}
      </div>
    </div>

  );
};

export default RecoverEmail;
