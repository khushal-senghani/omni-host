import fp from 'fastify-plugin';
import { nanoid } from 'nanoid';

export default fp(async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
        if (!request.id) {
            request.id = nanoid(10);
        }
    });
});
