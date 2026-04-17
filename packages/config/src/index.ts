import { z } from 'zod';

const envSchema = z.object({
    // Server
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('0.0.0.0'),

    // Database
    // DB_PATH: z.string().default('./data/pap.db'),
    MONGODB_URI: z.string().min(1),

    // Auth
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRY: z.string().default('7d'),

    // Rate Limiting
    RATE_LIMIT_MAX: z.string().default('100'),
    RATE_LIMIT_TIME_WINDOW: z.string().default('60000'),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // CORS
    CORS_ORIGIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        throw new Error('Invalid environment configuration');
    }

    cachedEnv = result.data;
    return cachedEnv;
}

export const env = getEnv();