import { Provider } from '@nestjs/common';
import { AuthenticationClient } from 'auth0';
import { NestjsAuth0ModuleOptions } from './module.js';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS, NESTJS_AUTH0_SYMBOLS } from './symbols.js';
import { type LimitedClientMemoizeOptions, limitManagementClient } from './limit-management-client.js';
import type { Options } from 'p-memoize';

export const auth0AuthenticationClientProvider: Provider = {
  provide: NESTJS_AUTH0_SYMBOLS.authenticationClient,
  useFactory: (
    options: NestjsAuth0ModuleOptions,
    memoizeStorage: Options<any, unknown>
  ) => {
    const authClient = new AuthenticationClient({
      domain: options.domain,
      clientId: options.clientId,
    });

    return limitManagementClient(
      authClient,
      {
        throttle: options.throttle,
        memoize: {
          ...memoizeStorage,
          predicate: options.memoize.predicate,
        } satisfies LimitedClientMemoizeOptions,
      }
    );
  },
  inject: [
    NESTJS_AUTH0_SYMBOLS.moduleOptions,
    INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
  ],
};
