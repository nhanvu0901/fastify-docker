import { FastifyInstance } from 'fastify';
import { PoolClient } from 'pg';

export class UserModel{
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

}