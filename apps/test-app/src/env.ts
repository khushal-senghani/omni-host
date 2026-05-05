import { z } from 'zod';

export const envSchema = z.object({
  // Add your app-specific env vars here
  // Example: MY_APP_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
