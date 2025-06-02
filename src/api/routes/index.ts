import { FastifyInstance } from 'fastify';
import usersRoutes from "./users";
import moviesRoutes from "./movies";

export default async function (fastify: FastifyInstance) {
  fastify.register(usersRoutes, { prefix: '/api/fastify' });
  fastify.register(moviesRoutes, { prefix: '/api/fastify' });
}