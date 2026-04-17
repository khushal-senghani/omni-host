import fp from 'fastify-plugin';
import { nanoid } from 'nanoid';
import { User, RefreshToken, UnauthorizedError } from '@pap/core';
import { env } from '@pap/config';
import { verifyPassword } from './password.js';
import type { TokenPayload, Tokens, LoginCredentials } from './types.js';

export default fp(async (fastify) => {
    await fastify.register(import('@fastify/jwt'), {
        secret: env.JWT_SECRET,
        sign: { expiresIn: env.ACCESS_TOKEN_EXPIRY },
    });

    fastify.decorate('authenticate', async function (request: any, _reply: any) {
        try {
            await request.jwtVerify();
        } catch (err) {
            throw new UnauthorizedError('Invalid or expired token');
        }
    });

    function generateAccessToken(payload: TokenPayload): string {
        return fastify.jwt.sign(payload);
    }

    async function generateRefreshToken(userId: string): Promise<string> {
        const token = nanoid(64);
        const expiresAt = new Date(Date.now() + parseDuration(env.REFRESH_TOKEN_EXPIRY));

        await RefreshToken.create({
            token,
            userId,
            expiresAt,
            revoked: false,
        });

        return token;
    }

    async function generateTokens(user: TokenPayload): Promise<Tokens> {
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user.id);
        return { accessToken, refreshToken };
    }

    // Login endpoint
    fastify.post('/auth/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string' },
                            },
                        },
                    },
                },
            },
        },
    }, async (request) => {
        const { email, password } = request.body as LoginCredentials;

        const user = await User.findOne({ email });
        if (!user) throw new UnauthorizedError('Invalid credentials');

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) throw new UnauthorizedError('Invalid credentials');

        const tokens = await generateTokens({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        return {
            ...tokens,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
            },
        };
    });

    // Refresh endpoint
    fastify.post('/auth/refresh', {
        schema: {
            body: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string' },
                },
            },
        },
    }, async (request) => {
        const { refreshToken } = request.body as { refreshToken: string };

        const tokenDoc = await RefreshToken.findOne({
            token: refreshToken,
            revoked: false,
            expiresAt: { $gt: new Date() },
        });

        if (!tokenDoc) throw new UnauthorizedError('Invalid or expired refresh token');

        const user = await User.findById(tokenDoc.userId);
        if (!user) throw new UnauthorizedError('User not found');

        // Revoke old token
        tokenDoc.revoked = true;
        await tokenDoc.save();

        const newTokens = await generateTokens({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        return newTokens;
    });

    // Logout endpoint
    fastify.post('/auth/logout', {
        preHandler: [fastify.authenticate],
    }, async (request) => {
        const refreshToken = request.headers['x-refresh-token'] as string;
        if (refreshToken) {
            await RefreshToken.updateOne({ token: refreshToken }, { revoked: true });
        }
        return { success: true };
    });

    // Get current user
    fastify.get('/auth/me', {
        preHandler: [fastify.authenticate],
    }, async (request) => {
        const user = await User.findById(request.user.id).select('-passwordHash');
        return { user };
    });

    function parseDuration(duration: string): number {
        const value = parseInt(duration);
        const unit = duration.slice(-1);

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return value;
        }
    }
});

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}