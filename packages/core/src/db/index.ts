import mongoose from 'mongoose';
import { env } from '@pap/config';

export async function connectDB(): Promise<typeof mongoose> {
    return mongoose.connect(env.MONGODB_URI);
}

export const db = mongoose.connection;

export { User, type IUser } from './models/Users.js';
export { RefreshToken, type IRefreshToken } from './models/RefreshToken.js';
