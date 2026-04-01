import { useState } from 'react';
import { FaPlay } from "react-icons/fa";

export const Carouselplayer2 = ({ onChange }: { onChange?: (char: string) => void }) => {
    const chars = ["Algeria", "Morocco", "Tunisia"];
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
                    color: '#FF6B35',
                    filter: 'drop-shadow(0 0 10px #FF6B35)',
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
                </div>

                <div
                    className="circle rounded-full flex flex-col items-center justify-center text-2xl min-[481px]:text-3xl font-bold text-gray-800 relative"
                    style={{
                        width: circleSize,
                        height: circleSize,
                        background: 'radial-gradient(circle at 30% 30%, #FFD700, #FF8C00, #D94A00)',
                        boxShadow: 'inset 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 -10px 25px rgba(255, 255, 255, 0.2), 0 10px 30px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {chars[activeIndex] === "Algeria" && <img className="w-[70%] h-auto" src="/assets/perso/algerie.png" alt="Algeria"/>}
                    {chars[activeIndex] === "Morocco" && <img className="w-[70%] h-auto" src="/assets/perso/maroc.png" alt="Morocco"/>}
                    {chars[activeIndex] === "Tunisia" && <img className="w-[70%] h-auto" src="/assets/perso/tunisie.png" alt="Tunisia"/>}
                </div>
            </div>

            <button onClick={next} className="hb-tap hover:scale-125 transition">
                <FaPlay style={{
                    fontSize: iconSize,
                    color: '#FF6B35',
                    filter: 'drop-shadow(0 0 10px #FF6B35)'
                }} />
            </button>
        </div>
    );
}

export default Carouselplayer2
