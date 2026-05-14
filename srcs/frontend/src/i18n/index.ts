import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  // Charge les traductions depuis le dossier public/locales au moment de l'execution.
  .use(HttpBackend)
  // Detecte automatiquement la langue du navigateur ou du client pour afficher
  // l'interface dans la langue la plus adaptee sans intervention manuelle.
  .use(LanguageDetector)
  // Branche l'instance i18n au runtime React afin que `useTranslation()` et les
  // composants associes puissent acceder au contexte de traduction.
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    // Ne charge que le code langue principal (par exemple `fr` plutot que `fr-FR`).
    load: "languageOnly",
    // Normalise les codes de langue pour reduire les variations inutiles.
    cleanCode: true,
    // Force les codes langues en minuscules pour harmoniser la resolution.
    lowerCaseLng: true,
    debug: import.meta.env.DEV,
    interpolation: {
      // React protege deja le rendu contre les injections dans les cas usuels;
      // on desactive donc l'echappement automatique pour eviter les doubles escapes.
      escapeValue: false,
    },
    detection: {
      // Convertit une langue detectee du type `fr-FR` ou `fr_CA` en `fr` pour
      // coller aux ressources effectivement disponibles dans le projet.
      convertDetectedLanguage: (lng: string) => lng.split("-")[0].toLowerCase(),
    },
    backend: {
      // Les fichiers de traduction sont exposes par le frontend depuis /locales.
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    // On annonce explicitement les langues prises en charge pour eviter des
    // resolutions implicites inutiles ou des chargements de langues non prevues.
    supportedLngs: ["en", "es", "fr"],
    // Autorise une langue reconnue meme si la region precise n'est pas declaree.
    nonExplicitSupportedLngs: true,
  });

export default i18n;