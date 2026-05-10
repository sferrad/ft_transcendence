import { useState } from 'react';
import { FaPlay } from "react-icons/fa";

export const Carouselplayer1 = ({ onChange }: { onChange?: (char: string) => void }) => {
    const chars = ["Algeria", "Morocco", "Tunisia", "France", "Italy", "Nigeria", "America", "China"];
    const [activeIndex, setActiveIndex] = useState<number>(0);

    // Responsive "height-first": en paysage (petite hauteur), le vh domine et empêche les cercles d'être trop gros.
    const circleSize = "clamp(9rem, 30vh, 16rem)";
    const flagWidth = "clamp(6rem, 18vh, 12rem)";
    const iconSize = "clamp(2rem, 6vh, 3rem)";

    const next = () => {
        const newIndex = (activeIndex + 1) % chars.length;
        setActiveIndex(newIndex);
        onChange?.(chars[newIndex]);
    };

    const prev = () => {
        const newIndex = (activeIndex - 1 + chars.length) % chars.length;
        setActiveIndex(newIndex);
        onChange?.(chars[newIndex]);
    };

    return (
        <div className="flex items-center justify-center gap-3 min-[481px]:gap-4">
            <button onClick={prev} className="hb-tap hover:scale-125 transition">
                <FaPlay style={{
                    fontSize: iconSize,
                    color: '#00BFFF',
                    filter: 'drop-shadow(0 0 10px #00BFFF)',
                    transform: 'rotate(180deg)'
                }} />
            </button>

            <div className="relative flex items-center justify-center">
                {/* Drapeau: centré, size capé par la hauteur */}
                <div
                    className="absolute left-1/2 z-10 -translate-x-1/2"
                    style={{ top: `calc(-1 * ${flagWidth} * 0.45)` }}
                >
                    {chars[activeIndex] === "Algeria" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeaudz.png" alt="Algeria Flag" />
                    )}
                    {chars[activeIndex] === "Morocco" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeauma.png" alt="Morocco Flag" />
                    )}
                    {chars[activeIndex] === "Tunisia" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeautns.png" alt="Tunisia Flag" />
                    )}
                    {chars[activeIndex] === "France" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeaufr.png" alt="France Flag" />
                    )}
                    {chars[activeIndex] === "Italy" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeauit.png" alt="Italy Flag" />
                    )}
                    {chars[activeIndex] === "Nigeria" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeaunig.png" alt="Nigeria Flag" />
                    )}
                    {chars[activeIndex] === "America" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeauusa.png" alt="America Flag" />
                    )}
                    {chars[activeIndex] === "China" && (
                        <img style={{ width: flagWidth }} className="h-auto drop-shadow-md" src="/assets/perso/drapeauch.png" alt="China Flag" />
                    )}
                </div>

                <div
                    className="circle rounded-full flex flex-col items-center justify-center text-2xl min-[481px]:text-3xl font-bold text-gray-800 relative"
                    style={{
                        width: circleSize,
                        height: circleSize,
                        background: 'radial-gradient(circle at 30% 30%, #87CEEB, #4A90E2, #1E40AF)',
                        boxShadow: 'inset 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 -10px 25px rgba(255, 255, 255, 0.2), 0 10px 30px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {chars[activeIndex] === "Algeria" && <img className="w-[70%] h-auto" src="/assets/perso/algeria-face.png" alt="Algeria"/>}
                    {chars[activeIndex] === "Morocco" && <img className="w-[70%] h-auto" src="/assets/perso/morocco-face.png" alt="Morocco"/>}
                    {chars[activeIndex] === "Tunisia" && <img className="w-[70%] h-auto" src="/assets/perso/tunisia-face.png" alt="Tunisia"/>}
                    {chars[activeIndex] === "France" && <img className="w-[70%] h-auto" src="/assets/perso/france-face.png" alt="France"/>}
                    {chars[activeIndex] === "Italy" && <img className="w-[70%] h-auto" src="/assets/perso/italian-face.png" alt="Italy"/>}
                    {chars[activeIndex] === "Nigeria" && <img className="w-[70%] h-auto" src="/assets/perso/nigerian-face.png" alt="Nigeria"/>}
                    {chars[activeIndex] === "America" && <img className="w-[70%] h-auto" src="/assets/perso/american-face.png" alt="America"/>}
                    {chars[activeIndex] === "China" && <img className="w-[70%] h-auto" src="/assets/perso/chinese-face.png" alt="China"/>}
                </div>
            </div>

            <button onClick={next} className="hb-tap hover:scale-125 transition">
                <FaPlay style={{
                    fontSize: iconSize,
                    color: '#00BFFF',
                    filter: 'drop-shadow(0 0 10px #00BFFF)'
                }} />
            </button>
        </div>
    );
}

export default Carouselplayer1
