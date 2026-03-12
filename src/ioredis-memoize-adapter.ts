import type { Redis } from 'ioredis';
import type { CacheStorage } from 'p-memoize';

const REDIS_MEMOIZE_KEY_PREFIX = 'nestjs-auth0:memoize:';
const SERIALIZED_UNDEFINED_MARKER = JSON.stringify({
  __MemoizeUndefined__: true,
});

const serializeCacheValue = (value: unknown): string => value === undefined
  ? SERIALIZED_UNDEFINED_MARKER
  : JSON.stringify(value);

const deserializeCacheValue = (serializedValue: string): unknown => serializedValue === SERIALIZED_UNDEFINED_MARKER
  ? undefined
  : JSON.parse(serializedValue);

const buildRedisMemoizeKey = (
  keyPrefix: string,
  key: string
): string => `${keyPrefix}${key}`;

const deleteKeysByPattern = async (
  redis: Redis,
  pattern: string
): Promise<void> => {
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      '100'
    );

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    cursor = nextCursor;
  } while (cursor !== '0');
};

export const createRedisMemoizeCache = (
  redis: Redis,
  ttlMilliseconds?: number,
  keyPrefix = REDIS_MEMOIZE_KEY_PREFIX
): CacheStorage<any, unknown> => {
  return {
    has: async (key) => {
      const exists = await redis.exists(buildRedisMemoizeKey(keyPrefix, key));
      return exists === 1;
    },
    get: async (key) => {
      const value = await redis.get(buildRedisMemoizeKey(keyPrefix, key));
      return value === null ? undefined : deserializeCacheValue(value);
    },
    set: async (key, value) => {
      const serializedValue = serializeCacheValue(value);
      const redisKey = buildRedisMemoizeKey(keyPrefix, key);

      if (ttlMilliseconds !== undefined) {
        await redis.set(redisKey, serializedValue, 'PX', ttlMilliseconds);
        return;
      }

      await redis.set(redisKey, serializedValue);
    },
    delete: async (key) => {
      await redis.del(buildRedisMemoizeKey(keyPrefix, key));
    },
    clear: async () => {
      await deleteKeysByPattern(
        redis,
        `${keyPrefix}*`
      );
    },
  };
};
