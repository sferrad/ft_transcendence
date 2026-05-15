import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserInfo, parseValidationError, performLogin } from "./authApi";

const API_BASE_URL = "/api";

export const useRegister = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setMessage("Passwords do not match"); return; }
    if (username.length > 15) { setMessage("Username must be at most 15 characters"); return; }
    if (username.length < 3) { setMessage("Username must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setMessage("Username can only contain letters, numbers, and underscores"); return; }
    if (username.trim() === "") { setMessage("Username must contain at least one visible character"); return; }
    if (email.trim() === "") { setMessage("Email must contain at least one visible character"); return; }
    if (password.trim() === "") { setMessage("Password must contain at least one visible character"); return; }
    if (password.length < 6) { setMessage("Password must be at least 6 characters long"); return; }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (response.ok) {
        setMessage("Registration successful");
        const loginSuccess = await performLogin(email, password);
        getUserInfo(localStorage.getItem("access_token") || "");
        setTimeout(() => navigate(loginSuccess ? "/profile" : "/login"), loginSuccess ? 1500 : 2000);
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage(parseValidationError(data) || "Registration failed");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, message, loading, register };
};
