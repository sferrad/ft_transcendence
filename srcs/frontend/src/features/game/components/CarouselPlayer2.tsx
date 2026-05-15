import { useState } from 'react';
import { FaPlay } from "react-icons/fa";
import { CHARACTERS, faceSrc, flagSrc } from '../../utils/characters';

export const Carouselplayer2 = ({ onChange }: { onChange?: (char: string) => void }) => {
    const [activeIndex, setActiveIndex] = useState<number>(0);

    const circleSize = "clamp(6.5rem, 20vh, 11rem)";
    const flagWidth = "clamp(4rem, 13vh, 8rem)";
    const iconSize = "clamp(1.4rem, 4vh, 2.2rem)";

    const next = () => {
        const newIndex = (activeIndex + 1) % CHARACTERS.length;
        setActiveIndex(newIndex);
        onChange?.(CHARACTERS[newIndex]);
    };

    const prev = () => {
        const newIndex = (activeIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
        setActiveIndex(newIndex);
        onChange?.(CHARACTERS[newIndex]);
    };

    const char = CHARACTERS[activeIndex];

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
                <div
                    className="absolute left-1/2 z-10 -translate-x-1/2"
                    style={{ top: `calc(-1 * ${flagWidth} * 0.45)` }}
                >
                    <img
                        style={{ width: flagWidth }}
                        className="h-auto drop-shadow-md"
                        src={flagSrc(char)}
                        alt={`${char} Flag`}
                    />
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
                    <img className="w-[70%] h-auto" src={faceSrc(char)} alt={char} />
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
