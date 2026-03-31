import { Inject, Injectable, Optional, type OnApplicationShutdown, type Provider } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { type NestjsAuth0ModuleOptions } from './module.js';
import { NESTJS_AUTH0_SYMBOLS } from './symbols.js';

export const redisProvider: Provider = {
  provide: NESTJS_AUTH0_SYMBOLS.redis,
  useFactory: async (options: NestjsAuth0ModuleOptions) => {
    const memoize = options.memoize;

    if (!memoize || memoize.type !== 'ioredis') {
      return;
    }

    const { Redis } = await import('ioredis');

    return new Redis(memoize.redisOptions);
  },
  inject: [NESTJS_AUTH0_SYMBOLS.moduleOptions],
};

type DisconnectableRedis = Pick<Redis, 'disconnect'>;

@Injectable()
export class RedisShutdown implements OnApplicationShutdown {
  public constructor (
    @Optional()
    @Inject(NESTJS_AUTH0_SYMBOLS.redis)
    private readonly redis?: DisconnectableRedis
  ) {}

  public onApplicationShutdown () {
    this.redis?.disconnect();
  }
}
