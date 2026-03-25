import { useState } from 'react';
import "../i18n/index.ts";
import { Carouselplayer1 } from "./Carouselplayer1";
import { Carouselplayer2 } from "./Carouselplayer2";
import { useTranslation } from "react-i18next";

const Charselectsolo = () => {
    const { t } = useTranslation();
    const [player, setPlayer] = useState("Algeria");
    const [ai, setAi] = useState("Algeria");

    return (
        <div className="fixed inset-0 bg-[url('/assets/bgSoloselect.jpg')] bg-cover bg-center bg-no-repeat ">
            {/* Joueur 1 - Bleu */}
            <div className="absolute top-1/2 left-1/10 transform -translate-x-12 -translate-y-1/2">
                <Carouselplayer1 onChange={setPlayer} />
            </div>

            <img src="./assets/perso/versus.png" alt="VS" className="absolute top-1/4  left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-225 h-auto drop-shadow-lg" />

            {/* Joueur 2 - Orange */}
            <div className="absolute top-1/2 right-1/10 transform translate-x-12 -translate-y-1/2">
                <Carouselplayer2 onChange={setAi} />
            </div>
            <button onClick={() => {
                console.log("Player:", player, "AI:", ai);
                // window.location.href = "/";
            }} className='font-arcade absolute bottom-35 left-1/2 transform -translate-x-1/2 px-15 py-10 text-5xl text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200'>{t("Start Game")}</button>
        </div>
    );
}

export default Charselectsolo
