import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
    constructor(private readonly databaseService: DatabaseService) {}

    getHello(): string {
        return 'NestJS + Fastify + Qdrant Movie API is running!';
    }

    async getHealthStatus() {
        try {
            const dbHealth = await this.databaseService.healthCheck();
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                services: {
                    api: 'healthy',
                    database: dbHealth.status,
                },
                database: dbHealth,
            };
        } catch (error) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                services: {
                    api: 'healthy',
                    database: 'unhealthy',
                },
                error: error.message || 'Unknown error',
            };
        }
    }
}