import type { FastifyPluginAsync } from 'fastify';

export interface AppPlugin {
    /** Unique identifier. Lowercase, hyphenated. e.g. "habit-tracker" */
    name: string;

    /** URL namespace. e.g. "/habit-tracker" — all routes mount here */
    prefix: string;

    /** The Fastify plugin. Must be async. Use fastify-plugin to share decorators. */
    plugin: FastifyPluginAsync;

    /** Optional metadata for the dashboard and docs */
    meta?: {
        displayName: string;
        description: string;
        version: string;
        tags?: string[];
    };
}