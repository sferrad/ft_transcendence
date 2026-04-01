// import React from 'react';
import { useNavigate } from "react-router-dom";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { useState, useEffect, useRef, useCallback } from 'react';
import "../i18n/index.ts";
import { useTranslation } from "react-i18next";

const MODES = ["Solo", "Online", "Local", "Settings"] as const;

function Carousel() {
    const modes = MODES;
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPressedR, setIsPressedR] = useState(false);
    const [isPressedL, setIsPressedL] = useState(false);
    const navigate = useNavigate();
    const lastNavTime = useRef(0);
    const delay = 200;
    const { t } = useTranslation();

    const canNavigate = useCallback(() => {
        const now = Date.now();
        if (now - lastNavTime.current >= delay) {
            lastNavTime.current = now;
            return true;
        }
        return false;
    }, [delay]);

    const select = useCallback((mode: string) => {
        if (mode === 'Solo')
            navigate("/solo-select");
        else if (mode === 'Online'){
            if (localStorage.getItem("access_token"))
                navigate("/lobby");
            else
                navigate("/login");
        }
        else if (mode === 'Local')
            navigate("/login");
        else if (mode === 'Settings')
            navigate("/settings");
    }, [navigate]);

    const next = useCallback(() => {
        if (canNavigate()) {
            setActiveIndex((i) => (i + 1) % modes.length);
        }
    }, [canNavigate, modes.length]);

    const prev = useCallback(() => {
        if (canNavigate()) {
            setActiveIndex((i) => (i - 1 + modes.length) % modes.length);
        }
    }, [canNavigate, modes.length]);

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
    }, [activeIndex, modes, next, prev, select]);

    return (
        <div className="flex items-end justify-center min-h-[100dvh] pb-6 min-[481px]:pb-10 min-[769px]:pb-20 px-3 text-base min-[481px]:text-xl">
            <div className="flex items-center justify-center border-2 border-gray-300 bg-green-700 rounded-xl px-4 py-4 min-[481px]:px-8 min-[481px]:py-6 gap-3 min-[481px]:gap-4 w-[min(92vw,48rem)]">
                <button
                    className={`hb-tap mx-1 min-[481px]:mx-2 cursor-pointer text-4xl min-[481px]:text-5xl hover:scale-110 ${isPressedL ? 'scale-125' : ""} transition-transform text-white border-2 border-gray-300 rounded-lg p-2`}
                    onClick={prev}
                >
                    <FaRegArrowAltCircleLeft />
                </button>

                {/*
                  4) Grilles/sections: ici on garde une zone "relative" qui s'adapte à la largeur
                  pour éviter le débordement sur mobile.
                */}
                <div className="relative w-[min(22rem,70vw)] min-[481px]:w-[min(26rem,70vw)] h-20 min-[481px]:h-24 flex items-center justify-center">
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
                                className={`absolute transition-all duration-200 ease-in-out px-4 py-2 min-[481px]:px-6 min-[481px]:py-3 rounded-lg font-semibold
                ${isActive
                                        ? 'z-20 scale-125 text-white shadow-xl transition-transform cursor-pointer'
                                        : 'z-10 scale-75 bg-gray-400 text-gray-200 opacity-50'}
                ${isPrev ? '-translate-x-[6.5rem] min-[481px]:-translate-x-[8.75rem]' : ''}
                ${isNext ? 'translate-x-[6.5rem] min-[481px]:translate-x-[8.75rem]' : ''}
                ${mode === "Solo" ? "bg-green-500" : mode === "Online" ? "bg-yellow-500" : mode === "Local" ? "bg-blue-500" : "bg-gray-500"}`}
                                onClick={() => select(mode)}
                                disabled={!isActive}>
                                {t(mode)}
                            </button>
                        )
                    })}
                </div>

                <button
                    className={`hb-tap mx-1 min-[481px]:mx-2 text-4xl min-[481px]:text-5xl hover:scale-110 ${isPressedR ? 'scale-125' : ""} cursor-pointer transition-transform text-white border-2 border-gray-300 rounded-lg p-2`}
                    onClick={next}
                >
                    <FaRegArrowAltCircleRight />
                </button>
            </div>
        </div>
    );
}

export default Carousel;