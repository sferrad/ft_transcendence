import { useEffect } from 'react';

const Settingacc = ({ onClose }: { onClose: () => void }) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.profile-menu') && !target.closest('.account-button')) {
                onClose();
            }
        };
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, []);
    return (
        <div className="flex justify-center mt-4">
            <div className="animate-in fade-in zoom-in-95 duration-200 bg-gradient-to-b from-white to-gray-50 rounded-xl shadow-2xl py-3 px-2 w-56 profile-menu border-4 border-[#2b2b2b]">
                <button className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">🔒</span>
                <span className='text-3xl font-arcade'>Change Password</span>
                </button>
                <button className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <span className='text-3xl font-arcade'>Change Email</span>
                </button>
                <button className="w-full text-left px-4 py-3 text-xl text-gray-800 hover:bg-blue-100 rounded-lg transition-all duration-150 hover:scale-105 hover:shadow-md flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span className='text-3xl font-arcade'>Delete Account</span>
                </button>
            </div>
        </div>
    );
}

export default Settingacc