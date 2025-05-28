import { FastifyInstance } from 'fastify';
import usersRoutes from "./users";

export default async function (fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: '/api/fastify' });
}