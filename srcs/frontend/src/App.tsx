import Handlelog from './log/Handlelog'
import Home from './Home/Home'
import Handleregister from './log/Handleregister'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from './Profile/Profile';
import Charselectsolo from './Solo/Charselect';
import LocalCharselect from './Local/Charselect';
import SoloMode from './Gameplay/SoloMode';
import LocalMode from './Gameplay/LocalMode';
import NotFound from './error/404';
import Settingpage from './setting/Settingpage';
import ChangePass from './setting/Acc/Changepass';
import ChangeMail from './setting/Acc/Changemail';
import DeleteAcc from './setting/Acc/Deleteacc';
import { useEffect } from 'react';
import { pingPresence } from './Profile/api/friends';
import ChatPage from './chat/ChatPage';
import SaveData from './setting/Acc/Savedata';

const App = () => {
  useEffect(() => {
    const ping = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        await pingPresence(token);
      } catch {
      }
    };

    ping();

    const intervalId = window.setInterval(ping, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Handlelog />} />
        <Route path="/register" element={<Handleregister />} />
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/solo-select" element={<Charselectsolo />} />
        <Route path="/local-select" element={<LocalCharselect />} />
        <Route path="/solo-gameplay" element={<SoloMode />} />
        <Route path="/local-gameplay" element={<LocalMode />} />
        <Route path="/settings" element={<Settingpage />} />
        <Route path="/settings/change-password" element={<ChangePass />} />
        <Route path="/settings/change-email" element={<ChangeMail />} />
        <Route path="/settings/delete-account" element={<DeleteAcc />} />
        <Route path="/settings/save-data" element={<SaveData />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
