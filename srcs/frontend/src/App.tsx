import Handlelog from './log/Handlelog'
import Home from './Home/Home'
import Handleregister from './log/Handleregister'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from './Profile/Profile';
import Charselectsolo from './Solo/Charselect';
import LocalCharselect from './Local/Charselect';
import SoloMode from './Gameplay/modes/SoloMode';
import LocalMode from './Gameplay/modes/LocalMode';
import NotFound from './error/404';
import Settingpage from './setting/Settingpage';
import ChangePass from './setting/Acc/Changepass';
import ChangeMail from './setting/Acc/Changemail';
import DeleteAcc from './setting/Acc/Deleteacc';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n/index.ts';
import { pingPresence } from './Profile/api/friends';
import ChatPage from './chat/ChatPage';
import SaveData from './setting/Acc/Savedata';
import PrivacyPolicy from './Legal/PrivacyPolicy';
import TermsOfService from './Legal/TermsOfService';

const App = () => {
  const { t } = useTranslation();
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
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
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
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/90 px-4 py-2 text-center text-xs text-[#1f2937] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3">
          <a className="font-semibold underline underline-offset-4" href="/privacy-policy">{t('privacy.label')}</a>
          <span aria-hidden="true">·</span>
          <a className="font-semibold underline underline-offset-4" href="/terms-of-service">{t('terms.label')}</a>
        </div>
      </footer>
    </BrowserRouter>
  );
};

export default App;
