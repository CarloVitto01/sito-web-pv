import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../utils/registerUsers";
import { FiEye, FiEyeOff } from "react-icons/fi"; // 👈 Importa le icone
import "./Register.css";

const Register = () => {
  const [displayName, setDisplayName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [corsoLaurea, setCorsoLaurea] = useState("");
  const [annoAccademico, setAnnoAccademico] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const onlyLetters = (value: string) => /^[a-zA-Z\s]+$/.test(value);
  const validEmail = (value: string) =>
    /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value);
  const onlyNumbers = (value: string) => /^[0-9]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!onlyLetters(displayName)) return setError("Il nome deve contenere solo lettere.");
    if (!onlyLetters(surname)) return setError("Il cognome deve contenere solo lettere.");
    if (!validEmail(email)) return setError("Inserisci un'email valida.");
    if (password.length < 6) return setError("La password deve contenere almeno 6 caratteri.");
    if (!onlyNumbers(telefono) || telefono.length !== 10)
      return setError("Il numero di telefono deve contenere 10 cifre.");

    if (corsoLaurea && !onlyLetters(corsoLaurea))
      return setError("Il corso di laurea deve contenere solo lettere.");
    if (annoAccademico && (!onlyNumbers(annoAccademico) || annoAccademico.length !== 4))
      return setError("L'anno accademico deve essere un numero di 4 cifre.");

    try {
      await registerUser(email, password, displayName, {
        cognome: surname,
        telefono,
        corsoLaurea: corsoLaurea || undefined,
        annoAccademico: annoAccademico || undefined,
      });
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Errore nella registrazione.");
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <h2>Registrazione</h2>
        <form onSubmit={handleSubmit}>
          <label>Nome:</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <label>Cognome:</label>
          <input
            type="text"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            required
          />

          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password:</label>
          <div className="password-input-wrapper-register">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="toggle-password-icon" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <label>Telefono:</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />

          <label>
            Corso di Laurea:{" "}
            <span style={{ fontStyle: "italic", fontWeight: "normal" }}>(opzionale)</span>
          </label>
          <input
            type="text"
            value={corsoLaurea}
            onChange={(e) => setCorsoLaurea(e.target.value)}
          />

          <label>
            Anno Accademico:{" "}
            <span style={{ fontStyle: "italic", fontWeight: "normal" }}>(opzionale)</span>
          </label>
          <input
            type="text"
            value={annoAccademico}
            onChange={(e) => setAnnoAccademico(e.target.value)}
          />

          <div className="button-row">
            <button type="submit">Registrati</button>
            <button
              type="button"
              className="home-button"
              onClick={() => navigate("/")}
            >
              Torna alla Home
            </button>
          </div>
          {error && <p className="error-message">{error}</p>}

        </form>
      </div>
    </div>
  );
};

export default Register;
