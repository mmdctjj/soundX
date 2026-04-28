import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import BrowserLanguageDetector from "i18next-browser-languagedetector";
import {
  EXPLICIT_LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  resources,
} from "@soundx/i18e";

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
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export const antdLocales = {
  "zh-CN": null,
  en: null,
};

export const languages = [
  ...EXPLICIT_LANGUAGE_OPTIONS,
];

export default i18n;
