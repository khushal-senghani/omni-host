import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '@pap/config';
import { authPlugin } from '@pap/auth';
import { connectDB, db } from '@pap/core';
import registryPlugin from './plugins/registry.js';
import errorHandlerPlugin from './plugins/error-handler.js';

const isDev = env.NODE_ENV === 'development';

const fastify = Fastify({
    logger: {
        level: env.LOG_LEVEL,
        transport: {
            targets: [
                ...(isDev ? [{
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
                }] : []),
                {
                    target: 'pino-roll',
                    options: { file: './logs/server', frequency: 'daily', mkdir: true }
                }
            ]
        }
    },
    trustProxy: true,
});

// Plugins
await fastify.register(helmet);
await fastify.register(cors, {
    origin: isDev ? true : env.CORS_ORIGIN?.split(',') || [],
    credentials: true,
});

await fastify.register(rateLimit, {
    max: parseInt(env.RATE_LIMIT_MAX),
    timeWindow: parseInt(env.RATE_LIMIT_TIME_WINDOW),
});

// Swagger documentation
await fastify.register(swagger, {
    openapi: {
        info: {
            title: 'Personal App Platform API',
            version: '0.1.0',
            description: 'Self-hosted central server for modular applications',
        },
        servers: [{ url: `http://localhost:${env.PORT}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
});

await fastify.register(swaggerUi, {
    routePrefix: '/docs',
});

// Auth plugin
await fastify.register(authPlugin);

// Error handling
await fastify.register(errorHandlerPlugin);

// Connect to MongoDB
await connectDB();

// Health check endpoint
fastify.get('/health', async () => {
    // db is mongoose.connection — readyState 1 means connected
    const dbStatus = db.readyState === 1 ? 'ok' : 'error';

    const apps = Array.from(fastify.appsMetadata.entries()).map(([name, meta]) => ({
        name,
        ...meta,
    }));

    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        registeredApps: apps,
    };
});

// Root endpoint
fastify.get('/', async () => ({
    name: 'Personal App Platform',
    version: '0.1.0',
    documentation: '/docs',
    health: '/health',
}));

// Register all apps
await fastify.register(registryPlugin);

// Start server
try {
    await fastify.listen({ port: parseInt(env.PORT), host: env.HOST });
    fastify.log.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    fastify.log.info(`📚 API docs available at http://${env.HOST}:${env.PORT}/docs`);
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}