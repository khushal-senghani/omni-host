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
    await fs.mkdir(path.join(appDir, 'src', 'routes'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'src', 'services'), { recursive: true });
    await fs.mkdir(path.join(appDir, 'src', 'schema'), { recursive: true });

    // Generate package.json
    const packageJson = {
        name: `@pap/${appName}`,
        version: '0.1.0',
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            dev: 'tsc --watch',
            test: 'vitest',
        },
        dependencies: {
            '@pap/core': 'workspace:*',
            '@pap/config': 'workspace:*',
            fastify: '^4.25.0',
            'fastify-plugin': '^4.5.1',
        },
        devDependencies: {
            typescript: '^5.3.0',
            vitest: '^1.2.0',
        },
    };

    await fs.writeFile(
        path.join(appDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );

    // Generate tsconfig.json
    const tsconfig = {
        extends: '../../../tsconfig.base.json',
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

    // Generate app entry point
    const appEntry = `import fp from 'fastify-plugin';
import type { AppPlugin } from '@pap/core';

const plugin = fp(async (fastify) => {
  // Example route
  fastify.get('/hello', async () => ({ message: 'Hello from ${appName}!' }));
  
  // Protected route example
  fastify.get('/protected', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    return { message: \`Hello \${request.user.email}, this is protected!\` };
  });
});

export default {
  name: '${appName}',
  prefix: '/${appName}',
  plugin,
  meta: {
    displayName: '${appName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}',
    description: 'Description for ${appName}',
    version: '0.1.0',
    tags: ['example'],
  },
} satisfies AppPlugin;
`;

    await fs.writeFile(path.join(appDir, 'src', 'index.ts'), appEntry);

    // Generate example service
    const exampleService = `export interface ExampleData {
  id: string;
  name: string;
}

export async function getExampleData(id: string): Promise<ExampleData | null> {
  // Business logic here
  return null;
}

export async function createExampleData(data: Omit<ExampleData, 'id'>): Promise<ExampleData> {
  // Business logic here
  return { id: '123', ...data };
}
`;

    await fs.writeFile(path.join(appDir, 'src', 'services', 'example.ts'), exampleService);

    // Generate example test
    const exampleTest = `import { describe, it, expect } from 'vitest';
import { getExampleData, createExampleData } from './example.js';

describe('example service', () => {
  it('should return null for non-existent data', async () => {
    const result = await getExampleData('non-existent');
    expect(result).toBeNull();
  });
});
`;

    await fs.writeFile(path.join(appDir, 'src', 'services', 'example.test.ts'), exampleTest);

    // Generate schema example
    const schemaExample = `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const exampleTable = sqliteTable('${appName.replace(/-/g, '_')}', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
`;

    await fs.writeFile(path.join(appDir, 'src', 'schema', 'index.ts'), schemaExample);

    // Generate types
    const typesFile = `export interface ExampleType {
  id: string;
  name: string;
}
`;

    await fs.writeFile(path.join(appDir, 'src', 'types.ts'), typesFile);

    console.log(`✅ App "${appName}" created successfully at apps/${appName}`);
    console.log('\n📝 Next steps:');
    console.log(`  1. cd apps/${appName}`);
    console.log(`  2. pnpm install (from root)`);
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