import pMemoize, { type Options } from 'p-memoize';
import pThrottle from 'p-throttle';
import type { MemoizePathPredicate, ThrottleOptions } from './module.js';

const isPromiseLike = (value: unknown): value is Promise<unknown> => {
  return typeof value === 'object' && value !== null && 'then' in value;
};

const DEFAULT_MEMOIZED_METHODS = new Set([
  'get',
  'getAll',
  'list',
  'listAll',
  'search',
]);

export type LimitedClientMemoizeOptions = Options<any, unknown> & {
  enabled?: boolean;
  predicate?: MemoizePathPredicate;
};

export const defaultMemoizePredicate: MemoizePathPredicate = (path) => {
  const method = path[path.length - 1];

  return typeof method === 'string' && DEFAULT_MEMOIZED_METHODS.has(method);
};

const shouldMemoizePath = (
  memoize: LimitedClientMemoizeOptions | false | undefined,
  path: readonly string[]
): memoize is LimitedClientMemoizeOptions => {
  if (!memoize || memoize.enabled === false) {
    return false;
  }

  return memoize.predicate?.(path) ?? defaultMemoizePredicate(path);
};

const createLimitedProxy = <T extends object>(
  target: T,
  throttle: ReturnType<typeof pThrottle>,
  memoize: LimitedClientMemoizeOptions | false | undefined,
  path: string[],
  proxiedObjects: WeakMap<object, object>,
  proxiedFunctions: WeakMap<object, Map<PropertyKey, Function>>
): T => {
  const existingProxy = proxiedObjects.get(target);

  if (existingProxy) {
    return existingProxy as T;
  }

  const proxy = new Proxy(target, {
    get (currentTarget, property, receiver) {
      const value = Reflect.get(currentTarget, property, receiver);

      if (typeof value === 'function') {
        const targetFunctions = proxiedFunctions.get(currentTarget) ?? new Map<PropertyKey, Function>();
        const existingFunctionProxy = targetFunctions.get(property);
        const functionPath = [...path, String(property)];

        if (existingFunctionProxy) {
          return existingFunctionProxy;
        }

        const execute = throttle(async (...args: unknown[]) => {
          const result = Reflect.apply(value, currentTarget, args);

          if (isPromiseLike(result)) {
            return result;
          }

          if (typeof result === 'object' && result !== null) {
            return createLimitedProxy(
              result,
              throttle,
              memoize,
              functionPath,
              proxiedObjects,
              proxiedFunctions
            );
          }

          return result;
        });

        const wrappedFunction = shouldMemoizePath(memoize, functionPath)
          ? pMemoize(execute, {
            ...memoize,
            cacheKey: (args) => JSON.stringify({
              path: functionPath,
              args,
            }),
          })
          : execute;

        targetFunctions.set(property, wrappedFunction);
        proxiedFunctions.set(currentTarget, targetFunctions);
        return wrappedFunction;
      }

      if (typeof value === 'object' && value !== null) {
        return createLimitedProxy(
          value,
          throttle,
          memoize,
          [...path, String(property)],
          proxiedObjects,
          proxiedFunctions
        );
      }

      return value;
    },
  });

  proxiedObjects.set(target, proxy);
  return proxy;
};

export const limitManagementClient = <T extends object>(
  managementClient: T,
  options: {
    throttle?: ThrottleOptions;
    memoize?: LimitedClientMemoizeOptions | false;
  } = {}
): T => {
  const throttle = pThrottle(options.throttle ?? {
    limit: 10,
    interval: 1000,
  });
  const proxiedObjects = new WeakMap<object, object>();
  const proxiedFunctions = new WeakMap<object, Map<PropertyKey, Function>>();

  return createLimitedProxy(
    managementClient,
    throttle,
    options.memoize,
    [],
    proxiedObjects,
    proxiedFunctions
  );
};
