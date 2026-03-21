import { useState } from 'react';
import { FaPlay } from "react-icons/fa";

export const Carouselplayer2 = ({ onChange }: { onChange?: (char: string) => void }) => {
    const chars = ["Algeria", "Morocco", "Tunisia"];
    const [activeIndex, setActiveIndex] = useState<number>(0);

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
        <div className="relative flex items-center justify-center">
                        <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2">
                {chars[activeIndex] === "Algeria" && (
                    <img className="w-48 h-auto drop-shadow-md" src="/assets/perso/drapeaudz.png" alt="Algeria Flag" />
                )}
                {chars[activeIndex] === "Morocco" && (
                    <img className="w-48 h-auto drop-shadow-md" src="/assets/perso/drapeauma.png" alt="Morocco Flag" />
                )}
                {chars[activeIndex] === "Tunisia" && (
                    <img className="w-48 h-auto drop-shadow-md" src="/assets/perso/drapeautns.png" alt="Tunisia Flag" />
                )}
            </div>
            <button onClick={prev} className="absolute left-0 transform -translate-x-24 hover:scale-125 transition">
                <FaPlay className="text-5xl" style={{color: '#FF6B35', filter: 'drop-shadow(0 0 10px #FF6B35)', transform: 'rotate(180deg)'}} />
            </button>
            <div className="circle w-64 h-64 rounded-full flex flex-col items-center justify-center text-3xl font-bold text-gray-800 relative" style={{background: 'radial-gradient(circle at 30% 30%, #FFD700, #FF8C00, #D94A00)', boxShadow: 'inset 0 10px 25px rgba(0, 0, 0, 0.4), inset 0 -10px 25px rgba(255, 255, 255, 0.2), 0 10px 30px rgba(0, 0, 0, 0.3)'}}>
                {chars[activeIndex] === "Algeria" && <img src="/assets/perso/algerie.png" alt="Algeria"/>}
                {chars[activeIndex] === "Morocco" && <img src="/assets/perso/maroc.png" alt="Morocco"/>}
                {chars[activeIndex] === "Tunisia" && <img src="/assets/perso/tunisie.png" alt="Tunisia"/>}
            </div>
            <button onClick={next} className="absolute right-0 transform translate-x-24 hover:scale-125 transition">
                <FaPlay className="text-5xl" style={{color: '#FF6B35', filter: 'drop-shadow(0 0 10px #FF6B35)'}} />
            </button>
        </div>
    );
}

export default Carouselplayer2
