import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { QueryResult, QueryConfig, PoolClient } from 'pg';

async function databasePlugin(fastify: FastifyInstance) {
  const dbConnectionString = process.env.DATABASE_URL;

  if (!dbConnectionString) {
    fastify.log.error('DATABASE_URL is not defined. Make sure it is set in your environment or .env file.');
    throw new Error('DATABASE_URL is not defined.');
  }

  await fastify.register(fastifyPostgres, {
    connectionString: dbConnectionString,
  });

  // Add health check method
  fastify.decorate('checkDbConnection', async () => {
    let client: PoolClient | null = null;
    try {
      client = await fastify.pg.connect();
      const result = await client.query('SELECT NOW() as db_time');
      return {
        status: 'ok',
        dbTime: result.rows[0].db_time
      };
    } catch (error) {
      fastify.log.error('Database connection failed during health check:', error);
      throw new Error('Database connection failed');
    } finally {
      if (client) {
        client.release();
      }
    }
  });

  // Add query method with proper parameter handling
  fastify.decorate('queryDatabase', async (text: string, params?: any[]): Promise<QueryResult> => {
    let client: PoolClient | null = null;
    try {
      client = await fastify.pg.connect();
      const result: QueryResult = await client.query(text, params);
      return result;
    } catch (error) {
      fastify.log.error('Database query failed:', error);
      throw error; // Re-throw the original error for better debugging
    } finally {
      if (client) {
        client.release();
      }
    }
  });
}

export default fastifyPlugin(databasePlugin);

// Extend Fastify instance with the new decorators
declare module 'fastify' {
  interface FastifyInstance {
    checkDbConnection: () => Promise<{ status: string; dbTime: Date }>;
    queryDatabase: (text: string, params?: any[]) => Promise<QueryResult>;
  }
}