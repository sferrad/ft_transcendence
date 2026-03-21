
import "../i18n/index.ts";
import { Carouselplayer1 } from "./Carouselplayer1";
import { Carouselplayer2 } from "./Carouselplayer2";

const Charselectsolo = () => {

    return (
        <div className="relative h-screen bg-[url('/assets/bgSoloselect.jpg')] bg-cover bg-center bg-no-repeat">
            {/* Joueur 1 - Bleu */}
            <div className="absolute top-1/2 left-1/10 transform -translate-x-12 -translate-y-1/2">
                <Carouselplayer1 />
            </div>

            {/* Joueur 2 - Orange */}
            <div className="absolute top-1/2 right-1/10 transform translate-x-12 -translate-y-1/2">
                <Carouselplayer2 />
            </div>
        </div>
    );
}

export default Charselectsolo
