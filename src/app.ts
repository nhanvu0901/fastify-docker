import Fastify, {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';
import fastifyEnv from '@fastify/env';
import databasePlugin from './plugins/database'; // Import the new database plugin
import {createServer} from './api/server';



const fastify: FastifyInstance = Fastify({logger: true});

// Register environment variables (remains important)
// The 'await' here is important for fastify.config to be available when databasePlugin is registered
fastify.register(fastifyEnv, {
  schema: {
    type: 'object',
    required: ['DATABASE_URL', 'PORT'], // DATABASE_URL is still required here for validation
    properties: {
      PORT: {
        type: 'string',
        default: '3000'
      },
      NODE_ENV: {
        type: 'string',
        default: 'development'
      },
      DATABASE_URL: { // @fastify/env will load this into process.env and fastify.config
        type: 'string'
      }
    }
  },
  dotenv: true // This loads .env file into process.env
});


// Register the new database plugin
// The plugin will use fastify.config.DATABASE_URL or process.env.DATABASE_URL
fastify.register(databasePlugin);

// Health check route - now uses the plugin's utility
fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const dbHealth = await fastify.checkDbConnection(); // Use the decorated method added in the database.ts
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.status,
        dbTime: dbHealth.dbTime
      }
    };
  } catch (error) {
    fastify.log.error('Health check failed:', error);
    // The error from checkDbConnection is already logged, so we just send the response
    return reply.status(500).send({
      status: 'error',
      message: 'Health check failed, potentially database issue.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Start server
const start = async (): Promise<void> => {
  try {
    const server = await createServer();
    await server.listen({port: Number(process.env.PORT) || 3000, host: '0.0.0.0'});
    console.log(`Server is running on port ${process.env.PORT}`);
    console.log(`Swagger documentation: http://localhost:${process.env.PORT}/documentation`);
    console.log(`Neo4j browser: http://localhost:7474/browser/`);
    console.log(`Qdrant dashboard: http://localhost:6333/dashboard/`);

    const shutdown = async () => {
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();