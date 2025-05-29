import Fastify, {FastifyInstance} from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import routes from './routes';
import databasePlugin from '../plugins/database'
export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level:'info',
    },
  });

  await server.register(cors, {
    origin: true,
  })
  // Register the new database plugin
// The plugin will use process.env.DATABASE_URL , register here so the controller can use the database plugin
  await server.register(databasePlugin);


  await server.register(swagger, {
    swagger: {
      info: {
        title: 'Todo app',
        description: 'API for querying todo app and maybe some cool ai function',
        version: '1.0.0',
      },

      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });
  await server.register(swaggerUI, {
    routePrefix: '/documentation',
  });

  await server.register(routes);
  return server;
}