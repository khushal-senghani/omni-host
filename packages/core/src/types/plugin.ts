import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';

export const AppPluginSchema = z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/),
    prefix: z.string().startsWith('/'),
    plugin: z.any(), // Validated as function later due to Zod limitations with Fastify types
    disabled: z.boolean().optional().default(false),
    meta: z.object({
        displayName: z.string(),
        description: z.string(),
        version: z.string(),
        auth: z.enum(['jwt', 'apikey', 'public']).default('jwt'),
        rateLimit: z
            .object({
                max: z.number(),
                timeWindow: z.string(),
            })
            .optional(),
        cors: z
            .object({
                origins: z.array(z.string()),
                credentials: z.boolean().optional(),
            })
            .optional(),
    }),
    env: z.any().optional(), // Represents Zod Object Schema
    db: z.boolean().optional().default(false),
    hooks: z
        .object({
            onReady: z.function().args(z.any()).returns(z.promise(z.void())).optional(),
            onClose: z.function().args(z.any()).returns(z.promise(z.void())).optional(),
            healthCheck: z.function().args(z.any()).returns(z.promise(z.any())).optional(),
        })
        .optional(),
});

export type AppPluginBase = z.infer<typeof AppPluginSchema>;

// Extend to enforce correct Fastify plugin typing
export interface AppPlugin extends Omit<AppPluginBase, 'plugin' | 'hooks' | 'disabled' | 'db'> {
    plugin: FastifyPluginAsync<any>;
    disabled?: boolean;
    db?: boolean;
    hooks?: {
        onReady?: (fastify: any) => Promise<void>;
        onClose?: (fastify: any) => Promise<void>;
        healthCheck?: (fastify: any) => Promise<any>;
    };
}

export type LoadResult =
    | { status: 'loaded'; plugin: AppPlugin; path: string }
    | { status: 'failed'; path: string; error: unknown }
    | { status: 'invalid'; path: string; errors: z.ZodIssue[] }
    | { status: 'disabled'; plugin: AppPlugin; path: string };