import fp from 'fastify-plugin';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AppPlugin } from '@pap/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default fp(async (fastify) => {
    const appsDir = path.join(__dirname, '../../..');
    const appPaths = glob.sync('apps/*/src/index.ts', { cwd: appsDir, absolute: true });

    const registeredApps: string[] = [];

    for (const appPath of appPaths) {
        // Skip server itself
        if (appPath.includes('apps/server/')) continue;

        try {
            const appModule = await import(appPath);
            const app: AppPlugin = appModule.default;

            if (!app || !app.plugin || !app.prefix) {
                fastify.log.warn(`Invalid plugin export from ${appPath}`);
                continue;
            }

            await fastify.register(app.plugin as any, { prefix: app.prefix });
            registeredApps.push(app.name);
            fastify.log.info(`✅ Registered app: ${app.name} at ${app.prefix}`);

            // Store app metadata for health endpoint
            if (!fastify.appsMetadata) {
                fastify.appsMetadata = new Map();
            }
            fastify.appsMetadata.set(app.name, app.meta || {});
        } catch (error) {
            fastify.log.error(error as Error, `Failed to load app from ${appPath}:`);
        }
    }

    fastify.log.info(`Registered ${registeredApps.length} apps: ${registeredApps.join(', ')}`);

    // Make apps metadata available
    fastify.decorate('appsMetadata', new Map());
});

declare module 'fastify' {
    interface FastifyInstance {
        appsMetadata: Map<string, any>;
    }
}