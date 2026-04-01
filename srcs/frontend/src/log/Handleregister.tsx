import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRegister } from "./useAuth";

const Handleregister = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, message, register } = useRegister();

    return (
                <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgLogin.jpg')] bg-cover bg-center bg-no-repeat overflow-auto flex flex-col items-center justify-center px-4 py-8">
                        <div className="bg-[rgba(255,255,255,0.85)] p-6 min-[481px]:p-8 w-full max-w-sm rounded-lg shadow-2xl border border-gray-200 ">
                <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">{t("Register")}</h1>
                <form onSubmit={register}>

                    <input type="text"
                        placeholder={t("Username")}
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <input type="email"
                        placeholder="Email"
                        autoComplete="off"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <input type="password"
                        placeholder={t("Password")}
                        autoComplete="disabled"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                    <input type="password"
                        placeholder={t("Confirm Password")}
                        autoComplete="disabled"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="border p-2 rounded mb-3 w-full"></input>

                                        <button type="submit" disabled={!email || !password || !confirmPassword} className={`${!email || !password || !confirmPassword ? "bg-gray-400 cursor-not-allowed" : " bg-blue-500 cursor-pointer hover:bg-blue-600"} 
                                    text-white p-3 rounded w-full relative flex justify-center items-center`}>{t("Register")}</button>
                </form>
                <p className={
                  `mt-3 text-center transition-all duration-350 ${t(message) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} 
                ${message === t("Registration successful") ? "text-green-500" : "text-red-500"}`}>{t(message)}</p>
                <a className="text-blue-500 cursor-pointer hover:underline mt-4 block text-center" onClick={() => navigate("/login")}>{t("Already have an account? Login")}</a>
            </div>
        </div>
    );
};

export default Handleregister