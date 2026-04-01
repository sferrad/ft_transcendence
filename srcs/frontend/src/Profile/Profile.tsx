import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-lg flex flex-col items-center text-center gap-4">
                <h1 className="text-3xl min-[481px]:text-4xl font-bold">{t("Profile")}</h1>
                <p className="text-base min-[481px]:text-lg">{t("This is the profile page.")}</p>

                {localStorage.getItem("access_token") && (
                    <div className="w-full rounded-lg border border-gray-200 bg-white/70 p-4 text-left">
                        <p className="break-words">Your name: {localStorage.getItem("username")}</p>
                        <p className="break-words">Email: {localStorage.getItem("email")}</p>
                        <p className="break-words">User ID: {localStorage.getItem("user_id")}</p>
                    </div>
                )}

                <button onClick={() => navigate("/")} className="hb-tap px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 w-full max-w-xs">
                    {t("Go Back")}
                </button>
            </div>
        </div>
    );
}

export default Profile