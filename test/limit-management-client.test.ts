import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Redis } from 'ioredis';
import * as sinon from 'sinon';
import type { SinonStub } from 'sinon';
import { createRedisMemoizeCache } from '../src/ioredis-memoize-adapter.js';
import { limitManagementClient } from '../src/limit-management-client.js';
import {
  buildModuleOptions,
  buildRedisOptions,
  createTestingModule,
  getRedis,
  registerTestHooks,
  type TestManagementClient,
} from './helpers.js';

registerTestHooks();

const buildUsersGetStub = (
  sandbox: sinon.SinonSandbox
): SinonStub<[string], Promise<{ id: string; callCount: number }>> => {
  const usersGet = sandbox.stub<[string], Promise<{ id: string; callCount: number }>>();

  usersGet.callsFake(async (id: string) => ({
    id,
    callCount: usersGet.callCount,
  }));

  return usersGet;
};

const buildFakeClient = (
  usersGet: SinonStub<[string], Promise<{ id: string; callCount: number }>>
): TestManagementClient => ({
  users: {
    get: usersGet,
  },
});

const buildUsersCreateStub = (
  sandbox: sinon.SinonSandbox
): SinonStub<[{ email: string }], Promise<{ email: string; callCount: number }>> => {
  const usersCreate = sandbox.stub<
    [{ email: string }],
    Promise<{ email: string; callCount: number }>
  >();

  usersCreate.callsFake(async ({ email }) => ({
    email,
    callCount: usersCreate.callCount,
  }));

  return usersCreate;
};

test('limitManagementClient enforces configured throttle settings', async (t) => {
  const sandbox = sinon.createSandbox();
  const clock = sandbox.useFakeTimers();
  const usersGet = sandbox.stub<[string], Promise<{ id: string }>>();

  t.after(() => {
    sandbox.restore();
  });

  const fakeClient = {
    users: {
      get: usersGet.callsFake(async (id: string) => ({ id })),
    },
  };

  const limitedClient = limitManagementClient(fakeClient, {
    throttle: {
      limit: 2,
      interval: 100,
    },
  });

  const requests = Array.from(
    { length: 6 },
    (_, index) => limitedClient.users.get(`user-${index}`)
  );

  await clock.tickAsync(0);
  assert.equal(usersGet.callCount, 2);

  await clock.tickAsync(100);
  assert.equal(usersGet.callCount, 4);

  await clock.tickAsync(100);
  assert.equal(usersGet.callCount, 6);

  await Promise.all(requests);
});

test('limitManagementClient does not memoize when memoize is omitted', async (t) => {
  const sandbox = sinon.createSandbox();
  const usersGet = buildUsersGetStub(sandbox);
  const limitedClient = limitManagementClient(buildFakeClient(usersGet), {
    throttle: {
      limit: 2,
      interval: 100,
    },
  });
  const userId = randomUUID();

  t.after(() => {
    sandbox.restore();
  });

  const first = await limitedClient.users.get(userId);
  const second = await limitedClient.users.get(userId);

  assert.notDeepStrictEqual(first, second);
  assert.equal(usersGet.callCount, 2);
  assert.ok(usersGet.firstCall.calledWithExactly(userId));
  assert.ok(usersGet.secondCall.calledWithExactly(userId));
});

test('NestjsAuth0Module memoizes repeated calls with in-memory storage', async (t) => {
  const sandbox = sinon.createSandbox();
  const usersGet = buildUsersGetStub(sandbox);
  const { moduleRef, limitedClient } = await createTestingModule(
    buildModuleOptions({
      memoize: {
        type: 'in-memory',
      },
    }),
    buildFakeClient(usersGet)
  );

  t.after(async () => {
    sandbox.restore();
    await moduleRef.close();
  });

  const userId = randomUUID();
  const first = await limitedClient.users.get(userId);
  const second = await limitedClient.users.get(userId);

  assert.deepStrictEqual(first, second);
  assert.ok(usersGet.calledOnce);
  assert.ok(usersGet.calledWithExactly(userId));

  const nextModule = await createTestingModule(
    buildModuleOptions({
      memoize: {
        type: 'in-memory',
      },
    }),
    buildFakeClient(usersGet)
  );

  t.after(async () => {
    await nextModule.moduleRef.close();
  });

  await nextModule.limitedClient.users.get(userId);

  assert.ok(usersGet.calledTwice);
});

