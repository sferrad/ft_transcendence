import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

const NotFound = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-[url('/assets/bg404.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center">
            <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-10 py-12 text-center shadow-[6px_6px_0_#2b2b2b]">
                <h1 className="text-9xl font-arcade tracking-widest text-[#1f2937]">404</h1>
                <p className="mt-4 text-4xl font-arcade uppercase tracking-[0.2em] text-[#374151]">{t("Page Not Found")}</p>
            </div>
            <button
                onClick={() => navigate("/")}
                className="mt-8 px-8 py-4 text-3xl font-arcade uppercase tracking-[0.2em] text-white bg-[#2b6cb0] hover:bg-[#1f4f8f] border-2 border-[#1f2937] shadow-[3px_3px_0_#1f2937] transition-colors duration-200"
            >
                {t("Go Home")}
            </button>
        </div>
    );
};

export default NotFound