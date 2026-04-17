import { FALLBACK_LANGUAGE, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "./constants";
import type {
  I18nResourceEntry,
  I18nResources,
  LanguagePreference,
  SupportedLanguage,
  TranslationTree,
  TranslationValue,
} from "./types";

function isPlainObject(value: TranslationValue | undefined): value is TranslationTree {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function deepMergeTranslations<T extends TranslationTree>(...sources: T[]): T {
  const result: TranslationTree = {};

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      const existing = result[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        result[key] = deepMergeTranslations(existing, value);
      } else if (Array.isArray(value)) {
        result[key] = [...value];
      } else {
        result[key] = value;
      }
    }
  }

  return result as T;
}

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return !!value && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

export function normalizeLanguageCode(value: string | null | undefined): SupportedLanguage {
  if (!value) {
    return FALLBACK_LANGUAGE;
  }

  if (isSupportedLanguage(value)) {
    return value;
  }

  return value.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function normalizeLanguagePreference(
  value: string | null | undefined,
): LanguagePreference {
  if (value === "system") {
    return "system";
  }

  return normalizeLanguageCode(value);
}

export function resolveLanguageSelection(
  preference: LanguagePreference | null | undefined,
  systemLanguage?: string | null,
): SupportedLanguage {
  if (!preference || preference === "system") {
    return normalizeLanguageCode(systemLanguage);
  }

  return normalizeLanguageCode(preference);
}

export function getLanguageLabel(language: SupportedLanguage): string {
  return LANGUAGE_LABELS[language];
}

export function createI18nResourceEntry(translation: TranslationTree): I18nResourceEntry {
  return { translation };
}

export function createI18nResources(
  translations: Record<SupportedLanguage, TranslationTree>,
): I18nResources {
  return {
    "zh-CN": createI18nResourceEntry(translations["zh-CN"]),
    en: createI18nResourceEntry(translations.en),
  };
}
