import mongoose, { type Connection } from 'mongoose';

export function createScopedDb(appName: string): Connection {
    // We use the default connection, and call useDb to switch database context.
    // useDb creates a new connection instance that uses the specified database.
    return mongoose.connection.useDb(appName, { useCache: true });
}
