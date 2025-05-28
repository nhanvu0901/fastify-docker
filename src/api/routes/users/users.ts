import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserModel, CreateUserInput } from '../../../models/user';

export default async function usersEndpoint(fastify: FastifyInstance) {
  // Initialize the user model
  const userModel = new UserModel(fastify);

  // Ensure the users table exists (useful during development/first run)
  await userModel.createTableIfNotExists();

  // Get all users
  fastify.get('/users', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await userModel.findAll();
      return {
        users,
        count: users.length
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });



  // Create a new user
  fastify.post<{ Body: CreateUserInput }>('/users', async (request, reply) => {
    try {
      const { name, email } = request.body;

      if (!name || !email) {
        return reply.status(400).send({
          error: 'Name and email are required'
        });
      }

      // Check if email already exists
      // const existingUser = await userModel.findByEmail(email);
      // if (existingUser) {
      //   return reply.status(409).send({
      //     error: 'Email already exists'
      //   });
      // }

      const user = await userModel.createUser({ name, email });
      return reply.status(201).send({ user });
    } catch (error) {
      fastify.log.error(error);

      // Handle unique constraint violation (as a backup check)
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

  // // Update a user
  // fastify.put<{ Params: { id: string }, Body: { name?: string; email?: string } }>(
  //   '/users/:id',
  //   async (request, reply) => {
  //     try {
  //       const id = parseInt(request.params.id, 10);
  //       if (isNaN(id)) {
  //         return reply.status(400).send({ error: 'Invalid user ID format' });
  //       }
  //
  //       const { name, email } = request.body;
  //
  //       // Check if user exists
  //       const existingUser = await userModel.findById(id);
  //       if (!existingUser) {
  //         return reply.status(404).send({ error: 'User not found' });
  //       }
  //
  //       // Check if at least one field is provided
  //       if (!name && !email) {
  //         return reply.status(400).send({
  //           error: 'At least one field (name or email) must be provided for update'
  //         });
  //       }
  //
  //       // If email is being changed, check if it's already in use
  //       if (email && email !== existingUser.email) {
  //         const userWithEmail = await userModel.findByEmail(email);
  //         if (userWithEmail) {
  //           return reply.status(409).send({
  //             error: 'Email already exists'
  //           });
  //         }
  //       }
  //
  //       const updatedUser = await userModel.update(id, { name, email });
  //       return { user: updatedUser };
  //     } catch (error) {
  //       fastify.log.error(error);
  //
  //       // Handle unique constraint violation (as a backup check)
  //       if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
  //         return reply.status(409).send({
  //           error: 'Email already exists'
  //         });
  //       }
  //
  //       return reply.status(500).send({
  //         error: 'Failed to update user',
  //         message: error instanceof Error ? error.message : 'Unknown error'
  //       });
  //     }
  //   }
  // );
  //
  // // Delete a user
  // fastify.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
  //   try {
  //     const id = parseInt(request.params.id, 10);
  //     if (isNaN(id)) {
  //       return reply.status(400).send({ error: 'Invalid user ID format' });
  //     }
  //
  //     const deleted = await userModel.delete(id);
  //     if (!deleted) {
  //       return reply.status(404).send({ error: 'User not found' });
  //     }
  //
  //     return reply.status(204).send();
  //   } catch (error) {
  //     fastify.log.error(error);
  //     return reply.status(500).send({
  //       error: 'Failed to delete user',
  //       message: error instanceof Error ? error.message : 'Unknown error'
  //     });
  //   }
  // });
}