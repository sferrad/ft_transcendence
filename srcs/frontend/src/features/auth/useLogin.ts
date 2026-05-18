import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserInfo, parseValidationError } from "./authApi";

const API_BASE_URL = "/api";

export const useLogin = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage("Connexion Successful");
        getUserInfo(data.access_token);
        setTimeout(() => navigate("/profile"), 2000);
      } else {
        setMessage("Username or password is incorrect");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    }
    setLoading(false);
  };

  return { identifier, setIdentifier, password, setPassword, message, loading, login };
};
