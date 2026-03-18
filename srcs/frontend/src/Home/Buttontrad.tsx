import { useState, useEffect} from 'react';
import { BsTranslate } from "react-icons/bs";
import { changeLanguage } from 'i18next';
import { useTranslation } from "react-i18next";

function Trad() {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.translate-button')) {
                setIsOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <div className="relative text-6xl text-zinc-700">
            <button onClick={() => setIsOpen(!isOpen)} 
                className='cursor-pointer translate-button'><BsTranslate /></button>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 profile-menu">
                    <button onClick={() => changeLanguage("fr")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇫🇷 {t("French")}</button>
                    <button onClick={() => changeLanguage("en")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇬🇧 {t("English")}</button>
                    <button onClick={() => changeLanguage("es")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇪🇦 {t("Spanish")}</button>
                </div>
            )}
        </div>
    )
}

export default Trad