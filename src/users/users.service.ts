import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { COLLECTIONS } from '../database/database.constants';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User } from '../common/interfaces';

@Injectable()
export class UsersService implements OnModuleInit {
    private readonly logger = new Logger(UsersService.name);

    constructor(private readonly databaseService: DatabaseService) {}

    async onModuleInit() {
        await this.initializeCollection();
    }

    private async initializeCollection() {
        try {
            // Create users collection with minimal vector size (not used for semantic search)
            await this.databaseService.ensureCollection(COLLECTIONS.USERS, 1);

            // Create indexes for better performance
            await this.databaseService.createIndex(COLLECTIONS.USERS, 'email', 'keyword');
            await this.databaseService.createIndex(COLLECTIONS.USERS, 'name', 'text');

            this.logger.log('Users collection initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize users collection:', error);
        }
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        try {
            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            const userId = uuidv4();
            const now = new Date();

            const userPayload = {
                id: userId,
                name: createUserDto.name,
                email: createUserDto.email,
                password: hashedPassword,
                createdAt: now.toISOString(),
                updatedAt: null,
            };

            await this.databaseService.getClient().upsert(COLLECTIONS.USERS, {
                wait: true,
                points: [
                    {
                        id: userId,
                        vector: [0], // Dummy vector since we're not using vector search for users
                        payload: userPayload,
                    },
                ],
            });

            // Return user without password
            const { password, ...userWithoutPassword } = userPayload;
            return {
                ...userWithoutPassword,
                createdAt: now,
                updatedAt: undefined,
            };
        } catch (error) {
            this.logger.error('Error creating user:', error);
            throw error;
        }
    }

    async findAll(pagination: PaginationDto): Promise<{ users: User[]; total: number }> {
        try {
            const { limit = 20, offset = 0 } = pagination;

            const response = await this.databaseService.getClient().scroll(COLLECTIONS.USERS, {
                limit: limit,
                offset: offset,
                with_payload: true,
                with_vector: false,
            });

            const users = response.points.map(point => this.mapPointToUser(point));

            // Get total count
            const countResponse = await this.databaseService.getClient().count(COLLECTIONS.USERS);

            return {
                users,
                total: countResponse.count,
            };
        } catch (error) {
            this.logger.error('Error finding all users:', error);
            throw error;
        }
    }

    async findById(id: string): Promise<User | null> {
        try {
            const response = await this.databaseService.getClient().retrieve(COLLECTIONS.USERS, {
                ids: [id],
                with_payload: true,
                with_vector: false,
            });

            if (response.length === 0) {
                return null;
            }

            return this.mapPointToUser(response[0]);
        } catch (error) {
            this.logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            const response = await this.databaseService.getClient().search(COLLECTIONS.USERS, {
                vector: [0], // Dummy vector
                limit: 1,
                filter: {
                    must: [
                        {
                            key: 'email',
                            match: {
                                value: email,
                            },
                        },
                    ],
                },
                with_payload: true,
                with_vector: false,
            });

            if (response.length === 0) {
                return null;
            }

            return this.mapPointToUser(response[0]);
        } catch (error) {
            this.logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    async validateUser(email: string, password: string): Promise<User | null> {
        try {
            const response = await this.databaseService.getClient().search(COLLECTIONS.USERS, {
                vector: [0], // Dummy vector
                limit: 1,
                filter: {
                    must: [
                        {
                            key: 'email',
                            match: {
                                value: email,
                            },
                        },
                    ],
                },
                with_payload: true,
                with_vector: false,
            });

            if (response.length === 0) {
                return null;
            }

            const userPoint = response[0];
            const hashedPassword = userPoint.payload?.password as string;

            const isValid = await bcrypt.compare(password, hashedPassword);
            if (!isValid) {
                return null;
            }

            return this.mapPointToUser(userPoint);
        } catch (error) {
            this.logger.error('Error validating user:', error);
            throw error;
        }
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        try {
            const existingUser = await this.findById(id);
            if (!existingUser) {
                throw new Error('User not found');
            }

            const updatePayload: any = {
                updatedAt: new Date().toISOString(),
            };

            if (updateUserDto.name) {
                updatePayload.name = updateUserDto.name;
            }

            if (updateUserDto.email) {
                updatePayload.email = updateUserDto.email;
            }

            if (updateUserDto.password) {
                updatePayload.password = await bcrypt.hash(updateUserDto.password, 10);
            }

            await this.databaseService.getClient().setPayload(COLLECTIONS.USERS, {
                points: [id],
                payload: updatePayload,
            });

            // Return updated user
            const updatedUser = await this.findById(id);
            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            return updatedUser;
        } catch (error) {
            this.logger.error('Error updating user:', error);
            throw error;
        }
    }

    private mapPointToUser(point: any): User {
        const payload = point.payload;
        return {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            createdAt: new Date(payload.createdAt),
            updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
        };
    }
}