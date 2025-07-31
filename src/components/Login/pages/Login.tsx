import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../backend/firebase";
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
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await signInWithEmailAndPassword(auth, data.username, data.password);
      console.log("Login riuscito");
      navigate("/");
    } catch (err: any) {
      console.error("Errore login:", err.message);
      setAuthError("Email o password non corretti");
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
          <div className="login-email-wrapper">
            <label>Email:</label>
            <input
              type="email"
              className="login-email-input"
              {...register("username", {
                required: "Questo campo non può essere vuoto",
              })}
            />
            {errors.username && (
              <p className="error-message">{errors.username.message}</p>
            )}
          </div>
          <div className="password-field">
            <label>Password:</label>
            <div className="login-password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Questo campo non può essere vuoto",
                })}
              />
              <span
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
            {errors.password && (
              <p className="error-message">{errors.password.message}</p>
            )}
          </div>

          {authError && <p className="auth-error-message">{authError}</p>}

          <p className="forgot-password" onClick={() => navigate("/recoverpassword")}>
            Hai dimenticato la password?
          </p>
          <p className="forgot-email" onClick={() => navigate("/recoveremail")}>
            Hai dimenticato l'email?
          </p>

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
            <button className="home-button" onClick={() => navigate("/")}>
              Torna Alla Home
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
