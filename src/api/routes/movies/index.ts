import { FastifyInstance } from 'fastify';
import movieEnpoint from "./movie";

export default async function moviesRoutes(fastify: FastifyInstance) {
  await fastify.register(movieEnpoint);
}