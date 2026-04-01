import { useEffect } from 'react';
import { changeLanguage } from 'i18next';
import { useTranslation } from "react-i18next";

function Trad({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.translate-button')) {
                onClose();
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);
    return (
        <div className="flex justify-center mt-4">
            <div className="animate-in fade-in zoom-in-95 duration-200 bg-gradient-to-b from-white to-gray-50 rounded-xl shadow-2xl py-3 px-2 w-[min(90vw,14rem)] min-[481px]:w-56 profile-menu border-4 border-[#2b2b2b]">
                <button onClick={() => changeLanguage("fr")} className="hb-tap font-arcade text-xl min-[481px]:text-3xl w-full text-left px-4 py-3 text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                    <span className="text-2xl min-[481px]:text-3xl">🇫🇷</span>
                    <span>{t("French")}</span>
                </button>
                <button onClick={() => changeLanguage("en")} className="hb-tap font-arcade text-xl min-[481px]:text-3xl w-full text-left px-4 py-3 text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                    <span className="text-2xl min-[481px]:text-3xl">🇬🇧</span>
                    <span>{t("English")}</span>
                </button>
                <button onClick={() => changeLanguage("es")} className="hb-tap font-arcade text-xl min-[481px]:text-3xl w-full text-left px-4 py-3 text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                    <span className="text-2xl min-[481px]:text-3xl">🇪🇸</span>
                    <span>{t("Spanish")}</span>
                </button>
            </div>
        </div>
    )
}

export default Trad