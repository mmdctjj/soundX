import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, NativeModules } from "react-native";

import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";

const LANGUAGE_KEY = "app_language";

const resources = {
  "zh-CN": { translation: zhCN },
  en: { translation: en },
};

const getDeviceLanguage = () => {
  try {
    const locale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager.settings.AppleLocale ||
          NativeModules.SettingsManager.settings.AppleLanguages[0] // iOS 13
        : NativeModules.I18nManager.localeIdentifier;
    if (locale) {
      return locale.startsWith('zh') ? 'zh-CN' : 'en';
    }
  } catch (e) {
    console.error("Failed to get device language", e);
  }
  return "zh-CN";
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
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
  cacheUserLanguage: async (language: string) => {
    // We handle caching manually when switching, to differentiate 'system' from explicit lang
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
