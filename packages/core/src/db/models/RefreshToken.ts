import { Schema, model, Document } from 'mongoose';

export interface IRefreshToken extends Document {
    token: string;
    userId: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true, ref: 'User' },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);