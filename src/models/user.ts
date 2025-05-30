import {FastifyInstance} from 'fastify';
import {Record as Neo4jRecord} from 'neo4j-driver';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Not returned to client
  createdAt: Date;
  updatedAt?: Date;
}

export interface loginUserInput {
  email: string;
  password: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

export class UserModel {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  // Helper function to convert Neo4j record to User object
  private recordToUser(record: Neo4jRecord): User {
    const node = record.get('user');
    return {
      id: node.identity.toString(),
      name: node.properties.name,
      email: node.properties.email,
      createdAt: new Date(node.properties.createdAt),
      updatedAt: new Date(node.properties.updatedAt)
      // Note: password is intentionally not included in return object
    };
  }

  async verifyUser(email: string, password: string): Promise<User | null> {
    try {
      const result = await this.fastify.queryDatabase(
        'MATCH (user:User {email:$email}) RETURN user',
        {email}
      );
      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0].get('user');
      const userData: User = node.properties
      const isValid = await bcrypt.compare(password, userData.password as string);
      if (!isValid) {
        return null
      }
      return this.recordToUser(result.records[0]);
    } catch (error) {
      this.fastify.log.error('Error in verifyUser', error);
      throw error;
    }
  }


  async findAll(): Promise<User[]> {
    try {
      const result = await this.fastify.queryDatabase(
        'MATCH (user:User) RETURN user ORDER BY user.createdAt DESC'
      );
      return result.records.map(record => this.recordToUser(record));
    } catch (err) {
      this.fastify.log.error('Error in UserModel.findAll:' + err);
      throw err;
    }
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const result = await this.fastify.queryDatabase(
        `
        CREATE (user:User {
          name: $name,
          email: $email,
          password: $password,
          createdAt: datetime(),
          updatedAt: null
        })
        RETURN user
        `,
        {
          name: userData.name,
          email: userData.email,
          password: hashedPassword
        }
      );

      if (result.records.length === 0) {
        throw new Error('Failed to create user');
      }

      return this.recordToUser(result.records[0]);
    } catch (err) {
      this.fastify.log.error('Error in UserModel.create:', err);
      throw err;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.fastify.queryDatabase(
        'MATCH (user:User {email: $email}) RETURN user',
        {email}
      )
      if (result.records.length > 0) {
        return this.recordToUser(result.records[0])
      }
      return null
    } catch (err) {
      this.fastify.log.error('Error in UserModel.findByEmail:' + err);
      throw err;
    }
  }


  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.fastify.queryDatabase(
        'MATCH (user:User) WHERE ID(user) = $id RETURN user',
        {id: parseInt(id, 10)}
      );

      return result.records.length > 0
        ? this.recordToUser(result.records[0])
        : null;
    } catch (err) {
      this.fastify.log.error('Error in UserModel.findById:', err);
      throw err;
    }
  }


  async update(id: string, userData: UpdateUserInput): Promise<User> {
    try {
      const params: Record<string, any> = {
        id: parseInt(id, 10),
        updatedAt: new Date().toISOString()
      }
      let setClauses = ['user.updatedAt = $updatedAt'];
      if (userData.name) {
        params.name = userData.name;
        setClauses.push('user.name = $name');
      }
      if (userData.email) {
        params.email = userData.email;
        setClauses.push('user.email = $email');
      }
      if (userData.password) {
        // Hash the password
        const saltRounds = 10;
        params.password = await bcrypt.hash(userData.password, saltRounds);
        setClauses.push('user.password = $password');
      }
      const setClause = setClauses.join(', ');

      const result = await this.fastify.queryDatabase(
        `MATCH (user:User) 
         WHERE ID(user) = $id
         SET ${setClause}
         RETURN user
        `, {params}
      )
      if (result.records.length === 0) {
        throw new Error('User not found');
      }

      return this.recordToUser(result.records[0]);
    } catch (error) {
      this.fastify.log.error('Error in update:', error);
      throw error;
    }
  }


  // async update(id: string, userData: UpdateUserInput): Promise<User> {
  //   try {
  //     const params: Record<string, any> = {
  //       id: parseInt(id, 10),
  //       updatedAt: new Date().toISOString()
  //     };
  //
  //     // Build dynamic SET clause
  //     let setClauses = ['user.updatedAt = $updatedAt'];
  //     if (userData.name) {
  //       params.name = userData.name;
  //       setClauses.push('user.name = $name');
  //     }
  //     if (userData.email) {
  //       params.email = userData.email;
  //       setClauses.push('user.email = $email');
  //     }
  //     if (userData.password) {
  //       // Hash the password
  //       const saltRounds = 10;
  //       params.password = await bcrypt.hash(userData.password, saltRounds);
  //       setClauses.push('user.password = $password');
  //     }
  //
  //     const setClause = setClauses.join(', ');
  //
  //     const result = await this.fastify.queryDatabase(
  //       `
  //       MATCH (user:User)
  //       WHERE ID(user) = $id
  //       SET ${setClause}
  //       RETURN user
  //       `,
  //       params
  //     );
  //
  //     if (result.records.length === 0) {
  //       throw new Error('User not found');
  //     }
  //
  //     return this.recordToUser(result.records[0]);
  //   } catch (err) {
  //     this.fastify.log.error('Error in UserModel.update:', err);
  //     throw err;
  //   }
  // }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.fastify.queryDatabase(
        'MATCH (user:User) WHERE ID(user) = $id DELETE user RETURN COUNT(user) as deleted',
        {id: parseInt(id, 10)}
      );

      return result.records[0].get('deleted') > 0;
    } catch (err) {
      this.fastify.log.error('Error in UserModel.delete:', err);
      throw err;
    }
  }

  async createConstraints(): Promise<void> {
    try {
      await this.fastify.queryDatabase('CREATE CONSTRAINT user_email_unique IF NOT EXISTS FOR (user:User) REQUIRE user.email IS UNIQUE');
      this.fastify.log.info('User constraints created or already exist');
    } catch (error) {
      this.fastify.log.error('Error creating user constraints:', error);
      throw error;
    }
  }
}