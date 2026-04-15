import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import BrowserLanguageDetector from "i18next-browser-languagedetector";

import zhCNTranslation from "./locales/zh-CN.json";
import enTranslation from "./locales/en.json";

const resources = {
  "zh-CN": { translation: zhCNTranslation },
  en: { translation: enTranslation },
};

i18n
  .use(BrowserLanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh-CN",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export const antdLocales = {
  "zh-CN": null,
  en: null,
};

export const languages = [
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
];

export default i18n;
