export type SupportedLanguage = "zh-CN" | "en";
export type LanguagePreference = SupportedLanguage | "system";

export type TranslationValue =
  | string
  | number
  | boolean
  | null
  | TranslationTree
  | TranslationValue[];

export interface TranslationTree {
  [key: string]: TranslationValue;
}

export type I18nResourceEntry = Record<string, TranslationTree>;

export type I18nResources = Record<SupportedLanguage, I18nResourceEntry>;
