import Handlelog from './log/Handlelog'
import Home from './Home/Home'
import Handleregister from './log/Handleregister'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from './Profile/Profile';
import Charselectsolo from './Solo/Charselect';
import NotFound from './error/404';
import Settingpage from './setting/Settingpage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Handlelog />} />
        <Route path="/register" element={<Handleregister />} />
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/solo-select" element={<Charselectsolo />} />
        <Route path="/settings" element={<Settingpage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
