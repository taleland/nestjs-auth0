export type NestjsAuth0TenantSymbols = {
  moduleOptions: symbol;
  managementClient: symbol;
  authenticationClient: symbol;
  redis: symbol;
  memoizeStorage: symbol;
};

const cache = new Map<string, NestjsAuth0TenantSymbols>();

export const getNestjsAuth0Symbols = (name: string): NestjsAuth0TenantSymbols => {
  const existing = cache.get(name);

  if (existing) {
    return existing;
  }

  const symbols: NestjsAuth0TenantSymbols = {
    moduleOptions: Symbol.for(`@b2base/nestjs-auth0/${name}/module/options`),
    managementClient: Symbol.for(`@b2base/nestjs-auth0/${name}/management-client`),
    authenticationClient: Symbol.for(`@b2base/nestjs-auth0/${name}/authentication-client`),
    redis: Symbol.for(`@b2base/nestjs-auth0/${name}/redis`),
    memoizeStorage: Symbol.for(`@b2base/nestjs-auth0/${name}/memoize-storage`),
  };

  cache.set(name, symbols);
  return symbols;
};
