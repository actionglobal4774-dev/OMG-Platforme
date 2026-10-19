import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./translations/en.json";
import fr from "./translations/fr.json";
import ht from "./translations/ht.json";
import es from "./translations/es.json";
import pt from "./translations/pt.json";
import ar from "./translations/ar.json";

const supportedLanguages = ["en", "fr", "ht", "es", "pt", "ar"];
const savedLanguage = typeof localStorage !== "undefined" ? localStorage.getItem("omg_language") : null;
const browserLanguage = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "en";
const initialLanguage = supportedLanguages.includes(savedLanguage)
  ? savedLanguage
  : supportedLanguages.includes(browserLanguage)
    ? browserLanguage
    : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ht: { translation: ht },
    es: { translation: es },
    pt: { translation: pt },
    ar: { translation: ar }
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
