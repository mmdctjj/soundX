import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, NativeModules } from "react-native";
import {
  LANGUAGE_STORAGE_KEY,
  resources,
  resolveLanguageSelection,
} from "@soundx/i18e";

const getDeviceLanguage = () => {
  try {
    let locale: string | undefined;
    if (Platform.OS === 'ios') {
      const settingsManager = NativeModules.SettingsManager?.settings;
      locale = settingsManager?.AppleLocale || settingsManager?.AppleLanguages?.[0];
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier;
    }
    return resolveLanguageSelection("system", locale);
  } catch (e) {
    console.error("Failed to get device language", e);
  }
  return resolveLanguageSelection("system");
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
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
