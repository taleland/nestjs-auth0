import { Provider } from '@nestjs/common';
import { AuthenticationClient } from 'auth0';
import { NestjsAuth0ModuleOptions } from './module.js';
import { NESTJS_AUTH0_SYMBOLS } from './symbols.js';

export const auth0AuthenticationClientProvider: Provider = {
  provide: NESTJS_AUTH0_SYMBOLS.authenticationClient,
  useFactory: (options: NestjsAuth0ModuleOptions) => {
    return new AuthenticationClient({
      domain: options.domain,
      clientId: options.clientId,
    });
  },
  inject: [NESTJS_AUTH0_SYMBOLS.moduleOptions],
};
