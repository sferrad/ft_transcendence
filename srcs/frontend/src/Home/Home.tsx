import Carousel from './Carousel';
import Profil from './Buttonprofile';
import { useTranslation } from "react-i18next";

const Home = () => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-[url('/assets/bgHome.png')] bg-cover bg-center bg-no-repeat">
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6 z-10">
                {localStorage.getItem("access_token") ? (
                    <Profil />
                ) : (
                    <div className="flex gap-4 items-center">
                        <button onClick={() => window.location.href = "/login"} className='absolute right-38 cursor-pointer px-6 py-2 text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200'>{t("Login")}</button>
                        <button onClick={() => window.location.href = "/register"} className='absolute right-6 cursor-pointer px-6 py-2 text-lg text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200'>{t("Register")}</button>
                    </div>
                )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
                <img src="/assets/logo.png" alt="Logo" className="w-2/3 h-auto" />
            </div>
            <div className="absolute bottom-0 left-0 right-0">
                <Carousel />
            </div>
        </div>
    )
}

export default Home