// Simple cache utility using localStorage
const CACHE_PREFIX = 'soundx_cache_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CacheData<T> {
  data: T;
  timestamp: number;
}

export const cacheUtils = {
  // Set cache
  set: <T>(key: string, data: T): void => {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  },

  // Get cache (returns null if expired or not found)
  get: <T>(key: string, expiryMs: number = CACHE_EXPIRY): T | null => {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    try {
      const cacheData: CacheData<T> = JSON.parse(cached);
      const isExpired = Date.now() - cacheData.timestamp > expiryMs;

      if (isExpired) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Cache parse error:', error);
      return null;
    }
  },

  // Clear specific cache
  clear: (key: string): void => {
    localStorage.removeItem(CACHE_PREFIX + key);
  },

  // Clear all caches
  clearAll: (): void => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};
