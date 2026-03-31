import { type Provider } from '@nestjs/common';
import { Options } from 'p-memoize';
import { ManagementClient } from 'auth0';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import { NestjsAuth0ModuleOptions } from './module.js';
import { type LimitedClientMemoizeOptions, limitManagementClient } from './limit-management-client.js';

export const auth0ManagementClientProvider: Provider = {
  provide: INTERNAL_NESTJS_AUTH0_SYMBOLS.managementClient,
  useFactory: (
    options: NestjsAuth0ModuleOptions,
    memoizeStorage: Options<any, unknown>
  ) => {
    const managementClient = new ManagementClient({
      domain: options.domain,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
    });

    return limitManagementClient(
      managementClient,
      {
        throttle: options.throttle,
        ...(options.memoize
          ? {
              memoize: {
                ...memoizeStorage,
                predicate: options.memoize.predicate,
              } satisfies LimitedClientMemoizeOptions,
            }
          : {}),
      }
    );
  },
  inject: [
    INTERNAL_NESTJS_AUTH0_SYMBOLS.moduleOptions,
    INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
  ],
};
