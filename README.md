# `@taleland/nestjs-auth0`

NestJS Auth0 module for the Auth0 SDK.

It provides Auth0 clients for NestJS, plus request throttling and optional memoization with in-memory or Redis-backed storage.

It gives you:

- a global Nest module that wires `ManagementClient` and `AuthenticationClient`
- request throttling for the Auth0 management client
- optional memoization for safe read methods with either in-memory storage or Redis
- automatic Redis disconnect on Nest application shutdown
- small helpers for paginated Auth0 SDK methods

## Install

```bash
npm install @taleland/nestjs-auth0 auth0
```

If you want Redis-backed memoization:

```bash
npm install ioredis
```

`ioredis` is an optional peer dependency. You only need to install it when you configure `memoize.type` as `'ioredis'`.

## Usage

### Register the module

```ts
import {Module} from '@nestjs/common';
import {NestjsAuth0Module} from '@taleland/nestjs-auth0';

@Module({
	imports: [
		NestjsAuth0Module.register({
			domain: process.env.AUTH0_DOMAIN!,
			clientId: process.env.AUTH0_CLIENT_ID!,
			clientSecret: process.env.AUTH0_CLIENT_SECRET!,
			memoize: {
				type: 'in-memory',
				predicate: (path) => path.join('.') === 'users.get',
			},
		}),
	],
})
export class AppModule {}
```

`NestjsAuth0Module` is global, so you only need to register it once.

`memoize` is optional. If you omit it, the management client will still be throttled, but no responses will be cached.

## Features

### Inject the management client

The management client is wrapped with throttling and memoization for safe read methods.

```ts
import {Inject, Injectable} from '@nestjs/common';
import type {ManagementClient} from 'auth0';
import {NESTJS_AUTH0_SYMBOLS} from '@taleland/nestjs-auth0';

@Injectable()
export class UsersService {
	public constructor(
		@Inject(NESTJS_AUTH0_SYMBOLS.managementClient)
		private readonly managementClient: ManagementClient,
	) {}

	public async getUser(userId: string) {
		return this.managementClient.users.get(userId);
	}
}
```

### Inject the authentication client

The authentication client is exposed as a regular `AuthenticationClient`.

```ts
import {Inject, Injectable} from '@nestjs/common';
import type {AuthenticationClient} from 'auth0';
import {NESTJS_AUTH0_SYMBOLS} from '@taleland/nestjs-auth0';

@Injectable()
export class AuthService {
	public constructor(
		@Inject(NESTJS_AUTH0_SYMBOLS.authenticationClient)
		private readonly authenticationClient: AuthenticationClient,
	) {}

	public getClient() {
		return this.authenticationClient;
	}
}
```

### Inject the resolved module options

The registered options are also available as a provider.

```ts
import {Inject, Injectable} from '@nestjs/common';
import {
	NESTJS_AUTH0_SYMBOLS,
	type NestjsAuth0ModuleOptions,
} from '@taleland/nestjs-auth0';

@Injectable()
export class Auth0ConfigService {
	public constructor(
		@Inject(NESTJS_AUTH0_SYMBOLS.moduleOptions)
		private readonly options: NestjsAuth0ModuleOptions,
	) {}

	public getDomain() {
		return this.options.domain;
	}
}
```

## Memoization

### In-memory memoization

Use in-memory memoization when you only need caching inside a single app instance.

```ts
NestjsAuth0Module.register({
	domain: process.env.AUTH0_DOMAIN!,
	clientId: process.env.AUTH0_CLIENT_ID!,
	clientSecret: process.env.AUTH0_CLIENT_SECRET!,
	memoize: {
		type: 'in-memory',
		predicate: (path) => path.join('.') === 'users.get',
	},
});
```

`memoize.predicate` is required and decides which nested management client methods are cached.

### Redis memoization

Use Redis memoization when you want cache sharing across multiple app instances.

```ts
NestjsAuth0Module.register({
	domain: process.env.AUTH0_DOMAIN!,
	clientId: process.env.AUTH0_CLIENT_ID!,
	clientSecret: process.env.AUTH0_CLIENT_SECRET!,
	memoize: {
		type: 'ioredis',
		redisOptions: {
			host: process.env.REDIS_HOST!,
			port: Number(process.env.REDIS_PORT!),
			password: process.env.REDIS_PASSWORD,
		},
		ttlMilliseconds: 60_000,
		predicate: (path) => path.join('.') === 'users.get',
	},
});
```

When `memoize.type === 'ioredis'`:

- a Redis client is created automatically
- the memoization cache is backed by Redis
- the Redis connection is disconnected on `onApplicationShutdown`

When `memoize.type === 'in-memory'`, no Redis provider is created and `ioredis` is not imported at runtime.

### Custom memoization predicate

Provide `memoize.predicate` to opt specific nested method paths into memoization.

```ts
NestjsAuth0Module.register({
	domain: process.env.AUTH0_DOMAIN!,
	clientId: process.env.AUTH0_CLIENT_ID!,
	clientSecret: process.env.AUTH0_CLIENT_SECRET!,
	memoize: {
		type: 'in-memory',
		predicate: (path) => path.join('.') === 'users.get',
	},
});
```

The predicate receives the nested method path, for example `['users', 'get']`.

## Throttling

The management client is throttled by default.

Default values:

- `limit: 10`
- `interval: 1000`

You can override them:

```ts
NestjsAuth0Module.register({
	domain: process.env.AUTH0_DOMAIN!,
	clientId: process.env.AUTH0_CLIENT_ID!,
	clientSecret: process.env.AUTH0_CLIENT_SECRET!,
	memoize: {
		type: 'in-memory',
	},
	throttle: {
		limit: 2,
		interval: 100,
	},
});
```

## Helpers

### `drain()`

`drain()` is a small helper for Auth0-style paginated methods that return `{data}` and accept `{page, per_page}`.

```ts
import {drain} from '@taleland/nestjs-auth0';

const roles = await drain((params) =>
	managementClient.users.roles.list(userId, params),
);
```

You can also override `perPage`:

```ts
const permissions = await drain(
	(params) => managementClient.roles.permissions.list(roleId, params),
	{perPage: 50},
);
```

## Tokens

Available DI tokens:

```ts
NESTJS_AUTH0_SYMBOLS.moduleOptions
NESTJS_AUTH0_SYMBOLS.managementClient
NESTJS_AUTH0_SYMBOLS.authenticationClient
NESTJS_AUTH0_SYMBOLS.redis
```

## Notes

- The management client wrapper applies throttling recursively and memoization only to paths allowed by the configured predicate.
- Redis-backed memoization lets multiple app instances share the same cache.
- The Redis provider is only created when you configure `memoize.type` as `'ioredis'`.
- `ioredis` remains optional for consumers that only use in-memory memoization.

## License

Apache-2.0
