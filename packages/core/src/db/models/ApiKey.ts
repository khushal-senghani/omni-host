import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IApiKey extends Document {
    _id: Types.ObjectId;
    key: string;
    appName: string;
    userId?: Types.ObjectId;
    createdAt: Date;
    expiresAt?: Date;
    revoked: boolean;
}

const apiKeySchema = new Schema<IApiKey>(
    {
        key: { type: String, required: true, unique: true, index: true },
        appName: { type: String, required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        expiresAt: { type: Date },
        revoked: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
