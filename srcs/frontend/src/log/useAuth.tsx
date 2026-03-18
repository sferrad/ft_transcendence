import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";


// Base d'API "same-origin": tout passe par le WAF via /api/*.
// Important: évite CORS et évite le "mixed content" en HTTPS.
const API_BASE_URL = "/api";


/**
 * FICHIER: useAuth.ts
 *
 * Rôle:
 * - Centralise la logique d'authentification côté frontend sous forme de hooks React:
 *   - useLogin(): connexion
 *   - useRegister(): inscription
 *
 * Où c'est utilisé ?
 * - useLogin() est utilisé par le composant Handlelog.tsx (page /login)
 * - useRegister() est utilisé par le composant Handleregister.tsx (page /register)
 *   Les routes sont déclarées dans App.tsx.
 *
 * Architecture réseau (IMPORTANT pour comprendre les URLs):
 * - Le navigateur ouvre l'UI via le WAF: http://localhost:8080
 * - Le WAF (nginx) reverse-proxy:
 *     - /           -> frontend:3000 (dev server Vite)
 *     - /api/*      -> api-gateway:8000
 * - L'API Gateway expose notamment:
 *     - POST /auth/login  (login)
 *     - GET  /auth/me     (récupère le payload du JWT)
 *     - et proxy /users/* vers le user-service
 *
 * Donc, depuis le frontend on appelle une URL relative:
 * - /api/auth/login, /api/auth/me, /api/users/auth/register
 * pour rester en "same-origin" (même origine) et éviter les problèmes CORS.
 */

const getUserInfo = async (token: string) => {
        try {
            // Appel same-origin; /api/* est proxifié par le WAF vers l'api-gateway.
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                // On stocke le token et quelques infos utiles localement.
                // NOTE: c'est un choix d'implémentation; côté sécurité, il faut garder en tête
                // que localStorage est accessible via JS (XSS => risque).
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

// Fonction helper pour se connecter avec identifier et password
const performLogin = async (identifier: string, password: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ identifier, password }),
        });

        const data = await response.json();
        if (response.ok && data.access_token) {
            await getUserInfo(data.access_token);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Login error:", error);
        return false;
    }
};

export const useLogin = () => {
  // Champs du formulaire ("identifier" = username OU email) + mot de passe
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // message = feedback UI (succès/erreur), loading = spinner pendant le fetch
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // navigate = redirection (React Router), t() = traduction i18n
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Handler du submit du formulaire de login.
  const login = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset état UI
    setLoading(true);
    setMessage("");

    // Une fois le token récupéré, on appelle /auth/me pour récupérer le payload (username, email, sub)
    // et on stocke dans localStorage pour l'utiliser ailleurs (ex: page /profile).
    try {
      // Appel same-origin; correspond à POST /auth/login côté api-gateway.
      // Le body { identifier, password } est validé côté api-gateway puis user-service.
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Succès: on récupère data.access_token, puis on charge /auth/me.
        setMessage(t("Connexion Successful"));
        getUserInfo(data.access_token);
        setTimeout(() => {
          // Redirection vers /profile (route définie dans App.tsx).
          navigate("/profile");
        }, 2000);
      } else {
        // Erreur: message API si présent, sinon fallback.
        setMessage(data.error?.message || data.detail || "Username or password is incorrect");
      }
    } catch (error) {
      // Erreur réseau / exception fetch
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
  // Champs du formulaire d'inscription
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // navigate = redirection après succès
  const navigate = useNavigate();
  const { t } = useTranslation();


  const register = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérification simple côté client avant l'appel API.
    if (password !== confirmPassword) {
      setMessage(t("Passwords do not match"));
      return;
    }
    
    setLoading(true);
    
    try{
      // Appel same-origin: on passe par l'api-gateway via /api.
      // Chemin complet:
      //   Browser -> WAF (/api/users/auth/register)
      //   WAF -> api-gateway (/users/auth/register)
      //   api-gateway -> user-service (proxy /users/*)
      const response = await fetch(`${API_BASE_URL}/users/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({username, email, password}),
      });

      if (response.ok) {
        // Succès: auto-login puis redirection vers /profile.
        setMessage(t("Registration successful"));
        
        // Auto-login avec l'email et le mot de passe qu'on vient de créer
        const loginSuccess = await performLogin(email, password);
        getUserInfo(localStorage.getItem("access_token") || ""); // Charger les infos utilisateur après le login
        
        if (loginSuccess) {
          setTimeout(() => {
            navigate("/profile");
          }, 1500);
        } else {
          // Si l'auto-login échoue, rediriger vers login
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        // FastAPI renvoie souvent {"detail": "..."}
        setMessage(data?.detail || data?.error?.message || "Registration failed");
      }
    } catch (error) {
      // Erreur réseau / exception fetch
      setMessage(t("An error occurred. Please try again."));
    } finally {
      setLoading(false);
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
    loading,
    register
  };
};

export const useLogout = () => {
    const navigate = useNavigate();

    const disconnect = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        localStorage.removeItem("user_id");
        navigate("/");
        window.location.reload();
    };

    return {
        disconnect,
    };
};
