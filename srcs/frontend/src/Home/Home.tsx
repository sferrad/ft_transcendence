import Carousel from './Carousel';
import Profil from './Buttonprofile';
import Trad from './Buttontrad';
import { useTranslation } from "react-i18next";

const Home = () => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center justify-center h-screen bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat">
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-6">
                <Trad />
                {localStorage.getItem("access_token") ? (
                    <Profil />
                ) : (
                    <div className="flex gap-4 items-center">
                        <button onClick={() => window.location.href = "/login"} className='cursor-pointer px-6 py-2 text-lg text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200'>{t("Login")}</button>
                        <button onClick={() => window.location.href = "/register"} className='cursor-pointer px-6 py-2 text-lg text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200'>{t("Register")}</button>
                    </div>
                )}
            </div>
            <Carousel />
        </div>
    )
}

export default Home