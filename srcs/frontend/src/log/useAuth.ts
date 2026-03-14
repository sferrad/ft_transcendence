import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";


export const useLogin = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    const getUserInfo = async (token: string) => {
        try {
            const response = await fetch("http://localhost:8000/auth/me", {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("access_token", token);
          const payload = data?.payload;
          if (payload?.username) {
            localStorage.setItem("username", payload.username);
          }
          if (payload?.email) {
            localStorage.setItem("email", payload.email);
          }
          if (payload?.sub) {
            localStorage.setItem("user_id", String(payload.sub));
          }
            } else {
                console.error("Failed to fetch user info:", data.error?.message || "Unknown error");
            }
        } catch (error) {
            console.error("An error occurred while fetching user info:", error);
        }
    };
  
    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(t("Connexion Successful"));
        getUserInfo(data.access_token);
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else {
        setMessage(data.error?.message || t("Login failed"));
      }
    } catch (error) {
      setMessage(t("An error occurred. Please try again."));
    }
    setLoading(false);
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    message,
    loading,
    login,
  };
};

export const useRegister = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage(t("Passwords do not match"));
      return;
    }
    try{
        const response = await fetch("http://localhost:8000/users/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({username, email, password}),})

            if (response.ok) {
                setMessage(t("Registration successful"));
                setTimeout(() => {
                    navigate("/login");
                }, 2000);
            }
            else {                const data = await response.json();
                setMessage(data.error?.message || t("Registration failed"));
            }
    } catch (error) {
        setMessage(t("An error occurred. Please try again."));

    }
    };
    return {
        username,
        setUsername,
        email,
        setEmail,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        message,
        register
    };
};
