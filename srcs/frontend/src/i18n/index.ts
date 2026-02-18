import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(HttpBackend) // load translations from public/locales
  .use(LanguageDetector) // detect user language
  .use(initReactI18next) // pass i18n instance to react-i18next
  .init({
    fallbackLng: "en",
    debug: import.meta.env.DEV,    interpolation: {
      escapeValue: false, // react already safes from xss
    },    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
  });export default i18n;