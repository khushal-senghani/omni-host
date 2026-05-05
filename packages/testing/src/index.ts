import fastify, { type FastifyInstance } from 'fastify';
import mongoose, { type Connection } from 'mongoose';
import type { AppPlugin } from '@pap/core';
import { getAuthPreHandler } from '@pap/auth';

export async function buildTestApp(plugin: AppPlugin): Promise<FastifyInstance> {
    const app = fastify();

    // Mock DB setup using Mongoose useDb for scoped testing
    const testDbName = `test_${plugin.name}_${Date.now()}`;
    const scopedDb = mongoose.connection.useDb(testDbName);
    
    // In test environment, we might want to attach a fake DB connection or similar if the plugin expects it
    if (plugin.db) {
        app.decorate('db', {
            scoped: () => scopedDb
        });
    }

    // Mock authenticate decorator
    // In test mode, we might just pass through or use a special test handler
    app.decorate('authenticate', getAuthPreHandler('public', app) as any); // Default to public for tests, or create a mock JWT one

    // Register the plugin
    await app.register(plugin.plugin, { prefix: plugin.prefix });

    await app.ready();
    return app;
}

export function mockAuth(userId: string, _role?: string): { Authorization: string } {
    // Return a mock Authorization header.
    // In a real testing package you'd sign a JWT using a test secret here
    return {
        Authorization: `Bearer test-token-${userId}`
    };
}

export async function seedDb(connection: Connection, fixtures: Record<string, unknown[]>): Promise<void> {
    for (const [modelName, data] of Object.entries(fixtures)) {
        const Model = connection.model(modelName);
        if (Model) {
            await Model.insertMany(data);
        }
    }
}
