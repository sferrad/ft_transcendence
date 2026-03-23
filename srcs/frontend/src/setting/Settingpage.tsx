import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Trad from './Buttontrad';

const Settingpage = () => {
    const { t } = useTranslation();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    
    return (
            <div>
        <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat blur-sm"></div>
            <div className="absolute inset-0 flex justify-center items-center z-10">
                <button onClick={() => window.history.back()} className='absolute top-6 left-6 cursor-pointer px-6 py-2 text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200'>{"Back"}</button>
                <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-10 py-12 text-center shadow-[6px_6px_0_#2b2b2b] w-1/2">
                    <h1 className="text-7xl font-arcade tracking-widest text-[#1f2937] mb-6">Settings</h1>
                    <button onClick={() => setShowLanguageMenu(!showLanguageMenu)} className='font-arcade cursor-pointer px-8 py-3 text-2xl text-white bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200 mb-4 translate-button transform hover:scale-105 shadow-lg hover:shadow-xl'>
                        Language
                    </button>
                    {showLanguageMenu && <Trad />}
                </div>
            </div>
        </div>
    )
}

export default Settingpage