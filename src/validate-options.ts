import type { NestjsAuth0ModuleOptions } from './module.js';

const assertNonEmptyString = (value: unknown, fieldName: string): void => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `[NestjsAuth0Module] Configuration error: "${fieldName}" must be a non-empty string, got ${JSON.stringify(value)}`
    );
  }
};

export const validateModuleOptions = (options: NestjsAuth0ModuleOptions): void => {
  assertNonEmptyString(options.domain, 'domain');
  assertNonEmptyString(options.clientId, 'clientId');
  assertNonEmptyString(options.clientSecret, 'clientSecret');

  if (!options.memoize || typeof options.memoize.type !== 'string') {
    throw new Error(
      '[NestjsAuth0Module] Configuration error: "memoize.type" must be either "in-memory" or "ioredis"'
    );
  }

  if (options.memoize.type === 'ioredis' && !options.memoize.redisOptions) {
    throw new Error(
      '[NestjsAuth0Module] Configuration error: "memoize.redisOptions" is required when memoize.type is "ioredis"'
    );
  }

  if (options.throttle !== undefined) {
    if (
      typeof options.throttle.limit !== 'number' ||
      options.throttle.limit <= 0
    ) {
      throw new Error(
        '[NestjsAuth0Module] Configuration error: "throttle.limit" must be a positive number'
      );
    }

    if (
      typeof options.throttle.interval !== 'number' ||
      options.throttle.interval <= 0
    ) {
      throw new Error(
        '[NestjsAuth0Module] Configuration error: "throttle.interval" must be a positive number'
      );
    }
  }
};
