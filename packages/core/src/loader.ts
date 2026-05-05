import * as fs from 'fs/promises';
import * as path from 'path';
import { AppPluginSchema, type LoadResult } from './types/plugin.js';

export async function discoverApps(appsDir: string): Promise<LoadResult[]> {
    const results: LoadResult[] = [];
    let entries: string[];

    try {
        entries = await fs.readdir(appsDir);
    } catch (err) {
        console.error(`[Loader] Failed to read apps directory: ${appsDir}`, err);
        return results;
    }

    for (const entry of entries) {
        // Skip 'server' app and non-directories
        if (entry === 'server') continue;

        const appPath = path.join(appsDir, entry);
        try {
            const stat = await fs.stat(appPath);
            if (!stat.isDirectory()) continue;
        } catch {
            continue;
        }

        const indexPathTs = path.join(appPath, 'src', 'index.ts');
        const indexPathJs = path.join(appPath, 'src', 'index.js');
        const indexPathDist = path.join(appPath, 'dist', 'index.js');
        
        let targetPath: string | null = null;
        for (const p of [indexPathDist, indexPathTs, indexPathJs]) {
            try {
                await fs.access(p);
                targetPath = p;
                break;
            } catch {
                // Ignore access errors
            }
        }

        if (!targetPath) {
            continue; // Not an app or missing entrypoint
        }

        try {
            // Use pathToFileURL to correctly format absolute paths for import() on Windows/Linux
            const moduleUrl = new URL(`file://${targetPath}`).href;
            const module = await import(moduleUrl);
            const rawPlugin = module.default;

            if (!rawPlugin) {
                results.push({
                    status: 'failed',
                    path: appPath,
                    error: new Error(`No default export in ${targetPath}`)
                });
                continue;
            }

            const parsed = AppPluginSchema.safeParse(rawPlugin);
            if (!parsed.success) {
                results.push({
                    status: 'invalid',
                    path: appPath,
                    errors: parsed.error.issues
                });
                continue;
            }

            if (parsed.data.disabled) {
                results.push({
                    status: 'disabled',
                    plugin: rawPlugin,
                    path: appPath
                });
                continue;
            }

            results.push({
                status: 'loaded',
                plugin: rawPlugin,
                path: appPath
            });

        } catch (err) {
            results.push({
                status: 'failed',
                path: appPath,
                error: err
            });
        }
    }

    // Log warnings for failed/invalid
    for (const res of results) {
        if (res.status === 'failed') {
            console.warn(`[Loader] Failed to load app at ${res.path}:`, res.error);
        } else if (res.status === 'invalid') {
            console.warn(`[Loader] Invalid app plugin at ${res.path}:`, res.errors);
        }
    }

    return results;
}
