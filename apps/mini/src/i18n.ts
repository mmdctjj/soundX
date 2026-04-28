import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Taro from "@tarojs/taro";
import {
  LANGUAGE_STORAGE_KEY,
  resources,
  resolveLanguageSelection,
} from "@soundx/i18e";

const getDeviceLanguage = () => {
  try {
    const { language } = Taro.getSystemInfoSync();
    return resolveLanguageSelection("system", language);
  } catch (e) {
    console.error("Error getting system language:", e);
  }
  return resolveLanguageSelection("system");
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    try {
      const savedLanguage = Taro.getStorageSync(LANGUAGE_STORAGE_KEY);
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
  cacheUserLanguage: (_language: string) => {
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
