import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../backend/firebase"; // Assicurati che il path sia corretto
import "./Login.css";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface LoginFormInputs {
  username: string; // email
  password: string;
}

const Login: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ⬅️ stato per visibilità

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        data.username,
        data.password
      );

      console.log("Login riuscito:", userCredential.user);
      navigate("/");
    } catch (err: any) {
      console.error("Errore login:", err.message);
      setError("Email o password non corretti");
    }
  };

  const goToRegister = () => {
    navigate("/register");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Login</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div >
            <label>Email:</label>
            <input
              type="email"
              {...register("username", {
                required: "Questo campo non può essere vuoto",
              })}
            />
          </div>

          <div className="password-field">
            <label>Password:</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Questo campo non può essere vuoto",
                })}
              />
              <span
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </div>
          <div className="button-row">
            <button type="submit">Login</button>
            <button
              type="button"
              className="register-button"
              onClick={goToRegister}
            >
              Registrati
            </button>
          </div>
          <div className="home-button-container">
            <button className="home-button" onClick={() => navigate("/")}>Torna Alla Home</button>
           

          </div>
        </form>
         {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
