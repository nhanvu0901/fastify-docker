import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fastifyEnv from '@fastify/env';

// Type definitions
interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at?: Date;
}

interface CreateUserBody {
  name: string;
  email: string;
}

interface EnvSchema {
  PORT: string;
  NODE_ENV: string;
  DATABASE_URL: string;
}

// Extend Fastify instance with custom properties
declare module 'fastify' {
  interface FastifyInstance {
    config: EnvSchema;
  }
}

const fastify: FastifyInstance = Fastify({ logger: true });

// Register environment variables
fastify.register(fastifyEnv, {
  schema: {
    type: 'object',
    required: ['DATABASE_URL'],
    properties: {
      PORT: {
        type: 'string',
        default: '3000'
      },
      NODE_ENV: {
        type: 'string',
        default: 'development'
      },
      DATABASE_URL: {
        type: 'string'
      }
    }
  },
  dotenv: true
});

// Register PostgreSQL plugin
fastify.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL || 'postgres://nhan:password@localhost:5432/fastify_db'
});

// Health check route
fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    // Test database connection
    const client = await fastify.pg.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: result.rows[0].now
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sample users routes
fastify.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const client = await fastify.pg.connect();
    const result = await client.query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    client.release();

    return {
      users: result.rows as User[],
      count: result.rowCount
    };
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

fastify.post<{ Body: CreateUserBody }>('/users', async (request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
  try {
    const { name, email } = request.body;

    if (!name || !email) {
      return reply.status(400).send({
        error: 'Name and email are required'
      });
    }

    const client = await fastify.pg.connect();
    const result = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    client.release();

    return reply.status(201).send({
      user: result.rows[0] as User
    });
  } catch (error) {
    fastify.log.error(error);

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return reply.status(409).send({
        error: 'Email already exists'
      });
    }

    return reply.status(500).send({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    await fastify.listen({ port, host });
    fastify.log.info(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();