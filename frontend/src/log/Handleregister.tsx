import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
};

const Handleregister = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const register = (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload: RegisterPayload = {
            email: email,
            password: password,
            confirmPassword: confirmPassword,
        };

        if (password !== confirmPassword) {
            setMessage("Passwords do not match");
            return;
        }
        
        //temporaire, a remplacer par une requete fetch vers le backend
        setTimeout(() => {
            setMessage("Registration successful");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            navigate("/login");
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-[url('/assets/bgLogin.jpg')] bg-cover bg-center bg-no-repeat w-full h-full overflow-auto flex flex-col items-center justify-center">
            <div className="bg-[rgba(255,255,255,0.85)] p-8 w-96 rounded-lg shadow-2xl border border-gray-200 transition-all duration-350 transform hover:scale-105">
                <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">Register</h1>
                <form onSubmit={register}>

                    <input type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <input type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <input type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <button type="submit" disabled={!email || !password || !confirmPassword} className={`${!email || !password || !confirmPassword ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"} 
                  text-white p-2 rounded w-full hover:bg-blue-600 relative flex justify-center items-center h-10`}>Register</button>
                </form>
                <p className={
                  `mt-3 text-center transition-all duration-350 ${message ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} 
                ${message === "Registration successful" ? "text-green-500" : "text-red-500"}`}>{message}</p>
                <a className="text-blue-500 hover:underline mt-4 block text-center" onClick={() => navigate("/login")}>Already have an account? Login</a>
            </div>
        </div>
    );
};

export default Handleregister