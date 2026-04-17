export interface User {
    id: string;
    email: string;
    role: 'owner';
    createdAt: Date;
    updatedAt: Date;
}

declare module 'fastify' {
    interface FastifyRequest {
        user: User;
    }
}