import Handlelog from './log/Handlelog'
import Home from './Home/Home'
import Handleregister from './log/Handleregister'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from './Profile/Profile';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Handlelog />} />
        <Route path="/register" element={<Handleregister />} />
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
