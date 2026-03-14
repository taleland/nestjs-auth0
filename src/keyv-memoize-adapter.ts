import type { CacheStorage } from 'p-memoize';
import type Keyv from 'keyv';

const KEYV_KEY_PREFIX = 'nestjs-auth0:memoize:';

export const createKeyvMemoizeCache = (
  keyv: Keyv,
  keyPrefix = KEYV_KEY_PREFIX
): CacheStorage<string, unknown> => {
  const buildKey = (key: string): string => `${keyPrefix}${key}`;

  return {
    has: async (key) => {
      const value = await keyv.get(buildKey(key));
      return value !== undefined;
    },
    get: async (key) => {
      return keyv.get(buildKey(key));
    },
    set: async (key, value) => {
      await keyv.set(buildKey(key), value);
    },
    delete: async (key) => {
      await keyv.delete(buildKey(key));
    },
    clear: async () => {
      await keyv.clear();
    },
  };
};
