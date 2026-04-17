import desktopEn from "./locales/desktop/en.json";
import desktopZhCN from "./locales/desktop/zh-CN.json";
import mobileEn from "./locales/mobile/en.json";
import mobileZhCN from "./locales/mobile/zh-CN.json";
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
  desktop: {
    "zh-CN": desktopZhCN as TranslationTree,
    en: desktopEn as TranslationTree,
  },
  mobile: {
    "zh-CN": mobileZhCN as TranslationTree,
    en: mobileEn as TranslationTree,
  },
};

export const translations = {
  "zh-CN": alignTranslationTree(
    deepMergeTranslations(
      rawLocaleSlices.desktop["zh-CN"],
      rawLocaleSlices.mobile["zh-CN"],
    ),
    "zh-CN",
  ),
  en: alignTranslationTree(
    deepMergeTranslations(
      rawLocaleSlices.desktop.en,
      rawLocaleSlices.mobile.en,
    ),
    "en",
  ),
};

export const resources = createI18nResources(translations);
