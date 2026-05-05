import type { AppPlugin, LoadResult } from './types/plugin.js';

export class PluginRegistry {
    private results = new Map<string, LoadResult>();
    private plugins = new Map<string, AppPlugin>();

    register(result: LoadResult) {
        if (result.status === 'loaded' || result.status === 'disabled') {
            this.results.set(result.plugin.name, result);
            if (result.status === 'loaded') {
                this.plugins.set(result.plugin.name, result.plugin);
            }
        } else {
            // For failed/invalid apps, we use the path as key
            this.results.set(result.path, result);
        }
    }

    getAll(): LoadResult[] {
        return Array.from(this.results.values());
    }

    getLoaded(): AppPlugin[] {
        return Array.from(this.plugins.values());
    }

    getFailed(): Extract<LoadResult, { status: 'failed' | 'invalid' }>[] {
        return Array.from(this.results.values()).filter(
            (r): r is Extract<LoadResult, { status: 'failed' | 'invalid' }> =>
                r.status === 'failed' || r.status === 'invalid'
        );
    }

    getByName(name: string): AppPlugin | undefined {
        return this.plugins.get(name);
    }
}
