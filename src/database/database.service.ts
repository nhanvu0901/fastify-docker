import {Injectable, OnModuleInit, OnModuleDestroy, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {QdrantClient} from '@qdrant/js-client-rest';

export interface QdrantConfig {
    host: string;
    port: number;
    apiKey?: string;
    https?: boolean;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private client: QdrantClient;

    constructor(private configService: ConfigService) {
    }

    async onModuleInit() {
        try {
            const config: QdrantConfig = {
                host: this.configService.get<string>('QDRANT_HOST') || 'localhost',
                port: parseInt(this.configService.get<string>('QDRANT_PORT') || '6333'),
                https: this.configService.get<string>('QDRANT_HTTPS') === 'true',
            };

            // Only include apiKey if it exists
            const apiKey = this.configService.get<string>('QDRANT_API_KEY');

            if (apiKey) {
                this.client = new QdrantClient({
                    url: `${config.https ? 'https' : 'http'}://${config.host}:${config.port}`,
                    apiKey: apiKey,
                });
            } else {
                this.client = new QdrantClient({
                    url: `${config.https ? 'https' : 'http'}://${config.host}:${config.port}`,
                });
            }
        } catch (error) {
            this.logger.error('Qdrant health check failed:', error);
        }
    }

    async onModuleDestroy() {
        // Qdrant client doesn't require explicit cleanup
        this.logger.log('Qdrant connection closed');
    }

    getClient(): QdrantClient {
        if (!this.client) {
            throw new Error('Qdrant client is not initialized');
        }
        return this.client;
    }

    async healthCheck() {
        try {
            const collections = await this.client.getCollections();
            return {
                status: 'healthy',
                cluster: collections,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Qdrant health check failed:', error);
            throw new Error(`Qdrant health check failed:`);
        }
    }

    // Collection management helpers
    async ensureCollection(
        collectionName: string,
        vectorSize: number,
        distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
    ) {
        try {
            const collections = await this.client.getCollections();
            const exists = collections.collections.some(
                (collection) => collection.name === collectionName
            );

            if (!exists) {
                await this.client.createCollection(collectionName, {
                    vectors: {
                        size: vectorSize,
                        distance: distance,
                    },
                });
                this.logger.log(`Created collection: ${collectionName}`);
            } else {
                this.logger.log(`Collection already exists: ${collectionName}`);
            }
        } catch (error) {
            this.logger.error(`Failed to ensure collection ${collectionName}:`, error);
            throw error;
        }
    }

    async deleteCollection(collectionName: string) {
        try {
            await this.client.deleteCollection(collectionName);
            this.logger.log(`Deleted collection: ${collectionName}`);
        } catch (error) {
            this.logger.error(`Failed to delete collection ${collectionName}:`, error);
            throw error;
        }
    }

    // Index management
    async createIndex(collectionName: string, fieldName: string, fieldType: string) {
        try {
            await this.client.createPayloadIndex(collectionName, {
                field_name: fieldName,
                field_schema: fieldType as any,
            });
            this.logger.log(`Created index on ${collectionName}.${fieldName}`);
        } catch (error) {
            this.logger.error(`Failed to create index on ${collectionName}.${fieldName}:`, error);
            throw error;
        }
    }
}