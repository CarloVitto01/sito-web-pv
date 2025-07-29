import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "../../../backend/firebase";
import "./ResetPassword.css"; // ✅ crea un CSS simile a login/register
import { FiEye, FiEyeOff } from "react-icons/fi";


const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const oobCode = searchParams.get("oobCode") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      return setError("La nuova password deve contenere almeno 6 caratteri.");
    }

    if (newPassword !== confirmPassword) {
      return setError("Le due password non coincidono.");
    }

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess("Password aggiornata con successo! Ora puoi accedere.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      setError("Errore nel reset della password. Link non valido o scaduto.");
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h2>Reimposta la tua password</h2>
        <form onSubmit={handleReset}>
          <label className="reset-label">Nuova Password:</label>
          <div className="reset-password-input-wrapper">
            <input
              className="reset-password-input"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <span
              className="reset-password-toggle-icon"
              onClick={() => setShowNewPassword((prev) => !prev)}
            >
              {showNewPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <label className="reset-label">Conferma Password:</label>
          <div className="reset-password-input-wrapper">
            <input
              className="reset-password-input"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <span
              className="reset-password-toggle-icon"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <button className="reset-password-button" type="submit">Aggiorna Password</button>
          {error && <p className="reset-error-message">{error}</p>}
          {success && <p className="reset-success-message">{success}</p>}
        </form>

      </div>
    </div>
  );
};

export default ResetPassword;
