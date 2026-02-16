import Carousel from './Carousel';
import Profil from './Buttonprofile';
import Trad from './Buttontrad';

const Home = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            <Trad />
            <Profil />
            <Carousel />
        </div>
    )
}

export default Home