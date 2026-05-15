// import React from 'react';
import { useNavigate } from "react-router-dom";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { useState, useEffect, useRef, useCallback } from 'react';
import "../../i18n/index.ts";
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

    const arcadeButtonBase =
        "hb-tap font-arcade border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] cursor-pointer no-underline inline-flex items-center justify-center transition-transform duration-100 active:translate-y-0.5 max-w-full";
    const arcadeArrowButton =
        `${arcadeButtonBase} mx-1 min-[481px]:mx-2 p-2 text-3xl min-[481px]:text-4xl text-white bg-green-600 hover:bg-green-500`;

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
            navigate("/local-select");
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
                    className={`${arcadeArrowButton} hover:scale-110 ${isPressedL ? 'scale-125' : ""}`}
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
                                className={`absolute whitespace-nowrap transition-all duration-200 ease-in-out ${arcadeButtonBase} px-5 py-2 min-[481px]:px-6 min-[481px]:py-3 text-xl min-[481px]:text-2xl min-[769px]:text-3xl
                ${isActive
                                        ? 'z-20 scale-125'
                                        : 'z-10 scale-75 opacity-50 cursor-default'}
                ${isPrev ? '-translate-x-[6.5rem] min-[481px]:-translate-x-[8.75rem]' : ''}
                ${isNext ? 'translate-x-[6.5rem] min-[481px]:translate-x-[8.75rem]' : ''}
                ${mode === "Solo" ? "text-black bg-[#4AD95A] hover:bg-green-600" : mode === "Online" ? "text-black bg-yellow-400 hover:bg-yellow-500" : mode === "Local" ? "text-black bg-blue-600 hover:bg-blue-700" : "text-black bg-gray-600 hover:bg-gray-700"}`}
                                onClick={() => select(mode)}
                                disabled={!isActive}>
                                {t(mode)}
                            </button>
                        )
                    })}
                </div>

                <button
                    className={`${arcadeArrowButton} hover:scale-110 ${isPressedR ? 'scale-125' : ""}`}
                    onClick={next}
                >
                    <FaRegArrowAltCircleRight />
                </button>
            </div>
        </div>
    );
}

export default Carousel;