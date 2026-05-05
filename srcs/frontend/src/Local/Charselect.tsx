import { useState } from 'react';
import "../i18n/index.ts";
import { Carouselplayer1 } from "./Carouselplayer1.tsx";
import { Carouselplayer2 } from "./Carouselplayer2.tsx";
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from "../utils/auth";

const Charselectsolo = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [player, setPlayer] = useState("Algeria");
    const [ai, setAi] = useState("Algeria");
    const currentUser = getCurrentUser();
    const isPlayer1Locked = Boolean(currentUser?.accessToken && currentUser.username);
    const [player1Name, setPlayer1Name] = useState(() => currentUser?.username || "");
    const [player2Name, setPlayer2Name] = useState("");
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
                    onClick={() => window.history.back()}
                    className={`absolute top-3 left-3 min-[481px]:top-6 min-[481px]:left-6 ${arcadeBackButton} text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Back")}
                </button>
            <div className="min-h-[100dvh] w-full px-4 py-8 flex flex-col items-center justify-center gap-8 hb-landscape-compact">
                <div className="grid grid-cols-1 min-[769px]:grid-cols-3 items-center gap-10 min-[769px]:gap-6 w-full max-w-5xl hb-landscape-grid-compact">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="font-arcade text-white text-2xl min-[481px]:text-3xl min-[769px]:text-4xl drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]">
                            Player 1
                        </div>
                        <input
                            type="text"
                            value={isPlayer1Locked ? (currentUser?.username || "") : player1Name}
                            onChange={(event) => {
                                if (!isPlayer1Locked) {
                                    setPlayer1Name(event.target.value);
                                }
                            }}
                            placeholder={isPlayer1Locked ? (currentUser?.username || "Player 1") : "Player 1"}
                            disabled={isPlayer1Locked}
                            className="w-full max-w-[20rem] rounded-none border-4 border-white bg-black/50 px-4 py-3 font-arcade text-center text-white text-base min-[481px]:text-lg min-[769px]:text-2xl outline-none placeholder:text-white/60 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] disabled:cursor-not-allowed disabled:opacity-80"
                        />
                        <div className="mt-32 min-[481px]:mt-20 min-[769px]:mt-24">
                            <Carouselplayer1 onChange={setPlayer} />
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <img
                            src="/assets/perso/versus.png"
                            alt="VS"
                            className="w-[min(10rem,34vh)] min-[481px]:w-[min(14rem,38vh)] min-[769px]:w-[min(16rem,42vh)] h-auto drop-shadow-lg"
                        />
                    </div>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="font-arcade text-white text-2xl min-[481px]:text-3xl min-[769px]:text-4xl drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]">
                            Player 2
                        </div>
                        <input
                            type="text"
                            value={player2Name}
                            onChange={(event) => setPlayer2Name(event.target.value)}
                            placeholder="Player 2"
                            className="w-full max-w-[20rem] rounded-none border-4 border-white bg-black/50 px-4 py-3 font-arcade text-center text-white text-base min-[481px]:text-lg min-[769px]:text-2xl outline-none placeholder:text-white/60 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)]"
                        />
                        <div className="mt-32 min-[481px]:mt-20 min-[769px]:mt-24">
                            <Carouselplayer2 onChange={setAi} />
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const player1DisplayName = isPlayer1Locked
                            ? (currentUser?.username || "Player 1")
                            : (player1Name.trim() || "Player 1");
                        const opponentName = player2Name.trim() || "Player 2";
                        navigate(`/local-gameplay?p1Nation=${encodeURIComponent(player)}&p2Nation=${encodeURIComponent(ai)}`, {
                            state: {
                                player1Name: player1DisplayName,
                                player2Name: opponentName,
                                player1Nation: player,
                                player2Nation: ai,
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
