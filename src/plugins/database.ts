import {FastifyInstance} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import {QueryResult, QueryConfig, PoolClient} from 'pg';

async function databasePlugin(fastify: FastifyInstance) {
  const dbConnectionString = process.env.DATABASE_URL
  if (!dbConnectionString) {
    fastify.log.error('DATABASE_URL is not defined. Make sure it is set in your environment or .env file.');
    throw new Error('DATABASE_URL is not defined.');
  }
  fastify.register(fastifyPostgres, {
    connectionString: dbConnectionString,
  });
  //add new method named checkDbConnection directly to fastify instance at runtime
  fastify.decorate('checkDbConnection', async () => {
    try {
      const client = await fastify.pg.connect();
      const result = await client.query('SELECT NOW() as db_time');
      client.release();
      return {
        status: 'ok',
        dbTime: result.rows[0].db_time
      };
    } catch (error) {
      fastify.log.error('Database connection failed during health check:', error);
      throw new Error('Database connection failed');
    }
  });
  fastify.decorate('queryDatabase', async (query: string | QueryConfig): Promise<QueryResult> => {
    let client: PoolClient | null = null;
    try {
      client = await fastify.pg.connect();
      const result:QueryResult = await client.query(query);
      return result
    } catch (error) {
      fastify.log.error(error);
      throw new Error('Query Database failed ');
    }
  });
}

export default fastifyPlugin(databasePlugin);

// Extend Fastify instance with the new decorator
declare module 'fastify' {
  // merge new type to the interface this is the type for the newly added function checkDbConnection above
  interface FastifyInstance {
    checkDbConnection: () => Promise<{ status: string; dbTime: Date }>;
    queryDatabase: (query: string | QueryConfig) => Promise<QueryResult>;
  }
}