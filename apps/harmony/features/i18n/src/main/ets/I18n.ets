import i18n from '@ohos.i18n';
import { Logger } from 'audiodock_common';

import zhCN from '../resources/locales/zh-CN.json';
import en from '../resources/locales/en.json';

export type Lang = 'zh-CN' | 'en';
export type LangSetting = 'system' | Lang;

const STORAGE_KEY = 'app_language';

const RESOURCES: Record<Lang, Record<string, unknown>> = {
  'zh-CN': zhCN as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

let currentLang: Lang = 'zh-CN';

export function detectSystemLang(): Lang {
  const sys = i18n.System.getSystemLanguage();
  if (sys.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  Logger.i('I18n', `lang=${lang}`);
}

export function applySetting(setting: LangSetting): void {
  if (setting === 'system') setLanguage(detectSystemLang());
  else setLanguage(setting);
}

function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  const segments = path.split('.');
  let node: unknown = dict;
  for (const segment of segments) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let raw = lookup(RESOURCES[currentLang], key);
  if (raw === undefined) raw = lookup(RESOURCES['en'], key);
  if (raw === undefined) raw = lookup(RESOURCES['zh-CN'], key);
  if (raw === undefined) raw = key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

export function getLang(): Lang { return currentLang; }

export const I18N_STORAGE_KEY = STORAGE_KEY;