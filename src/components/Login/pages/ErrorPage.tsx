import React from "react";
import { useNavigate } from "react-router-dom";

const ErrorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>Accesso Negato</h2>
      <p>Non hai i permessi per accedere a questa pagina.</p>
      <button onClick={() => navigate("/")}>Torna al Login</button>
    </div>
  );
};

export default ErrorPage;
