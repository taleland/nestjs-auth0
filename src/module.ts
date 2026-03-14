import { DynamicModule, Injectable, Inject, Optional, OnApplicationShutdown } from '@nestjs/common';
import type { Options } from 'p-memoize';
import type { RedisOptions } from 'ioredis';
import type { Redis } from 'ioredis';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS, NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import { auth0ManagementClientProvider } from './managment-client.js';
import { auth0AuthenticationClientProvider } from './auth-client.js';
import { memoizeStorageProvider } from './memoize-storage.js';
import { RedisShutdown, redisProvider } from './redis.js';
import { getNestjsAuth0Symbols } from './named-symbols.js';
import { ManagementClient, AuthenticationClient } from 'auth0';
import { type LimitedClientMemoizeOptions, limitManagementClient } from './limit-management-client.js';
import { createRedisMemoizeCache } from './ioredis-memoize-adapter.js';

export type ThrottleOptions = {
  limit: number;
  interval: number;
};

export type MemoizePath = readonly string[];
export type MemoizePathPredicate = (path: MemoizePath) => boolean;

export type MemoizeOptions =
  | {
    type: 'in-memory';
    predicate?: MemoizePathPredicate;
  }
  | {
    type: 'ioredis';
    redisOptions: RedisOptions;
    ttlMilliseconds?: number;
    predicate?: MemoizePathPredicate;
  };

export interface NestjsAuth0ModuleOptions {
  domain: string;
  clientId: string;
  clientSecret: string;
  memoize: MemoizeOptions;
  throttle?: ThrottleOptions;
}

export class NestjsAuth0Module {
  public static register (options: NestjsAuth0ModuleOptions): DynamicModule {
    const memoizeProviders =
      options.memoize.type === 'ioredis'
        ? [redisProvider, memoizeStorageProvider, RedisShutdown]
        : [
            {
              provide: INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
              useValue: {} satisfies Options<any, unknown>,
            },
          ];

    return {
      module: NestjsAuth0Module,
      global: true,
      providers: [
        {
          provide: NESTJS_AUTH0_SYMBOLS.moduleOptions,
          useValue: Object.freeze({
            ...options,
            throttle: options.throttle ?? {
              limit: 10,
              interval: 1000,
            },
          }),
        },
        ...memoizeProviders,
        auth0ManagementClientProvider,
        auth0AuthenticationClientProvider,
      ],
      exports: [
        NESTJS_AUTH0_SYMBOLS.managementClient,
        NESTJS_AUTH0_SYMBOLS.authenticationClient,
        NESTJS_AUTH0_SYMBOLS.moduleOptions,
      ],
    };
  }

  public static registerNamed (name: string, options: NestjsAuth0ModuleOptions): DynamicModule {
    const symbols = getNestjsAuth0Symbols(name);
    const frozenOptions = Object.freeze({
      ...options,
      throttle: options.throttle ?? { limit: 10, interval: 1000 },
    });

    const namedRedisProvider = {
      provide: symbols.redis,
      useFactory: async (opts: NestjsAuth0ModuleOptions) => {
        if (opts.memoize.type !== 'ioredis') {
          return;
        }

        const { Redis } = await import('ioredis');

        return new Redis(opts.memoize.redisOptions);
      },
      inject: [symbols.moduleOptions],
    };

    const namedMemoizeStorageProvider = {
      provide: symbols.memoizeStorage,
      useFactory: (opts: NestjsAuth0ModuleOptions, redis?: Redis): Options<any, unknown> => {
        if (opts.memoize.type === 'in-memory') {
          return {};
        }

        if (!redis) {
          throw new Error('Redis instance is required when ioredis memoize is enabled');
        }

        return {
          cache: createRedisMemoizeCache(redis, opts.memoize.ttlMilliseconds),
        };
      },
      inject: [symbols.moduleOptions, symbols.redis],
    };

    const namedManagementClientProvider = {
      provide: symbols.managementClient,
      useFactory: (opts: NestjsAuth0ModuleOptions, memoizeStorage: Options<any, unknown>) => {
        const managementClient = new ManagementClient({
          domain: opts.domain,
          clientId: opts.clientId,
          clientSecret: opts.clientSecret,
        });

        return limitManagementClient(managementClient, {
          throttle: opts.throttle,
          memoize: {
            ...memoizeStorage,
            predicate: opts.memoize.predicate,
          } satisfies LimitedClientMemoizeOptions,
        });
      },
      inject: [symbols.moduleOptions, symbols.memoizeStorage],
    };

    const namedAuthClientProvider = {
      provide: symbols.authenticationClient,
      useFactory: (opts: NestjsAuth0ModuleOptions) => {
        return new AuthenticationClient({
          domain: opts.domain,
          clientId: opts.clientId,
        });
      },
      inject: [symbols.moduleOptions],
    };

    @Injectable()
    class NamedRedisShutdown implements OnApplicationShutdown {
      public constructor (
        @Optional()
        @Inject(symbols.redis)
        private readonly redis?: Pick<Redis, 'disconnect'>
      ) {}

      public onApplicationShutdown () {
        this.redis?.disconnect();
      }
    }

    return {
      module: NestjsAuth0Module,
      global: false,
      providers: [
        {
          provide: symbols.moduleOptions,
          useValue: frozenOptions,
        },
        namedRedisProvider,
        namedMemoizeStorageProvider,
        NamedRedisShutdown,
        namedManagementClientProvider,
        namedAuthClientProvider,
      ],
      exports: [
        symbols.managementClient,
        symbols.authenticationClient,
        symbols.moduleOptions,
      ],
    };
  }
}
