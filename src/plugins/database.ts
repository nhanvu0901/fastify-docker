import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import neo4j, { Driver, QueryResult } from 'neo4j-driver';

async function databasePlugin(fastify: FastifyInstance) {
  // Get Neo4j connection details from environment variables
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  const database = process.env.NEO4J_DATABASE || 'neo4j'; // Default database name

  if (!uri || !username || !password) {
    fastify.log.error('Neo4j connection details are not defined. Make sure NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD are set in your environment or .env file.');
    throw new Error('Neo4j connection details are not defined.');
  }

  // Create a Neo4j driver instance
  const driver = neo4j.driver(
    uri,
    neo4j.auth.basic(username, password),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000
    }
  );

  // Add the driver to the Fastify instance
  fastify.decorate('neo4j', driver);

  // Add health check method
  fastify.decorate('checkDbConnection', async () => {
    const session = driver.session({ database });
    try {
      const result = await session.run('RETURN datetime() AS db_time');
      return {
        status: 'ok',
        dbTime: result.records[0].get('db_time')
      };
    } catch (error) {
      fastify.log.error('Neo4j database connection failed during health check:', error);
      throw new Error('Neo4j database connection failed');
    } finally {
      await session.close();
    }
  });

  // Add query method with proper parameter handling
  fastify.decorate('queryDatabase', async (query: string, params?: Record<string, any>): Promise<QueryResult> => {
    const session = driver.session({ database });
    try {
      const result = await session.run(query, params || {});
      return result;
    } catch (error) {
      fastify.log.error('Neo4j database query failed:', error);
      throw error; // Re-throw the original error for better debugging
    } finally {
      await session.close();
    }
  });

  // Close the driver when Fastify is shutting down
  fastify.addHook('onClose', async (instance) => {
    await driver.close();
    instance.log.info('Neo4j connection closed');
  });
}

export default fastifyPlugin(databasePlugin);

// Extend Fastify instance with the new decorators
declare module 'fastify' {
  interface FastifyInstance {
    neo4j: Driver;
    checkDbConnection: () => Promise<{ status: string; dbTime: any }>;
    queryDatabase: (query: string, params?: Record<string, any>) => Promise<QueryResult>;
  }
}