import type { LanguagePreference, SupportedLanguage } from "./types";

export const LANGUAGE_STORAGE_KEY = "app_language";
export const SYSTEM_LANGUAGE_VALUE: LanguagePreference = "system";
export const FALLBACK_LANGUAGE: SupportedLanguage = "zh-CN";
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["zh-CN", "en"];
export const EXPLICIT_LANGUAGES: SupportedLanguage[] = ["zh-CN", "en"];

export const LANGUAGE_OPTIONS = [
  { code: SYSTEM_LANGUAGE_VALUE, label: "跟随系统" },
  { code: "zh-CN" as const, label: "简体中文" },
  { code: "en" as const, label: "English" },
];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "zh-CN": "简体中文",
  en: "English",
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  "zh-CN": "🇨🇳",
  en: "🇺🇸",
};

export const EXPLICIT_LANGUAGE_OPTIONS = EXPLICIT_LANGUAGES.map((code) => ({
  code,
  label: LANGUAGE_LABELS[code],
  flag: LANGUAGE_FLAGS[code],
}));
