import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Carousel from '../features/home/ModeCarousel';
import Profil from '../features/home/ButtonProfile';
import { useTranslation } from "react-i18next";
import { FaBars, FaTimes } from 'react-icons/fa';
import { getPendingMatch, clearPendingMatch } from '../utils/pendingMatch';

const ARCADE_BTN = '0px 4px rgb(255,255,255), 0px -4px rgb(255,255,255), 4px 0px rgb(255,255,255), -4px 0px rgb(255,255,255), 0px 4px rgba(0,0,0,0.22), 4px 4px rgba(0,0,0,0.22), -4px 4px rgba(0,0,0,0.22), inset 0px 4px rgba(255,255,255,0.21)'

const Home = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isAuthed = Boolean(localStorage.getItem("access_token"));

    // ── Rejoin pending match ──
    const [rejoinSecsLeft, setRejoinSecsLeft] = useState<number | null>(null);
    const [showRejoin, setShowRejoin] = useState(false);

    useEffect(() => {
        const pending = getPendingMatch();
        if (!pending || !isAuthed) return;
        const remaining = Math.ceil((pending.expiresAt - Date.now()) / 1000);
        if (remaining <= 0) return;
        setRejoinSecsLeft(remaining);
        setShowRejoin(true);
        const id = setInterval(() => {
            setRejoinSecsLeft(prev => {
                if (prev === null || prev <= 1) {
                    clearInterval(id);
                    setShowRejoin(false);
                    clearPendingMatch();
                    return null;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isAuthed]);

    const handleRejoin = useCallback(() => {
        const pending = getPendingMatch();
        if (!pending) return;
        setShowRejoin(false);
        navigate('/online-gameplay', { state: { ...pending.info, isRejoin: true } });
    }, [navigate]);

    const handleDismissRejoin = useCallback(() => {
        clearPendingMatch();
        setShowRejoin(false);
    }, []);

    const arcadeButtonBase =
        "hb-tap font-arcade cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeNavButton =
        `${arcadeButtonBase} px-6 py-2 min-[481px]:px-7 min-[481px]:py-3 min-[769px]:px-8 min-[769px]:py-3 text-xl min-[481px]:text-2xl min-[769px]:text-3xl`;
    const arcadeMenuItemButton =
        `${arcadeButtonBase} w-full px-4 py-2 text-left text-xl min-[481px]:text-xl`;

    const goTo = (path: string) => {
        setIsMobileMenuOpen(false);
        window.location.href = path;
    };
    return (
        <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat overflow-hidden">

            {/* ── Rejoin popup ── */}
            {showRejoin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-5 bg-gray-900/95 border-2 border-yellow-400/70 rounded-xl px-10 py-8 shadow-2xl text-center max-w-xs w-full mx-4">
                        <div className="font-arcade text-yellow-300 text-xl">{t('rejoin.title')}</div>
                        <div className="font-arcade text-white text-4xl">{rejoinSecsLeft}s</div>
                        <div className="font-arcade text-gray-300 text-sm">{t('rejoin.desc')}</div>
                        <div className="flex gap-4 flex-wrap justify-center">
                            <button
                                className="font-arcade"
                                onClick={handleRejoin}
                                style={{ padding: '12px 32px', fontSize: 16, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#22c55e', color: '#000', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
                            >
                                {t('rejoin.button')}
                            </button>
                            <button
                                className="font-arcade"
                                onClick={handleDismissRejoin}
                                style={{ padding: '12px 32px', fontSize: 16, cursor: 'pointer', border: 'none', borderRadius: 0, background: '#dc2626', color: '#fff', letterSpacing: 2, textTransform: 'uppercase', boxShadow: ARCADE_BTN }}
                            >
                                {t('rejoin.dismiss')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/*
              2) Navigation responsive
              - Desktop (>=769px): boutons horizontaux
              - Mobile/Tablet (<769px): hamburger menu
            */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end p-4 min-[481px]:p-6 relative">
                {isAuthed ? (
                    <div className="flex items-center justify-between w-full">
                        
                        <Profil />
                    </div>
                ) : (
                    <>
                        {/* Desktop menu */}
                        <div className="hidden min-[769px]:flex items-center gap-4">
                            <button
                                onClick={() => goTo('/login')}
                                className={`${arcadeNavButton} text-black bg-blue-600 hover:bg-blue-700`}
                            >
                                {t('Login')}
                            </button>
                            <button
                                onClick={() => goTo('/register')}
                                className={`${arcadeNavButton} text-black bg-[#4AD95A] hover:bg-green-600`}
                            >
                                {t('Register')}
                            </button>
                        </div>

                        {/* Mobile/Tablet hamburger */}
                        <div className="min-[769px]:hidden">
                            <button
                                type="button"
                                aria-label={t('Menu')}
                                aria-expanded={isMobileMenuOpen}
                                onClick={() => setIsMobileMenuOpen((v) => !v)}
                                className="hb-tap inline-flex items-center justify-center rounded-lg bg-white/80 hover:bg-white px-3 py-2 border border-gray-200 shadow"
                            >
                                {isMobileMenuOpen ? <FaTimes className="text-2xl" /> : <FaBars className="text-2xl" />}
                            </button>

                            {isMobileMenuOpen && (
                                <div
                                    className="absolute right-4 min-[481px]:right-6 top-full mt-2 w-48 rounded-lg bg-white/95 border border-gray-200 shadow-lg overflow-hidden"
                                    role="menu"
                                >
                                    <button
                                        role="menuitem"
                                        className={`${arcadeMenuItemButton} text-black bg-blue-600 hover:bg-blue-700`}
                                        onClick={() => goTo('/login')}
                                    >
                                        {t('Login')}
                                    </button>
                                    <button
                                        role="menuitem"
                                        className={`${arcadeMenuItemButton} text-black bg-[#4AD95A] hover:bg-green-600`}
                                        onClick={() => goTo('/register')}
                                    >
                                        {t('Register')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <img src="/assets/logo.png" alt="Logo" className="w-2/3 h-auto" />
            </div>
            <div className="absolute bottom-0 left-0 right-0">
                <Carousel />
            </div>
        </div>
    )
}

export default Home