import preferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { Logger } from 'audiodock_common';
import type { KeyValueStore } from 'audiodock_common';

const STORE_NAME = 'audiodock_kv';

export class PreferencesStore implements KeyValueStore {
  private prefs: preferences.Preferences | null = null;
  private mem: Map<string, string> = new Map<string, string>();
  private warned: boolean = false;

  async init(context: common.UIAbilityContext): Promise<void> {
    this.prefs = await preferences.getPreferences(context, STORE_NAME);
    Logger.i('PreferencesStore', 'KV store ready');
  }

  // ponytail: Preview 不跑 Ability 生命周期，init 不会被调用 → 降级内存存储让 Preview 可用；
  // 真机 EntryAbility 总会先 init，行为不变。数据仅活在当次 Preview 会话。
  private memStore(): Map<string, string> {
    if (!this.warned) {
      Logger.w('PreferencesStore', 'not initialized, using in-memory fallback (preview)');
      this.warned = true;
    }
    return this.mem;
  }

  async get(key: string): Promise<string | null> {
    const prefs = this.prefs;
    if (!prefs) return this.memStore().get(key) ?? null;
    const v = await prefs.get(key, '') as string;
    return v === '' ? null : v;
  }

  async set(key: string, value: string): Promise<void> {
    const prefs = this.prefs;
    if (!prefs) { this.memStore().set(key, value); return; }
    await prefs.put(key, value);
    await prefs.flush();
  }

  async delete(key: string): Promise<void> {
    const prefs = this.prefs;
    if (!prefs) { this.memStore().delete(key); return; }
    await prefs.delete(key);
    await prefs.flush();
  }

  async clear(): Promise<void> {
    const prefs = this.prefs;
    if (!prefs) { this.memStore().clear(); return; }
    await prefs.clear();
    await prefs.flush();
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw === null) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  }

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }
}

export const kvStore = new PreferencesStore();
