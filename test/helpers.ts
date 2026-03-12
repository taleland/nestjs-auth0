import { after, before } from 'node:test';
import { Test } from '@nestjs/testing';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import type { RedisOptions } from 'ioredis';
import { NestjsAuth0Module, type NestjsAuth0ModuleOptions } from '../src/index.js';
import { INTERNAL_NESTJS_AUTH0_SYMBOLS } from '../src/symbols.js';
import { limitManagementClient } from '../src/limit-management-client.js';

const REDIS_PORT = 6379;

export type TestManagementClient = {
  users: {
    get: (id: string) => Promise<unknown>;
    create?: (payload: { email: string }) => Promise<unknown>;
  };
};

let redis: StartedTestContainer | undefined;

export const buildRedisOptions = (
  redis: StartedTestContainer
): RedisOptions => ({
  host: redis.getHost(),
  port: redis.getMappedPort(REDIS_PORT),
});

export const buildModuleOptions = (
  options: Pick<NestjsAuth0ModuleOptions, 'memoize'>
): NestjsAuth0ModuleOptions => ({
  domain: 'test.auth0.com',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  ...options,
});

export const createTestingModule = async (
  options: NestjsAuth0ModuleOptions,
  fakeClient: TestManagementClient
) => {
  const moduleRef = await Test.createTestingModule({
    imports: [NestjsAuth0Module.register(options)],
  }).compile();
  const memoizeStorage = moduleRef.get(
    INTERNAL_NESTJS_AUTH0_SYMBOLS.memoizeStorage,
    { strict: false }
  );

  return {
    moduleRef,
    limitedClient: limitManagementClient(fakeClient, {
      memoize: {
        ...memoizeStorage,
        predicate: options.memoize.predicate,
      },
    }),
  };
};

export const getRedis = (): StartedTestContainer => {
  if (redis === undefined) {
    throw new Error('Redis test container is not initialized');
  }

  return redis;
};

export const registerTestHooks = () => {
  before(async () => {
    redis = await new GenericContainer('redis:8.6.0-alpine')
      .withWaitStrategy(
        Wait.forLogMessage('Ready to accept connections tcp')
      )
      .withExposedPorts(REDIS_PORT)
      .start();
  });

  after(async () => {
    if (redis !== undefined) {
      await redis.stop();
      redis = undefined;
    }
  });
};
