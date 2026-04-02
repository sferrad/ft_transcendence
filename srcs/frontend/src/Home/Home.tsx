import { useState } from 'react';
import Carousel from './Carousel';
import Profil from './Buttonprofile';
import { useTranslation } from "react-i18next";
import { FaBars, FaTimes } from 'react-icons/fa';

const Home = () => {
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isAuthed = Boolean(localStorage.getItem("access_token"));

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
        <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat overflow-hidden">
            {/*
              2) Navigation responsive
              - Desktop (>=769px): boutons horizontaux
              - Mobile/Tablet (<769px): hamburger menu
            */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end p-4 min-[481px]:p-6 relative">
                {isAuthed ? (
                    <Profil />
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