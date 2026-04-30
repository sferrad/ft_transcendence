import { useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';

const Settingacc = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.account-button')) {
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
            <div className="animate-in fade-in zoom-in-95 duration-200 bg-gradient-to-b from-white to-gray-50 rounded-xl shadow-2xl py-3 px-2 w-[min(90vw,15rem)] min-[481px]:w-60 profile-menu border-4 border-[#2b2b2b]">
                <button onClick={() => navigate('/settings/change-password')} className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <span className='text-xl min-[481px]:text-3xl font-arcade'>{t("Change Password")}</span>
                </button>
                <button onClick={() => navigate('/settings/change-email')} className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <span className='text-xl min-[481px]:text-3xl font-arcade'>{t("Change Email")}</span>
                </button>
                <button onClick={() => navigate('/settings/delete-account')} className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span className='text-xl min-[481px]:text-3xl font-arcade'>{t("Delete Account")}</span>
                </button>
                <button onClick={() => navigate('/settings/save-data')} className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">💾</span>
                <span className='text-xl min-[481px]:text-3xl font-arcade'>{t("Save Data")}</span>
                </button>
            </div>
        </div>
    );
}

export default Settingacc