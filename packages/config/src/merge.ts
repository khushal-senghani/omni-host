import { z, type AnyZodObject } from 'zod';

export function mergeEnvSchemas<TGlobal extends AnyZodObject>(
    globalSchema: TGlobal,
    appSchemas: Map<string, AnyZodObject>
) {
    // 1. Validate global env
    const globalResult = globalSchema.safeParse(process.env);
    
    const errors: Record<string, z.ZodError> = {};
    const parsedApps: Record<string, any> = {};

    if (!globalResult.success) {
        errors['global'] = globalResult.error;
    }

    // 2. Validate app envs
    for (const [appName, schema] of appSchemas.entries()) {
        const result = schema.safeParse(process.env);
        if (!result.success) {
            errors[appName] = result.error;
        } else {
            parsedApps[appName] = result.data;
        }
    }

    // 3. Throw aggregated errors if any
    if (Object.keys(errors).length > 0) {
        let errorMessage = '❌ Invalid environment configuration:\n';
        for (const [scope, error] of Object.entries(errors)) {
            errorMessage += `\n[${scope}]:\n`;
            for (const issue of error.issues) {
                errorMessage += `  - ${issue.path.join('.')}: ${issue.message}\n`;
            }
        }
        const err = new AggregateError(Object.values(errors), errorMessage);
        throw err;
    }

    return {
        global: globalResult.data as z.infer<TGlobal>,
        apps: parsedApps
    };
}
