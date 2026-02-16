import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// type LoginPayload = {
//   email: string;
//   password: string;
// };

const HandleLog = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = (e: React.FormEvent) => {

    e.preventDefault();


    // const payload: LoginPayload = {
    //   email: email,
    //   password: password,
    // };
    setLoading(true);

    setTimeout(() => {
    //temporaire, a remplacer par une requete fetch vers le backend
      if (email === "test@test.com" && password === "test") {
        setMessage("Connexion Successful");
        setPassword("");
        setEmail("");
        // localStorage.setItem("isLogged", "true");
        // navigate("/dashboard");
      }
      else {
        setMessage("Email or password incorrect");
        setEmail("");
        setPassword("");
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-[url('/assets/bgLogin.jpg')] bg-cover bg-center bg-no-repeat w-full h-full overflow-auto flex flex-col items-center justify-center">
      <div className="bg-[rgba(255,255,255,0.85)] p-8 w-96 rounded-lg shadow-2xl border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Login</h1>
        <form onSubmit={login}>

          <input type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border p-2 rounded mb-3 w-full"></input>

          <input type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border p-2 rounded mb-3 w-full"></input>

          <button type="submit"
            disabled={!email || !password}
            className={
              `${!email || !password ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 cursor-pointer hover:bg-blue-600"} 
                  text-white p-2 rounded w-full relative flex justify-center items-center h-10`}>
                {loading && (
            <span className="absolute left-4 w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            <span className={loading ? "ml-6" : ""}>
                {loading ? "Connexion..." : "Login"}
            </span>
          </button>

          <p className={
            `mt-3 text-center transition-all duration-350 ${message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} 
          ${message === "Connexion Successful" ? "text-green-500" : "text-red-500"}`}>{message}</p>

        </form>
        <a className="text-blue-500 cursor-pointer hover:underline mt-4 block text-center" onClick={() => navigate("/register")}>Don't have an account? Register</a>
      </div>
    </div>
  );
}

export default HandleLog