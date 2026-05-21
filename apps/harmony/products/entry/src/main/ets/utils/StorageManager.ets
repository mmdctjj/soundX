import preferences from '@ohos.data.preferences';

class StorageManager {
  private context: Context | null = null;

  init(context: Context): void {
    this.context = context;
  }

  private async getPreferences(): Promise<preferences.Preferences> {
    if (!this.context) {
      throw new Error('StorageManager not initialized');
    }
    return preferences.getPreferences(this.context, 'audiodock_storage');
  }

  async setItem(key: string, value: string): Promise<void> {
    const pref = await this.getPreferences();
    await pref.put(key, value);
    await pref.flush();
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const pref = await this.getPreferences();
      const value = await pref.get(key, '');
      const strValue = value as string;
      if (strValue && strValue.length > 0) {
        return strValue;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    const pref = await this.getPreferences();
    await pref.delete(key);
    await pref.flush();
  }

  async clear(): Promise<void> {
    const pref = await this.getPreferences();
    await pref.clear();
    await pref.flush();
  }
}

export const storage = new StorageManager();
