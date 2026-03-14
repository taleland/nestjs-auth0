import { DynamicModule, FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type { Options } from 'p-memoize';
import type { RedisOptions } from 'ioredis';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS, NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import { auth0ManagementClientProvider } from './managment-client.js';
import { auth0AuthenticationClientProvider } from './auth-client.js';
import { memoizeStorageProvider } from './memoize-storage.js';
import { RedisShutdown, redisProvider } from './redis.js';

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

export interface NestjsAuth0ModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: unknown[]) => Promise<NestjsAuth0ModuleOptions> | NestjsAuth0ModuleOptions;
  inject?: FactoryProvider['inject'];
}

const withDefaults = (options: NestjsAuth0ModuleOptions): Readonly<NestjsAuth0ModuleOptions> =>
  Object.freeze({
    ...options,
    throttle: options.throttle ?? { limit: 10, interval: 1000 },
  });

const MODULE_EXPORTS = [
  NESTJS_AUTH0_SYMBOLS.managementClient,
  NESTJS_AUTH0_SYMBOLS.authenticationClient,
  NESTJS_AUTH0_SYMBOLS.moduleOptions,
];

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
          useValue: withDefaults(options),
        },
        ...memoizeProviders,
        auth0ManagementClientProvider,
        auth0AuthenticationClientProvider,
      ],
      exports: MODULE_EXPORTS,
    };
  }

  public static registerAsync (asyncOptions: NestjsAuth0ModuleAsyncOptions): DynamicModule {
    const optionsProvider: FactoryProvider = {
      provide: NESTJS_AUTH0_SYMBOLS.moduleOptions,
      useFactory: async (...args: unknown[]) => {
        const options = await asyncOptions.useFactory(...args);

        return withDefaults(options);
      },
      inject: asyncOptions.inject ?? [],
    };

    return {
      module: NestjsAuth0Module,
      global: true,
      imports: asyncOptions.imports ?? [],
      providers: [
        optionsProvider,
        redisProvider,
        memoizeStorageProvider,
        RedisShutdown,
        auth0ManagementClientProvider,
        auth0AuthenticationClientProvider,
      ],
      exports: MODULE_EXPORTS,
    };
  }
}
