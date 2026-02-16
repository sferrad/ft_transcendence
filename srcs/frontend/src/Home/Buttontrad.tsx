import { useState, useEffect} from 'react';
import { BsTranslate } from "react-icons/bs";
import { useNavigate } from 'react-router-dom';

function Trad() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.translate-button')) {
                setIsOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <div className="absolute top-5 right-25 text-6xl text-zinc-700">
            <button onClick={() => setIsOpen(!isOpen)} 
                className='cursor-pointer translate-button'><BsTranslate /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 profile-menu">
                    <button onClick={() => navigate("/fr")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇫🇷 Français</button>
                    <button onClick={() => navigate("/en")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇬🇧 English</button>
                    <button onClick={() => navigate("/sp")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">🇪🇦 Spanish</button>
                </div>
            )}
        </div>
    )
}

export default Trad