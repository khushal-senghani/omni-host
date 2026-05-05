import type { FastifyBaseLogger } from 'fastify';

export function createAppLogger(appName: string, base: FastifyBaseLogger): FastifyBaseLogger {
    return base.child({ app: appName });
}
