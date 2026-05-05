import type { FastifyPluginAsync } from 'fastify';
import type { PluginRegistry, LoadResult } from '@pap/core';

declare module 'fastify' {
    interface FastifyInstance {
        registry: PluginRegistry;
    }
}

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
    // We bind this directly, bypassing auth decorator if we want it public
    fastify.get('/system/health', async () => {
        const registry = fastify.registry;
        const apps = registry ? registry.getAll().map((r: LoadResult) => ({
            name: r.status === 'loaded' || r.status === 'disabled' ? r.plugin.name : r.path,
            status: r.status
        })) : [];

        const degraded = apps.some((a: any) => a.status === 'failed' || a.status === 'invalid');

        return {
            status: degraded ? 'degraded' : 'ok',
            uptime: process.uptime(),
            apps
        };
    });

    fastify.get('/system/health/:appName', async (request, reply) => {
        const { appName } = request.params as { appName: string };
        const registry = fastify.registry;
        if (!registry) {
            return reply.status(500).send({ error: 'Registry not initialized' });
        }

        const plugin = registry.getByName(appName);
        if (!plugin) {
            return reply.status(404).send({ error: 'App not found or not loaded' });
        }

        if (plugin.hooks?.healthCheck) {
            try {
                const result = await plugin.hooks.healthCheck(fastify);
                return { ok: true, result };
            } catch (err: any) {
                return reply.status(500).send({ ok: false, error: err.message });
            }
        }

        return { ok: true, detail: 'no health check defined' };
    });

    fastify.get('/system/apps', async (_request, reply) => {
        const registry = fastify.registry;
        if (!registry) {
            return reply.status(500).send({ error: 'Registry not initialized' });
        }

        // Return a safe serialized version
        const results = registry.getAll().map((r: LoadResult) => {
            if (r.status === 'loaded' || r.status === 'disabled') {
                const { plugin: rawPlugin, hooks, ...safePlugin } = r.plugin;
                return { ...r, plugin: safePlugin };
            }
            return r;
        });

        return results;
    });
};
