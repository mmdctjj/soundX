import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Taro from "@tarojs/taro";

import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";

const LANGUAGE_KEY = "app_language";

const resources = {
  "zh-CN": { translation: zhCN },
  en: { translation: en },
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    try {
      const savedLanguage = Taro.getStorageSync(LANGUAGE_KEY);
      if (savedLanguage) {
        callback(savedLanguage);
        return;
      }
    } catch (error) {
      console.error("Error reading language from storage:", error);
    }
    // Default to Chinese
    callback("zh-CN");
  },
  init: () => {},
  cacheUserLanguage: (language: string) => {
    try {
      Taro.setStorageSync(LANGUAGE_KEY, language);
    } catch (error) {
      console.error("Error saving language to storage:", error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "zh-CN",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
