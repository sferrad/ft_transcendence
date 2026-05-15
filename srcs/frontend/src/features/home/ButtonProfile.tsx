import { useState, useEffect } from 'react';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useLogout } from '../auth/useAuth';
import { useChatNotifications } from "../../hooks/useChatNotifications";
import { fetchMyProfile } from '../profile/api/profile';
import { loadAvatarSrc } from '../profile/api/avatar';

function Profil() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [avatarSrc, setAvatarSrc] = useState<string | null | undefined>(undefined);
    const { t } = useTranslation();
    const { disconnect } = useLogout();
    const { hasUnread } = useChatNotifications({ enabled: Boolean(localStorage.getItem("access_token")) });

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (!token) return
        fetchMyProfile(token)
            .then(p => loadAvatarSrc(token, p.avatar_url ?? null))
            .then(src => setAvatarSrc(src ?? null))
            .catch(() => setAvatarSrc(null))
    }, []);
    
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="hb-tap relative cursor-pointer profile-button inline-flex items-center justify-center bg-white/90 rounded-full p-1.5 shadow-md"
                aria-label={t("Profile menu")}
            >
                {avatarSrc === undefined
                    ? <span className="w-12 h-12 min-[481px]:w-16 min-[481px]:h-16 rounded-full bg-white/40" />
                    : <img
                        src={avatarSrc ?? DEFAULT_AVATAR}
                        alt="avatar"
                        className="w-12 h-12 min-[481px]:w-16 min-[481px]:h-16 rounded-full object-cover border-2 border-white shadow-md"
                    />
                }
                {hasUnread && (
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]" aria-hidden="true" />
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 profile-menu">
                    <button onClick={() => navigate("/chat")} className="hb-tap flex w-full items-center justify-between px-4 py-3 text-left text-base text-gray-700 hover:bg-gray-100">
                        <span>{t("Chat")}</span>
                        {hasUnread && <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />}
                    </button>
                    <button onClick={() => navigate("/profile")} className="hb-tap block w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100">{t("Profile")}</button>
                    <button onClick={() => navigate("/settings")} className="hb-tap block w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100">{t("Settings")}</button>
                    <button onClick={disconnect} className="hb-tap block w-full text-left px-4 py-3 text-base text-gray-700 hover:bg-gray-100">{t("Logout")}</button>
                </div>
            )}
        </div>
    )
}

export default Profil