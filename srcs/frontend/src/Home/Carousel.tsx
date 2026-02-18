// import React from 'react';
import { useNavigate } from "react-router-dom";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { useState, useEffect, useRef } from 'react';
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

function Carousel() {
    const modes = ["Solo", "Multiplayer", "Coop", "Settings"];
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPressedR, setIsPressedR] = useState(false);
    const [isPressedL, setIsPressedL] = useState(false);
    const navigate = useNavigate();
    const lastNavTime = useRef(0);
    const delay = 200;
    const { t } = useTranslation();

    const canNavigate = () => {
        const now = Date.now();
        if (now - lastNavTime.current >= delay) {
            lastNavTime.current = now;
            return true;
        }
        return false;
    };

    const select = (mode: string) => {
        if (mode === 'Solo')
            navigate("/login");
        else if (mode === 'Multiplayer')
            navigate("/login");
        else if (mode === 'Coop')
            navigate("/login");
        else if (mode === 'Settings')
            navigate("/login");
    };

    const next = () => {
        if (canNavigate()) {
            setActiveIndex((i) => (i + 1) % modes.length);
        }
    };

    const prev = () => {
        if (canNavigate()) {
            setActiveIndex((i) => (i - 1 + modes.length) % modes.length);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                setIsPressedR(true);
                next();
            }
            if (e.key === 'ArrowLeft'){
                setIsPressedL(true);
                prev();
            }
            if (e.key === 'Enter') select(modes[activeIndex]);
        };
        const handleRelease = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') setIsPressedR(false);
            if (e.key === 'ArrowLeft') setIsPressedL(false);
        }
        const handleMouseWheel = (e: WheelEvent) => {
            if (e.deltaY > 0) prev();
            if (e.deltaY < 0) next();
        };
        window.addEventListener('wheel', handleMouseWheel);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleRelease);
        return () => {
            window.removeEventListener('keyup', handleRelease);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleMouseWheel);
        };
    }, [activeIndex]);

    return (
        <div className="flex items-end justify-center h-screen pb-20 text-2xl">
            <div className="flex items-center justify-center border-2 border-gray-300 bg-gradient-to-r from-blue-500 to-red-500 rounded-xl px-8 py-6 gap-4">
                <button className={`mx-2 cursor-pointer text-5xl hover:scale-110 ${isPressedL ? 'scale-125' : ""} transition-transform text-blue-300 border-2 border-gray-300 rounded-lg p-2`} onClick={prev}><FaRegArrowAltCircleLeft /></button>

                <div className="relative w-96 h-24 flex items-center justify-center">
                    {modes.map((mode, index) => {
                        let offset = index - activeIndex;

                        if (offset > modes.length / 2) offset -= modes.length;
                        if (offset < -modes.length / 2) offset += modes.length;

                        if (Math.abs(offset) > 1) return null;

                        const isActive = offset === 0;
                        const isPrev = offset === -1;
                        const isNext = offset === 1;

                        return (
                            <button type='submit'
                                key={mode}
                                className={`absolute transition-all duration-250 ease-in-out px-6 py-3 rounded-lg font-semibold
                ${isActive
                                        ? 'z-20 scale-125 text-white shadow-xl transition-transform cursor-pointer'
                                        : 'z-10 scale-75 bg-gray-400 text-gray-200 opacity-50'}
                ${isPrev ? '-translate-x-35' : ''}
                ${isNext ? 'translate-x-35' : ''}
                ${mode === "Solo" ? "bg-green-500" : mode === "Multiplayer" ? "bg-yellow-500" : mode === "Coop" ? "bg-purple-500" : "bg-gray-500"}`}
                                onClick={() => select(mode)}
                                disabled={!isActive}>
                                {t(mode)}
                            </button>
                        )
                    })}
                </div>

                <button className={`mx-2 text-5xl hover:scale-110 ${isPressedR ? 'scale-125' : ""} cursor-pointer transition-transform text-blue-300 border-2 border-gray-300 rounded-lg p-2`} onClick={next}><FaRegArrowAltCircleRight /></button>
            </div>
        </div>
    );
}

export default Carousel;