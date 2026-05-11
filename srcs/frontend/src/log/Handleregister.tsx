import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRegister } from "./useAuth";

const Handleregister = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { username, setUsername, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, message, register } = useRegister();
        const arcadeButtonBase =
        "hb-tap font-arcade border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] cursor-pointer no-underline inline-flex items-center justify-center transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeBackButton =
        `${arcadeButtonBase} normal-case tracking-normal whitespace-nowrap h-11 min-[481px]:h-12 min-[769px]:h-14 px-3 min-[481px]:px-4 min-[769px]:px-5 text-base min-[481px]:text-lg min-[769px]:text-2xl`;
    
    return (
                <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgLogin.jpg')] bg-cover bg-center bg-no-repeat overflow-auto flex flex-col items-center justify-center px-4 py-8">
                        <button
                    onClick={() => window.history.back()}
                    className={`absolute top-3 left-3 min-[481px]:top-6 min-[481px]:left-6 ${arcadeBackButton} text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Back")}
                </button>
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