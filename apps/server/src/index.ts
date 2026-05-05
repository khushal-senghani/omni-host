import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env, envSchema, mergeEnvSchemas } from '@pap/config';
import { authPlugin, getAuthPreHandler } from '@pap/auth';
import { connectDB, discoverApps, PluginRegistry, createScopedDb } from '@pap/core';
import { createAppLogger } from '@pap/logger';
import errorHandlerPlugin from './plugins/error-handler.js';
import requestIdPlugin from './plugins/requestId.js';
import { systemRoutes } from './routes/system.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Base Plugins
await fastify.register(requestIdPlugin);
await fastify.register(helmet);

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

// Auth plugin (Base JWT setup)
await fastify.register(authPlugin);

// Error handling
await fastify.register(errorHandlerPlugin);

// Connect to MongoDB
await connectDB();

// ------------------------------------------------------------------
// FRAMEWORK: App Discovery and Registration
// ------------------------------------------------------------------
const appsDir = path.join(__dirname, '../../');
const results = await discoverApps(appsDir);
const registry = new PluginRegistry();

// Type augmentation for registry
declare module 'fastify' {
    interface FastifyInstance {
        registry: PluginRegistry;
    }
}
fastify.decorate('registry', registry);

// Environment Validation
const appSchemas = new Map();
for (const res of results) {
    if (res.status === 'loaded' && res.plugin.env) {
        appSchemas.set(res.plugin.name, res.plugin.env);
    }
}

try {
    mergeEnvSchemas(envSchema, appSchemas);
} catch (err: any) {
    fastify.log.error(err.message);
    process.exit(1);
}

// Register apps
for (const result of results) {
    registry.register(result);
    if (result.status === 'loaded') {
        const appPlugin = result.plugin;
        
        await fastify.register(async (app) => {
            // Setup scoped logger
            app.log = createAppLogger(appPlugin.name, app.log);
            
            // Setup scoped DB
            if (appPlugin.db) {
                app.decorate('db', { scoped: () => createScopedDb(appPlugin.name) });
            }
            
            // Setup Multi-Strategy Auth
            app.decorate('authenticate', getAuthPreHandler(appPlugin.meta.auth, app) as any);
            
            // Setup Rate Limiting
            if (appPlugin.meta.rateLimit) {
                await app.register(rateLimit, appPlugin.meta.rateLimit);
            } else {
                await app.register(rateLimit, {
                    max: parseInt(env.RATE_LIMIT_MAX),
                    timeWindow: parseInt(env.RATE_LIMIT_TIME_WINDOW),
                });
            }
            
            // Setup CORS
            if (appPlugin.meta.cors) {
                await app.register(cors, appPlugin.meta.cors);
            } else {
                await app.register(cors, {
                    origin: isDev ? true : env.CORS_ORIGIN?.split(',') || [],
                    credentials: true,
                });
            }
            
            // Finally register the actual plugin logic
            await app.register(appPlugin.plugin);
        }, { prefix: appPlugin.prefix });
    }
}

// Register System Routes
await fastify.register(systemRoutes);

// App Lifecycle Hooks
fastify.addHook('onReady', async () => {
    for (const app of registry.getLoaded()) {
        if (app.hooks?.onReady) {
            await app.hooks.onReady(fastify);
        }
    }
});

fastify.addHook('onClose', async () => {
    for (const app of registry.getLoaded()) {
        if (app.hooks?.onClose) {
            await app.hooks.onClose(fastify);
        }
    }
});

// Graceful Shutdown on SIGINT / SIGTERM
const gracefulShutdown = async () => {
    fastify.log.info('Received shutdown signal, closing fastify server...');
    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
try {
    await fastify.listen({ port: parseInt(env.PORT), host: env.HOST });
    fastify.log.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    fastify.log.info(`📚 API docs available at http://${env.HOST}:${env.PORT}/docs`);
} catch (error) {
    fastify.log.error(error);
    process.exit(1);
}