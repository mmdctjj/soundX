import i18n from '@ohos.i18n';
import { Logger } from 'audiodock_common';

import zhCN from './locales/zh-CN';
import en from './locales/en';

export type Lang = 'zh-CN' | 'en';
export type LangSetting = 'system' | Lang;

const STORAGE_KEY = 'app_language';

let currentLang: Lang = 'zh-CN';

const RESOURCES: Object[] = [zhCN, en];

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

function lookupFromObject(obj: Object, path: string): string | undefined {
  const segments = path.split('.');
  let current: Object = obj;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const currentRecord = current as Record<string, Object>;
    if (currentRecord === null || currentRecord === undefined) return undefined;
    
    const keys = Object.keys(currentRecord);
    let found = false;
    for (let j = 0; j < keys.length; j++) {
      if (keys[j] === segment) {
        const next = currentRecord[segment];
        if (i === segments.length - 1) {
          if (typeof next === 'string') return next;
          return undefined;
        }
        current = next;
        found = true;
        break;
      }
    }
    if (!found) return undefined;
  }
  return undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const resource = currentLang === 'zh-CN' ? RESOURCES[0] : RESOURCES[1];
  let raw = lookupFromObject(resource, key);
  if (raw === undefined) raw = lookupFromObject(RESOURCES[1], key);
  if (raw === undefined) raw = lookupFromObject(RESOURCES[0], key);
  if (raw === undefined) raw = key;
  if (!params) return raw;
  
  // locale 资源是从 mobile 的 i18next 文案同步过来的，占位符写法是 {{name}}；
  // 同时兼容单层 {name}，两种都替换。
  return raw.replace(/\{\{?(\w+)\}\}?/g, (match: string, name: string): string => {
    const keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] === name) {
        const v = params[name];
        return String(v);
      }
    }
    return match;
  });
}

export function getLang(): Lang { return currentLang; }

export const I18N_STORAGE_KEY = STORAGE_KEY;
