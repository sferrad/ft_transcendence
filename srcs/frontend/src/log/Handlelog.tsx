import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLogin } from "./useAuth";

const HandleLog = () => {
  const { identifier, setIdentifier, password, setPassword, message, loading, login } = useLogin();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-[url('/assets/bgLogin.jpg')] bg-cover bg-center bg-no-repeat w-full h-full overflow-auto flex flex-col items-center justify-center">
      <div className="absolute top-0 left-0 right-0 p-6">
      </div>
      <div className="bg-[rgba(255,255,255,0.85)] p-8 w-96 rounded-lg shadow-2xl border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">{t("Login")}</h1>
        <form onSubmit={login}>

          <input type="text"
            placeholder={t("Username or email")}
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            className="border p-2 rounded mb-3 w-full"></input>

          <input type="password"
            placeholder={t("Password")}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border p-2 rounded mb-3 w-full"></input>

          <button type="submit"
            disabled={!identifier || !password}
            className={
              `${!identifier || !password ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 cursor-pointer hover:bg-blue-600"} 
                  text-white p-2 rounded w-full relative flex justify-center items-center h-10`}>
                {loading && (
            <span className="absolute left-4 w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
            )}
            <span className={loading ? "ml-6" : ""}>
                {loading ? t("Connecting...") : t("Login")}
            </span>
          </button>

          <p className={
            `mt-3 text-center transition-all duration-350 ${t(message) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} 
          ${message === t("Connexion Successful") ? "text-green-500" : "text-red-500"}`}>{t(message)}</p>

        </form>
        <a className="text-blue-500 cursor-pointer hover:underline mt-4 block text-center" onClick={() => navigate("/register")}>{t("Don't have an account? Register")}</a>
      </div>
    </div>
  );
}

export default HandleLog