import { useState } from 'react';
import { useTranslation } from "react-i18next";
import Trad from '../features/settings/LanguageButton';
import Settingacc from '../features/settings/SettingsAccount';

const Settingpage = () => {
    const { t } = useTranslation();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [showAccSettings, setShowAccSettings] = useState(false);
    const [soundOff, setSoundOff] = useState(false);
    const [musicOff, setMusicOff] = useState(false);

    const arcadeButtonBase =
        "hb-tap font-arcade uppercase tracking-wide cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeSettingsButton =
        `${arcadeButtonBase} w-full h-14 min-[481px]:h-16 px-6 min-[481px]:px-7 text-xl min-[481px]:text-4xl`;
    const arcadeBackButton =
        `${arcadeButtonBase} normal-case tracking-normal whitespace-nowrap h-11 min-[481px]:h-12 min-[769px]:h-14 px-3 min-[481px]:px-4 min-[769px]:px-5 text-base min-[481px]:text-lg min-[769px]:text-xl`;

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true"></div>

            <div className="relative z-10 min-h-[100dvh] flex justify-center items-center px-4 py-8">
                <button
                    onClick={() => window.history.back()}
                    className={`absolute top-3 left-3 min-[481px]:top-6 min-[481px]:left-6 ${arcadeBackButton} text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Back")}
                </button>

                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,42rem)]">
                    <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] mb-6">{t("Settings")}</h1>
                    <ul className="flex flex-col items-stretch gap-4 w-full max-w-xs mx-auto">
                        <li className="w-full">
                            <button
                                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                                className={`translate-button ${arcadeSettingsButton} bg-[#4AD95A] hover:bg-green-600`}
                            >
                                <span className="text-2xl leading-none">🌍</span>
                                <span>{t("Language")}</span>
                            </button>
                            {showLanguageMenu && <Trad onClose={() => setShowLanguageMenu(false)} />}
                        </li>
                        <li className="w-full">
                            <button
                                onClick={() => setShowAccSettings(!showAccSettings)}
                                className={`account-button ${arcadeSettingsButton} bg-blue-600 hover:bg-blue-700`}
                            >
                                <span className="text-2xl leading-none">👤</span>
                                <span>{t("Account")}</span>
                            </button>
                            {showAccSettings && <Settingacc onClose={() => setShowAccSettings(false)} />}
                        </li>
                        <li className="w-full">
                            <button
                                onClick={() => setSoundOff(!soundOff)}
                                className={`${arcadeSettingsButton} bg-red-600 hover:bg-red-700`}
                            >
                                <span className="text-2xl leading-none">{soundOff ? "🔇" : "🔊"}</span>
                                <span>{t("Sound")}</span>
                            </button>
                        </li>
                        <li className="w-full">
                            <button
                                onClick={() => setMusicOff(!musicOff)}
                                className={`${arcadeSettingsButton} bg-purple-600 hover:bg-purple-700`}
                            >
                                <span className="text-2xl leading-none">{musicOff ? "🔇" : "🎵"}</span>
                                <span>{t("Music")}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Settingpage