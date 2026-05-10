import { useState } from 'react';
import "../i18n/index.ts";
import { Carouselplayer1 } from "./Carouselplayer1";
import { Carouselplayer2 } from "./Carouselplayer2";
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';

const Charselectsolo = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [player, setPlayer] = useState("Algeria");
    const [ai, setAi] = useState("Algeria");
    const arcadeButtonBase =
        "hb-tap font-arcade border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] cursor-pointer no-underline inline-flex items-center justify-center transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeBackButton =
        `${arcadeButtonBase} normal-case tracking-normal whitespace-nowrap h-11 min-[481px]:h-12 min-[769px]:h-14 px-3 min-[481px]:px-4 min-[769px]:px-5 text-base min-[481px]:text-lg min-[769px]:text-2xl`;

    return (
        <div className="relative min-h-[100dvh] w-full bg-[url('/assets/bgSoloselect.jpg')] bg-cover bg-center bg-no-repeat overflow-auto">
            {/*
              4) Grilles et sections
              - Mobile: empilement (1 colonne)
              - Desktop (>=769px): 3 colonnes (P1 / VS / P2)
            */}
            <button
                    onClick={() => navigate('/')}
                    className={`absolute top-3 left-3 min-[481px]:top-6 min-[481px]:left-6 ${arcadeBackButton} text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Back")}
                </button>
            <div className="min-h-[100dvh] w-full px-4 py-8 flex flex-col items-center justify-center gap-8 hb-landscape-compact">
                <div className="grid grid-cols-1 min-[769px]:grid-cols-3 items-center gap-10 min-[769px]:gap-6 w-full max-w-5xl hb-landscape-grid-compact">
                    <div className="flex justify-center">
                        <Carouselplayer1 onChange={setPlayer} />
                    </div>

                    <div className="flex justify-center">
                        <img
                            src="/assets/perso/versus.png"
                            alt="VS"
                            className="w-[min(10rem,34vh)] min-[481px]:w-[min(14rem,38vh)] min-[769px]:w-[min(16rem,42vh)] h-auto drop-shadow-lg"
                        />
                    </div>

                    <div className="flex justify-center">
                        <Carouselplayer2 onChange={setAi} />
                    </div>
                </div>

                <button
                    onClick={() => {
                        navigate('/solo-gameplay', {
                            state: {
                                playerNation: player,
                                aiNation: ai,
                            },
                        });
                    }}
                    className="font-arcade text-black bg-[#4AD95A] px-8 py-5 min-[481px]:px-7 min-[481px]:py-3 min-[769px]:px-9 min-[769px]:py-4 m-2 text-base min-[481px]:text-lg min-[769px]:text-4xl border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] cursor-pointer no-underline inline-block transition-transform duration-100 active:translate-y-0.5 w-fit max-w-full"
                >
                    {t("Start Game")}
                </button>
            </div>
        </div>
    );
}

export default Charselectsolo
