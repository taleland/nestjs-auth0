const moduleOptions = Symbol.for('@b2base/nestjs-auth0/module/options');
const memoizeStorage = Symbol.for('@b2base/nestjs-auth0/memoize-storage');
const managementClient = Symbol.for('@b2base/nestjs-auth0/management-client');
const authenticationClient = Symbol.for('@b2base/nestjs-auth0/authentication-client');
const redis = Symbol.for('@b2base/nestjs-auth0/redis');

export const NESTJS_AUTH0_SYMBOLS = {
  moduleOptions,
  managementClient,
  authenticationClient,
  redis,
};

export const INTERNAL_NESTJS_AUTH0_SYMBOLS = {
  ...NESTJS_AUTH0_SYMBOLS,
  memoizeStorage,
};
