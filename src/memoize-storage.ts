import { type Provider } from '@nestjs/common';
import { type Options } from 'p-memoize';
import {
  createRedisMemoizeCache,
} from './ioredis-memoize-adapter.js';
import type { Redis } from 'ioredis';
import type { CacheStorage } from 'p-memoize';
import type { MemoizeOptions, NestjsAuth0ModuleOptions } from './module.js';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS } from './symbols.js';

type ResolvedMemoize = {
  memoizeOptions: Options<any, unknown>;
  cacheStorage?: CacheStorage<string, unknown>;
};

const resolveMemoize = (
  memoize: MemoizeOptions,
  redis?: Redis
): ResolvedMemoize => {
  if (memoize.type === 'in-memory') {
    const store = new Map<string, unknown>();
    const cacheStorage: CacheStorage<string, unknown> = {
      has: (key) => store.has(key),
      get: (key) => store.get(key),
      set: (key, value) => { store.set(key, value); },
      delete: (key) => { store.delete(key); },
      clear: () => { store.clear(); },
    };

    return {
      memoizeOptions: { cache: cacheStorage },
      cacheStorage,
    };
  }

  if (!redis) {
    throw new Error('Redis instance is required when ioredis memoize is enabled');
  }

  const cacheStorage = createRedisMemoizeCache(redis, memoize.ttlMilliseconds);

  return {
    memoizeOptions: { cache: cacheStorage },
    cacheStorage,
  };
};

export const memoizeStorageProvider: Provider = {
  provide: INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
  useFactory: (
    options: NestjsAuth0ModuleOptions,
    redis?: Redis
  ): Options<any, unknown> => {
    return resolveMemoize(options.memoize, redis).memoizeOptions;
  },
  inject: [
    INTERNAL_NESTJS_AUTH0_SYMBOLS.moduleOptions,
    INTERNAL_NESTJS_AUTH0_SYMBOLS.redis,
  ],
};

export const cacheStorageProvider: Provider = {
  provide: INTERNAL_NESTJS_AUTH0_SYMBOLS.cacheStorage,
  useFactory: (
    options: NestjsAuth0ModuleOptions,
    redis?: Redis
  ): CacheStorage<string, unknown> | undefined => {
    return resolveMemoize(options.memoize, redis).cacheStorage;
  },
  inject: [
    INTERNAL_NESTJS_AUTH0_SYMBOLS.moduleOptions,
    INTERNAL_NESTJS_AUTH0_SYMBOLS.redis,
  ],
};
