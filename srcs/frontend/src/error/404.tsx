import { useNavigate } from "react-router-dom";
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

const NotFound = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    return (
        <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bg404.png')] bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center px-4 py-10">
            <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,42rem)]">
                <h1 className="text-6xl min-[481px]:text-8xl min-[769px]:text-9xl font-arcade tracking-widest text-[#1f2937]">404</h1>
                <p className="mt-4 text-xl min-[481px]:text-3xl min-[769px]:text-4xl font-arcade uppercase tracking-[0.2em] text-[#374151]">{t("Page Not Found")}</p>
            </div>
            <button
                onClick={() => navigate("/")}
                className="hb-tap mt-8 px-6 py-3 min-[481px]:px-8 min-[481px]:py-4 text-xl min-[481px]:text-3xl font-arcade uppercase tracking-[0.2em] text-white bg-[#2b6cb0] hover:bg-[#1f4f8f] border-2 border-[#1f2937] shadow-[3px_3px_0_#1f2937] transition-colors duration-200 w-full max-w-md"
            >
                {t("Go Home")}
            </button>
        </div>
    );
};

export default NotFound