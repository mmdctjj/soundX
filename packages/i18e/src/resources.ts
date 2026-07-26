import commonEn from "./locales/common/en.json";
import commonZhCN from "./locales/common/zh-CN.json";
import { createI18nResources, deepMergeTranslations } from "./utils";
import { FALLBACK_LANGUAGE } from "./constants";
import type { TranslationTree } from "./types";

function alignTranslationTree(
  tree: TranslationTree,
  language: "zh-CN" | "en",
): TranslationTree {
  const next = deepMergeTranslations(tree);
  const settings = (next.settings ?? {}) as TranslationTree;

  if (!settings.themeSystem) {
    settings.themeSystem = language === FALLBACK_LANGUAGE ? "跟随系统" : "Follow system";
  }

  if (!settings.languageDescription) {
    settings.languageDescription =
      language === FALLBACK_LANGUAGE
        ? "选择应用显示语言"
        : "Choose the app display language";
  }

  next.settings = settings;
  return next;
}

export const rawLocaleSlices = {
  common: {
    "zh-CN": commonZhCN as TranslationTree,
    en: commonEn as TranslationTree,
  },
};

export const translations = {
  "zh-CN": alignTranslationTree(rawLocaleSlices.common["zh-CN"], "zh-CN"),
  en: alignTranslationTree(rawLocaleSlices.common.en, "en"),
};

export const resources = createI18nResources(translations);
