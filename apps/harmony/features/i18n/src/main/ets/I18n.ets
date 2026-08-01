import i18n from '@ohos.i18n';
import { Logger } from 'audiodock_common';

import zhCN from './locales/zh-CN';
import en from './locales/en';

export type Lang = 'zh-CN' | 'en';
export type LangSetting = 'system' | Lang;

const STORAGE_KEY = 'app_language';
/**
 * AppStorage key。注意：ArkUI 只追踪「读取状态变量的表达式」并做表达式级更新，
 * t() 是普通函数，无法被框架追踪，所以页面不能只靠 @StorageProp(APP_LANG_KEY) 期待重渲染。
 * 各页面的做法：@Entry 页用 @State langAtBuild + onPageShow 在回显时切换 if 分支重建整页
 * （隐藏时重建会导致路由页触摸失效）；内嵌组件（如 PersonalTab）用 @StorageProp + if 分支重建。
 */
export const APP_LANG_KEY = 'appLang';

let currentLang: Lang = 'zh-CN';

const RESOURCES: Object[] = [zhCN, en];

export function detectSystemLang(): Lang {
  const sys = i18n.System.getSystemLanguage();
  if (sys.toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en';
}

export function setLanguage(lang: Lang): void {
  currentLang = lang;
  // 写入 AppStorage 触发所有 @StorageProp('appLang') 组件重渲染
  AppStorage.setOrCreate(APP_LANG_KEY, lang);
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

export function t(key: string, params?: Array<[string, string | number]>): string {
  const resource = currentLang === 'zh-CN' ? RESOURCES[0] : RESOURCES[1];
  let raw = lookupFromObject(resource, key);
  if (raw === undefined) raw = lookupFromObject(RESOURCES[1], key);
  if (raw === undefined) raw = lookupFromObject(RESOURCES[0], key);
  if (raw === undefined) raw = key;
  if (!params) return raw;
  
  // locale 资源是从 mobile 的 i18next 文案同步过来的，占位符写法是 {{name}}；
  // 同时兼容单层 {name}，两种都替换。
  return raw.replace(/\{\{?(\w+)\}\}?/g, (match: string, name: string): string => {
    for (let i = 0; i < params.length; i++) {
      if (params[i][0] === name) {
        const v = params[i][1];
        return String(v);
      }
    }
    return match;
  });
}

export function getLang(): Lang { return currentLang; }

export const I18N_STORAGE_KEY = STORAGE_KEY;
