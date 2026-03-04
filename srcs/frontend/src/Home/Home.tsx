import Carousel from './Carousel';
import Profil from './Buttonprofile';
import Trad from './Buttontrad';

const Home = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-[url('/assets/bgHome.jpg')] bg-cover bg-center bg-no-repeat">
            <Trad />
            <Profil />
            <Carousel />
        </div>
    )
}

export default Home