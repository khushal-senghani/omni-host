import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import { ApiKey } from '@pap/core';

export function buildJwtPreHandler(_fastify: FastifyInstance): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing JWT' });
            throw err;
        }
    };
}

export function buildApiKeyPreHandler(_fastify: FastifyInstance): preHandlerHookHandler {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const key = request.headers['x-api-key'] as string;
        if (!key) {
            reply.status(401).send({ error: 'Unauthorized', message: 'Missing X-API-Key header' });
            throw new Error('Missing X-API-Key header');
        }

        const apiKeyRecord = await ApiKey.findOne({ key, revoked: false });
        if (!apiKeyRecord) {
            reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or revoked API key' });
            throw new Error('Invalid or revoked API key');
        }

        if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
            reply.status(401).send({ error: 'Unauthorized', message: 'API key expired' });
            throw new Error('API key expired');
        }

        // Attach generic auth user info based on API key if available
        // Note: For API keys, the context might be different (e.g. app context vs user context)
        request.user = { id: apiKeyRecord.userId?.toString() || 'api-key-user' } as any;
    };
}

export function noopPreHandler(): preHandlerHookHandler {
    return async () => {
        // Pass through
    };
}
