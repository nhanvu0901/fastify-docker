import {FastifyInstance} from 'fastify';


export interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
}


export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export class UserModel {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async findAll(): Promise<User[]> {
    try {
      const result = await this.fastify.queryDatabase('SELECT id, name, email, created_at, updated_at FROM users ORDER BY created_at DESC');
      return result.rows as User[];
    } catch (err) {
      this.fastify.log.error('Error in UserModel.findAll:' + err);
      throw err;
    }
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      const result = await this.fastify.queryDatabase(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
        [userData.name, userData.email]
      );
      return result.rows[0] as User;
    } catch (err) {
      this.fastify.log.error('Error in UserModel.create:', err);
      throw err;
    }
  }
  async createTableIfNotExists(): Promise<void> {
    try {
      await await this.fastify.queryDatabase(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP
        )
      `);
      this.fastify.log.info('Users table created or already exists');
    } catch (error) {
      this.fastify.log.error('Error creating users table:', error);
      throw error;
    }
  }
}