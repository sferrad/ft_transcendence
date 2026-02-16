import { useState, useEffect} from 'react';
import { CgProfile } from "react-icons/cg";
import { useNavigate } from 'react-router-dom';

function Profil() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.profile-button')) {
                setIsOpen(false);
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <div className="absolute top-5 right-5 text-6xl text-zinc-700">
            <button onClick={() => setIsOpen(!isOpen)} 
                className='cursor-pointer profile-button'><CgProfile /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50 profile-menu">
                    <button onClick={() => navigate("/login")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Login</button>
                    <button onClick={() => navigate("/register")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Register</button>
                    <button onClick={() => navigate("/profile")} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</button>
                </div>
            )}
        </div>
    )
}

export default Profil