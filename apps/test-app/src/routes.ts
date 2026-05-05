import type { FastifyInstance } from 'fastify';
import '@pap/auth'; // Augments fastify instance with authenticate

export async function registerRoutes(fastify: FastifyInstance) {
  // A public route
  fastify.get('/hello', async () => ({ message: 'Hello from test-app!' }));

  // An authenticated route
  fastify.get('/secure', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    return { 
      message: 'This is a secure route!',
      user: request.user // Populated by the JWT strategy
    };
  });
}
