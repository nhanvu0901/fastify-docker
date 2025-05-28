import { FastifyInstance } from 'fastify';
import usersEnpoint from "./users";

export default async function usersRoutes(fastify: FastifyInstance) {
  await fastify.register(usersEnpoint);
}