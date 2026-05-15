import Handlelog from './pages/LoginPage'
import Home from './pages/HomePage'
import Handleregister from './pages/RegisterPage'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Profile from './pages/ProfilePage';
import Charselectsolo from './pages/SoloCharSelectPage';
import LocalCharselect from './pages/LocalCharSelectPage';
import SoloMode from './features/game/modes/SoloMode';
import LocalMode from './features/game/modes/LocalMode';
import OnlineMode from './features/game/modes/OnlineMode';
import LobbyPage from './pages/LobbyPage';
import NotFound from './pages/NotFoundPage';
import Settingpage from './pages/SettingsPage';
import ChangePass from './pages/ChangePasswordPage';
import ChangeMail from './pages/ChangeEmailPage';
import DeleteAcc from './pages/DeleteAccountPage';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n/index.ts';
import { pingPresence } from './features/profile/api/friends';
import ChatPage from './pages/ChatPage';
import SaveData from './pages/SaveDataPage';
import PrivacyPolicy from './pages/PrivacyPolicyPage';
import TermsOfService from './pages/TermsOfServicePage';
import ResultsPage from './pages/ResultsPage'
import GlobalOverlays from './components/GlobalOverlays'
import GlobalNotifications from './components/GlobalNotifications';

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
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/online-gameplay" element={<OnlineMode />} />
        <Route path="/settings" element={<Settingpage />} />
        <Route path="/settings/change-password" element={<ChangePass />} />
        <Route path="/settings/change-email" element={<ChangeMail />} />
        <Route path="/settings/delete-account" element={<DeleteAcc />} />
        <Route path="/settings/save-data" element={<SaveData />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalOverlays />
      <GlobalNotifications />
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
