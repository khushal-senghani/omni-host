#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function createApp(appName: string) {
    // Validate app name
    if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
        console.error('❌ App name must start with a letter and contain only lowercase letters, numbers, and hyphens');
        process.exit(1);
    }

    const appDir = path.join(rootDir, 'apps', appName);

    // Check if app already exists
    try {
        await fs.access(appDir);
        console.error(`❌ App "${appName}" already exists at apps/${appName}`);
        process.exit(1);
    } catch {
        // App doesn't exist, continue
    }

    console.log(`📦 Creating app: ${appName}`);

    // Create directory structure
    await fs.mkdir(appDir, { recursive: true });
    await fs.mkdir(path.join(appDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'tests'), { recursive: true });

    // Generate package.json
    const packageJson = {
        name: `@pap/${appName}`,
        version: "0.1.0",
        type: "module",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        scripts: {
            build: "tsc",
            dev: "tsc --watch",
            test: "vitest"
        },
        dependencies: {
            "@pap/core": "workspace:*",
            "@pap/auth": "workspace:*",
            "fastify": "^4.29.1",
            "fastify-plugin": "^4.5.1",
            "zod": "^3.22.4"
        },
        devDependencies: {
            "@pap/testing": "workspace:*",
            "typescript": "^5.3.0",
            "vitest": "^1.2.0"
        }
    };

    await fs.writeFile(
        path.join(appDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    // Generate tsconfig.json
    const tsconfig = {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
            outDir: './dist',
            rootDir: './src',
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
    };

    await fs.writeFile(
        path.join(appDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
    );

    // Generate env.ts
    const envTs = `import { z } from 'zod';

export const envSchema = z.object({
  // Add your app-specific env vars here
  // Example: MY_APP_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
`;
    await fs.writeFile(path.join(appDir, 'src', 'env.ts'), envTs);

    // Generate schema.ts (Mongoose)
    const schemaTs = `import { Schema, model } from 'mongoose';

export const ExampleModel = model('Example', new Schema({ name: String }));
`;
    await fs.writeFile(path.join(appDir, 'src', 'schema.ts'), schemaTs);

    // Generate routes.ts
    const routesTs = `import type { FastifyInstance } from 'fastify';
import '@pap/auth';

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get('/hello', async () => ({ message: 'Hello from ${appName}!' }));
}
`;
    await fs.writeFile(path.join(appDir, 'src', 'routes.ts'), routesTs);

    // Generate index.ts
    const displayName = appName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const indexTs = `import fp from 'fastify-plugin';
import type { AppPlugin } from '@pap/core';
import { envSchema } from './env.js';
import { registerRoutes } from './routes.js';

const plugin = fp(async (fastify) => {
  await registerRoutes(fastify);
});

export default {
  name: '${appName}',
  prefix: '/${appName}',
  plugin,
  env: envSchema,
  db: false,
  meta: {
    displayName: '${displayName}',
    description: 'Description of ${appName}',
    version: '0.1.0',
    auth: 'jwt',
  },
} satisfies AppPlugin;
`;
    await fs.writeFile(path.join(appDir, 'src', 'index.ts'), indexTs);

    // Generate test file
    const testTs = `import { describe, it, expect } from 'vitest';
import { buildTestApp, mockAuth } from '@pap/testing';
import plugin from '../src/index.js';

describe('${appName}', () => {
  it('GET /hello returns greeting', async () => {
    const app = await buildTestApp(plugin);
    const res = await app.inject({
      method: 'GET',
      url: '/${appName}/hello',
      headers: mockAuth('test-user'),
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBeDefined();
  });
});
`;
    await fs.writeFile(path.join(appDir, 'tests', `${appName}.test.ts`), testTs);

    // Generate README.md
    const readmeMd = `# ${displayName}

**Prefix:** \`/${appName}\`
**Auth:** \`jwt\`
**DB:** No

## Env vars
*None required by default. Add to \`src/env.ts\` and \`.env\`.*

## Routes
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /${appName}/hello | jwt | Health check |
`;
    await fs.writeFile(path.join(appDir, 'README.md'), readmeMd);

    console.log(`✅ App "${appName}" created successfully at apps/${appName}`);
    console.log('\\n📝 Next steps:');
    console.log(`  1. pnpm install (from root)`);
    console.log(`  2. cd apps/${appName}`);
    console.log(`  3. Start implementing your app logic`);
    console.log(`  4. Restart the server to see your app: pnpm dev`);
}

// Parse command line arguments
const appName = process.argv[2];
if (!appName) {
    console.error('❌ Please provide an app name');
    console.error('Usage: pnpm create-app <app-name>');
    process.exit(1);
}

createApp(appName).catch(console.error);