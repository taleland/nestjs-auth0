import { type Provider } from '@nestjs/common';
import { type Options } from 'p-memoize';
import {
  createRedisMemoizeCache,
} from './ioredis-memoize-adapter.js';
import type { Redis } from 'ioredis';
import type { MemoizeOptions, NestjsAuth0ModuleOptions } from './module.js';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import type { Auth0CacheMetrics } from './metrics.js';

const resolveMemoizeOptions = (
  memoize: MemoizeOptions,
  redis?: Redis,
  metrics?: Auth0CacheMetrics
): Options<any, unknown> => {
  if (memoize.type === 'in-memory') {
    return {};
  }

  if (!redis) {
    throw new Error('Redis instance is required when ioredis memoize is enabled');
  }

  return {
    cache: createRedisMemoizeCache(redis, memoize.ttlMilliseconds, undefined, metrics),
  };
};

export const memoizeStorageProvider: Provider = {
  provide: INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
  useFactory: (
    options: NestjsAuth0ModuleOptions,
    redis?: Redis,
    metrics?: Auth0CacheMetrics
  ) => {
    return resolveMemoizeOptions(options.memoize, redis, metrics);
  },
  inject: [
    INTERNAL_NESTJS_AUTH0_SYMBOLS.moduleOptions,
    INTERNAL_NESTJS_AUTH0_SYMBOLS.redis,
    { token: INTERNAL_NESTJS_AUTH0_SYMBOLS.cacheMetrics, optional: true },
  ],
};
