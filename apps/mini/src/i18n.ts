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

const getDeviceLanguage = () => {
  try {
    const { language } = Taro.getSystemInfoSync();
    if (language) {
      return language.startsWith('zh') ? 'zh-CN' : 'en';
    }
  } catch (e) {
    console.error("Error getting system language:", e);
  }
  return "zh-CN";
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    try {
      const savedLanguage = Taro.getStorageSync(LANGUAGE_KEY);
      if (savedLanguage && savedLanguage !== 'system') {
        callback(savedLanguage);
        return;
      }
      callback(getDeviceLanguage());
    } catch (error) {
      console.error("Error reading language from storage:", error);
      callback(getDeviceLanguage());
    }
  },
  init: () => {},
  cacheUserLanguage: (language: string) => {
    // handled manually
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