test('limitManagementClient does not memoize write methods by default', async (t) => {
  const sandbox = sinon.createSandbox();
  const usersCreate = buildUsersCreateStub(sandbox);
  const limitedClient = limitManagementClient({
    users: {
      create: usersCreate,
    },
  }, {
    memoize: {},
  });
  const payload = {
    email: 'memoize-write@example.com',
  };

  t.after(() => {
    sandbox.restore();
  });

  const first = await limitedClient.users.create(payload);
  const second = await limitedClient.users.create(payload);

  assert.notDeepStrictEqual(first, second);
  assert.equal(usersCreate.callCount, 2);
  assert.ok(usersCreate.firstCall.calledWithExactly(payload));
  assert.ok(usersCreate.secondCall.calledWithExactly(payload));
});

test('NestjsAuth0Module accepts a memoize predicate for custom paths', async (t) => {
  const sandbox = sinon.createSandbox();
  const usersCreate = buildUsersCreateStub(sandbox);
  const { moduleRef, limitedClient } = await createTestingModule(
    buildModuleOptions({
      memoize: {
        type: 'in-memory',
        predicate: (path) => path.join('.') === 'users.create',
      },
    }),
    {
      users: {
        get: sandbox.stub<[string], Promise<unknown>>().resolves({}),
        create: usersCreate,
      },
    }
  );
  const payload = {
    email: 'memoize-custom@example.com',
  };

  t.after(async () => {
    sandbox.restore();
    await moduleRef.close();
  });

  const first = await limitedClient.users.create!(payload);
  const second = await limitedClient.users.create!(payload);

  assert.deepStrictEqual(first, second);
  assert.ok(usersCreate.calledOnce);
  assert.ok(usersCreate.calledWithExactly(payload));
});

test('NestjsAuth0Module memoizes repeated calls with ioredis storage', async (t) => {
  const sandbox = sinon.createSandbox();
  const redisOptions = buildRedisOptions(getRedis());
  const userId = randomUUID();
  const firstUsersGet = buildUsersGetStub(sandbox);
  const firstModule = await createTestingModule(
    buildModuleOptions({
      memoize: {
        type: 'ioredis',
        redisOptions,
        ttlMilliseconds: 60_000,
      },
    }),
    buildFakeClient(firstUsersGet)
  );
  let firstModuleClosed = false;

  t.after(async () => {
    sandbox.restore();

    if (!firstModuleClosed) {
      await firstModule.moduleRef.close();
    }
  });

  const first = await firstModule.limitedClient.users.get(userId);
  const second = await firstModule.limitedClient.users.get(userId);

  assert.deepStrictEqual(first, second);
  assert.ok(firstUsersGet.calledOnce);
  assert.ok(firstUsersGet.calledWithExactly(userId));

  await firstModule.moduleRef.close();
  firstModuleClosed = true;

  const secondUsersGet = buildUsersGetStub(sandbox);
  const secondModule = await createTestingModule(
    buildModuleOptions({
      memoize: {
        type: 'ioredis',
        redisOptions,
        ttlMilliseconds: 60_000,
      },
    }),
    buildFakeClient(secondUsersGet)
  );

  t.after(async () => {
    await secondModule.moduleRef.close();
  });

  const cached = await secondModule.limitedClient.users.get(userId);

  assert.deepStrictEqual(cached, first);
  assert.ok(secondUsersGet.notCalled);
});

test('createRedisMemoizeCache stores undefined values without breaking Redis writes', async (t) => {
  const redis = new Redis(buildRedisOptions(getRedis()));
  const cache = createRedisMemoizeCache(redis, 60_000);
  const key = randomUUID();

  t.after(async () => {
    await cache.delete(key);
    redis.disconnect();
  });

  await cache.set(key, undefined);

  assert.equal(await cache.has(key), true);
  assert.equal(await cache.get(key), undefined);
});

test('createRedisMemoizeCache clear only removes cache-owned keys', async (t) => {
  const redis = new Redis(buildRedisOptions(getRedis()));
  const cache = createRedisMemoizeCache(
    redis,
    60_000,
    `nestjs-auth0:test:${randomUUID()}:`
  );
  const cacheKey = randomUUID();
  const foreignKey = `foreign:${randomUUID()}`;

  t.after(async () => {
    await cache.delete(cacheKey);
    await redis.del(foreignKey);
    redis.disconnect();
  });

  await cache.set(cacheKey, { cached: true });
  await redis.set(foreignKey, 'keep-me');

  await cache.clear!();

  assert.equal(await cache.has(cacheKey), false);
  assert.equal(await cache.get(cacheKey), undefined);
  assert.equal(await redis.get(foreignKey), 'keep-me');
});
