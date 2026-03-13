import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold mb-8">{t("Profile")}</h1>
            <p className="text-lg mb-4">{t("This is the profile page.")}</p>
            <button onClick={() => navigate("/")} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                {t("Go Back")}
            </button>
        </div>
    );
}

export default Profile