import { useState, useEffect} from 'react';
import { CgProfile } from "react-icons/cg";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useLogout } from '../log/useAuth';

function Profil() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();
    const { disconnect } = useLogout();
    
    useEffect(()  => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.profile-button')) {
                setIsOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <div className="absolute top-4 right-4 min-[481px]:top-5 min-[481px]:right-5 text-4xl min-[481px]:text-6xl text-zinc-700">
            <button onClick={() => setIsOpen(!isOpen)} 
                className='hb-tap cursor-pointer profile-button inline-flex items-center justify-center'><CgProfile /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 profile-menu">
                    <button onClick={() => navigate("/profile")} className="hb-tap block w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100">{t("Profile")}</button>
                    <button onClick={disconnect} className="hb-tap block w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100">{t("Logout")}</button>
                </div>
            )}
        </div>
    )
}

export default Profil