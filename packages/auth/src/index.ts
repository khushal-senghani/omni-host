export * from './types.js';
export * from './password.js';
export { default as authPlugin } from './plugin.js';
export * from './strategies.js';

import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { buildJwtPreHandler, buildApiKeyPreHandler, noopPreHandler } from './strategies.js';

export function getAuthPreHandler(
    strategy: 'jwt' | 'apikey' | 'public',
    fastify: FastifyInstance
): preHandlerHookHandler {
    switch (strategy) {
        case 'jwt':
            return buildJwtPreHandler(fastify);
        case 'apikey':
            return buildApiKeyPreHandler(fastify);
        case 'public':
            return noopPreHandler();
        default:
            return buildJwtPreHandler(fastify); // fallback to JWT
    }
}