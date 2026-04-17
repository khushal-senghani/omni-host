import fp from 'fastify-plugin';
import { FastifyError } from 'fastify';

export default fp(async (fastify) => {
    fastify.setErrorHandler((error: FastifyError, _request, reply) => {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'Internal Server Error';

        // Log errors
        if (statusCode >= 500) {
            fastify.log.error(error);
        } else {
            fastify.log.debug(error);
        }

        reply.status(statusCode).send({
            error: error.name || 'Error',
            message,
            statusCode,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        });
    });
});