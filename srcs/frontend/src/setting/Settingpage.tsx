import { useState } from 'react';
import { useTranslation } from "react-i18next";
import Trad from './Buttontrad';
import Settingacc from './Settingacc';

const Settingpage = () => {
    const { t } = useTranslation();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [showAccSettings, setShowAccSettings] = useState(false);
    const [soundOff, setSoundOff] = useState(false);
    const [musicOff, setMusicOff] = useState(false);

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>

            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                {/* Bouton retour: reste accessible sur mobile */}
                <button
                    onClick={() => window.history.back()}
                    className="hb-tap absolute top-4 left-4 min-[481px]:top-6 min-[481px]:left-6 cursor-pointer px-4 py-2 min-[481px]:px-6 text-base min-[481px]:text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                >
                    {t("Back")}
                </button>

                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,42rem)]">
                    {/* 5) Typographie: titre adaptatif via clamp (classe hb-title) */}
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Settings")}</h1>
                    <ul className="flex flex-col items-center gap-4">
                        <li>
                            <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className='translate-button hb-tap font-arcade cursor-pointer px-6 py-3 text-xl min-[481px]:text-3xl text-black bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl w-full max-w-xs flex justify-center items-center'>
                            🌍 {t("Language")}
                            </button>
                            {showLanguageMenu && <Trad onClose={() => setShowLanguageMenu(false)} />}
                        </li>
                        <li>
                            <button onClick={() => setShowAccSettings(!showAccSettings)} className='account-button hb-tap font-arcade cursor-pointer px-6 py-3 text-xl min-[481px]:text-3xl text-black bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl w-full max-w-xs flex justify-center items-center'>
                            👤 {t("Account")}
                            </button>
                            {showAccSettings && <Settingacc onClose={() => setShowAccSettings(false)} />}
                        </li>
                        <li>
                            <button onClick={() => setSoundOff(!soundOff)} className='hb-tap font-arcade cursor-pointer px-6 py-3 text-xl min-[481px]:text-3xl text-black bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-full max-w-xs flex justify-center items-center'>
                                {soundOff ? "🔇" : "🔊"}
                                <span className="ml-2">{t("Sound")}</span>    
                            </button>
                        </li>
                        <li>
                            <button onClick={() => setMusicOff(!musicOff)} className='hb-tap font-arcade cursor-pointer px-6 py-3 text-xl min-[481px]:text-3xl text-black bg-gradient-to-b from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg transition-all duration-200 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl w-full max-w-xs flex justify-center items-center'>
                                {musicOff ? "🔇" : "🎵"}
                                <span className="ml-2">{t("Music")}</span>    
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Settingpage