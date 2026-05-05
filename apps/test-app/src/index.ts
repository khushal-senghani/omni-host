import fp from 'fastify-plugin';
import type { AppPlugin } from '@pap/core';
import { envSchema } from './env.js';
import { registerRoutes } from './routes.js';

const plugin = fp(async (fastify) => {
  await registerRoutes(fastify);
});

export default {
  name: 'test-app',
  prefix: '/test-app',
  plugin,
  env: envSchema,
  db: false,
  meta: {
    displayName: 'Test App',
    description: 'Description of test-app',
    version: '0.1.0',
    auth: 'jwt',
  },
} satisfies AppPlugin;
