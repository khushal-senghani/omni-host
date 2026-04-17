import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    email: string;
    passwordHash: string;
    role: 'owner';
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'owner', enum: ['owner'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const User = model<IUser>('User', userSchema);