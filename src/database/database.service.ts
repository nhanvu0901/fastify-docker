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
    // implements It's like a promise that your class will have certain methods.
    private readonly logger = new Logger(DatabaseService.name);
    private client: QdrantClient;
    private isInitialized = false;

    constructor(private configService: ConfigService) {
    }
    //When it runs: After all module dependencies have been resolved and injected
    //Purpose: Perfect for initialization logic that needs dependencies to be ready
    async onModuleInit() {
        await this.initializeClient();
    }

    private async initializeClient() {
        try {
            const config: QdrantConfig = {
                host: this.configService.get<string>('QDRANT_HOST') || 'localhost',
                port: parseInt(this.configService.get<string>('QDRANT_PORT') || '6333'),
                https: this.configService.get<string>('QDRANT_HTTPS') === 'true',
            };

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

            // Test the connection
            await this.client.getCollections();
            this.isInitialized = true;
            this.logger.log('Qdrant client initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Qdrant client:', error);
            // Don't throw here - let the application start but mark as not initialized
        }
    }
    // When it runs: Just before the application shuts down
    // Purpose: Cleanup resources, close connections, save data
    async onModuleDestroy() {
        this.isInitialized = false;
        this.logger.log('Qdrant connection closed');
    }

    getClient(): QdrantClient {
        if (!this.client || !this.isInitialized) {
            throw new Error('Qdrant client is not initialized');
        }
        return this.client;
    }

    isReady(): boolean {
        return this.isInitialized && !!this.client;
    }

    async healthCheck() {
        try {
            if (!this.isReady()) {
                throw new Error('Qdrant client not initialized');
            }

            const collections = await this.client.getCollections();
            return {
                status: 'healthy',
                cluster: collections,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Qdrant health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }

    // Collection management helpers
    async ensureCollection(
        collectionName: string,
        vectorSize: number,
        distance: 'Cosine' | 'Euclid' | 'Dot' = 'Cosine'
    ) {
        try {
            if (!this.isReady()) {
                throw new Error('Qdrant client not initialized');
            }

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
            if (!this.isReady()) {
                throw new Error('Qdrant client not initialized');
            }

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
            if (!this.isReady()) {
                throw new Error('Qdrant client not initialized');
            }

            await this.client.createPayloadIndex(collectionName, {
                field_name: fieldName,
                field_schema: fieldType as any,
            });
            this.logger.log(`Created index on ${collectionName}.${fieldName}`);
        } catch (error) {
            this.logger.error(`Failed to create index on ${collectionName}.${fieldName}:`, error);
            // Don't throw for index creation failures - they're not critical
        }
    }


    async collectionExists(collectionName: string):Promise<boolean> {
        try{
            if(!this.isReady()) {
                throw new Error('Qdrant client not initialized');
                return false
            }

            const collection = await this.client.getCollection(collectionName);
            return collection?.optimizer_status === 'ok';
        }
        catch(error) {
            this.logger.error(`Failed to check if collection ${collectionName} exists:`, error);
            return false;
        }
    }

    /*async collectionExists(collectionName: string): Promise<boolean> {
        try {
            if (!this.isReady()) {
                return false;
            }

            const collections = await this.client.getCollections();
            return collections.collections.some(
                (collection) => collection.name === collectionName
            );
        } catch (error) {
            this.logger.error(`Failed to check if collection ${collectionName} exists:`, error);
            return false;
        }
    }*/


}