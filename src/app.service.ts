import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
    constructor(private readonly databaseService: DatabaseService) {}

    getHello(): string {
        return 'NestJS + Fastify + Qdrant Movie API is running!';
    }

    async getHealthStatus() {
        const timestamp = new Date().toISOString();

        try {
            const dbHealth = await this.databaseService.healthCheck();

            return {
                status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
                timestamp,
                services: {
                    api: 'healthy',
                    database: dbHealth.status,
                },
                database: dbHealth,
            };
        } catch (error) {
            return {
                status: 'degraded',
                timestamp,
                services: {
                    api: 'healthy',
                    database: 'unhealthy',
                },
                error: error.message || 'Unknown error',
            };
        }
    }
}