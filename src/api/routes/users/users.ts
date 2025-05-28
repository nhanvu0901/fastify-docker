import Fastify, {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';

// Type definitions (keep your existing ones)
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

export default async function usersEnpoint(fastify: FastifyInstance) {
// Sample users routes (these should now work as before, using fastify.pg)
  fastify.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const client = await fastify.pg.connect();
      // Ensure the users table exists. If not, this will fail.
      // You might want to add table creation logic (e.g., using migrations) separately.
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

  fastify.post<{ Body: CreateUserBody }>('/users', async (request: FastifyRequest<{
    Body: CreateUserBody
  }>, reply: FastifyReply) => {
    try {
      const {name, email} = request.body;

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

      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') { // Check for unique constraint violation
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
}