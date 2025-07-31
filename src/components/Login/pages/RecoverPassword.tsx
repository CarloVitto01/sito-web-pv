import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../../backend/firebase";
import "./RecoverPassword.css";

const RecoverPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const q = query(collection(db, "users"), where("telefono", "==", telefono), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Nessun account trovato con questi dati.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("Email di recupero inviata. Controlla la tua casella di posta.");
    } catch (err: any) {
      setError("Errore durante l’invio dell’email. Riprova.");
    }
  };

  return (
    <div className="recover-page">
      <div className="recover-container">
        <h2>Recupera Password</h2>
        <form onSubmit={handleRecover}>
          <label>Email registrata:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Numero di telefono:</label>
          <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} required />

          <button type="submit">Invia link di reset</button>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default RecoverPassword;
