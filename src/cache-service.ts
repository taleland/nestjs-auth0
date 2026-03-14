import { Inject, Injectable, Optional } from '@nestjs/common';
import type { CacheStorage } from 'p-memoize';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import type { MemoizePath } from './module.js';

@Injectable()
export class Auth0CacheService {
  public constructor (
    @Optional()
    @Inject(INTERNAL_NESTJS_AUTH0_SYMBOLS.cacheStorage)
    private readonly storage?: CacheStorage<string, unknown>
  ) {}

  public async invalidateAll (): Promise<void> {
    await this.storage?.clear?.();
  }

  public async invalidate (path: MemoizePath, ...args: unknown[]): Promise<void> {
    if (!this.storage) {
      return;
    }

    const key = JSON.stringify({ path, args });

    await this.storage.delete(key);
  }
}
