import preferences from '@ohos.data.preferences';
import common from '@ohos.app.ability.common';
import { Logger } from 'audiodock_common';
import type { KeyValueStore } from 'audiodock_common';

const STORE_NAME = 'audiodock_kv';

export class PreferencesStore implements KeyValueStore {
  private prefs: preferences.Preferences | null = null;

  async init(context: common.UIAbilityContext): Promise<void> {
    this.prefs = await preferences.getPreferences(context, STORE_NAME);
    Logger.i('PreferencesStore', 'KV store ready');
  }

  async get(key: string): Promise<string | null> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    const v = await this.prefs.get(key, '');
    return v === '' ? null : v;
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.put(key, value);
    await this.prefs.flush();
  }

  async delete(key: string): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.delete(key);
    await this.prefs.flush();
  }

  async clear(): Promise<void> {
    if (!this.prefs) throw new Error('PreferencesStore not initialized');
    await this.prefs.clear();
    await this.prefs.flush();
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
