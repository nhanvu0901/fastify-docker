import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class EmbeddingService {
    private readonly logger = new Logger(EmbeddingService.name);

    constructor(private configService: ConfigService) {
    }

    async generateEmbedding(text: string, maxRetries = 15, currentAttempt = 1): Promise<number[]> {
        try {
            const api_key = process.env.COHERE_API_KEY || this.configService.get<string>('COHERE_API_KEY');

            if (!api_key) {
                this.logger.warn('COHERE_API_KEY not found, using simple embedding');
                return this.simpleTextEmbedding(text.toLowerCase().trim());
            }

            const response = await fetch('https://api.cohere.ai/v1/embed', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${api_key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    texts: [text],
                    model: 'embed-english-v3.0',
                    input_type: 'search_document',
                    embedding_types: ['float']
                }),
            });

            // Success case
            if (response.ok) {
                const data = await response.json();
                this.logger.debug('Successfully generated embedding with Cohere');
                return data.embeddings.float[0];
            }

            // Handle different error cases
            if (response.status === 429) {
                // Rate limit - retry with exponential backoff
                if (currentAttempt <= maxRetries) {
                    const delayMs = Math.pow(2, currentAttempt - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
                    this.logger.warn(`Cohere rate limit hit, retrying in ${delayMs}ms (attempt ${currentAttempt}/${maxRetries})`);

                    await this.delay(delayMs);
                    return this.generateEmbedding(text, maxRetries, currentAttempt + 1);
                }
            } else if (response.status >= 500) {
                // Server error - retry with shorter delay
                if (currentAttempt <= maxRetries) {
                    const delayMs = 2000; // Fixed 2s delay for server errors
                    this.logger.warn(`Cohere server error (${response.status}), retrying in ${delayMs}ms (attempt ${currentAttempt}/${maxRetries})`);

                    await this.delay(delayMs);
                    return this.generateEmbedding(text, maxRetries, currentAttempt + 1);
                }
            } else {
                // Client error (400-499) - don't retry, these won't succeed
                this.logger.error(`Cohere client error (${response.status}): ${response.statusText}`);
            }

            // Max retries exceeded or non-retryable error
            this.logger.warn(`Cohere API failed after ${currentAttempt} attempts, falling back to simple embedding`);
            return this.simpleTextEmbedding(text.toLowerCase().trim());

        } catch (error) {
            // Network or other unexpected errors
            if (currentAttempt <= maxRetries) {
                const delayMs = 2000;
                this.logger.warn(`Network error with Cohere API, retrying in ${delayMs}ms (attempt ${currentAttempt}/${maxRetries}): ${error.message}`);

                await this.delay(delayMs);
                return this.generateEmbedding(text, maxRetries, currentAttempt + 1);
            }

            this.logger.error('Cohere API failed completely, using simple embedding:', error.message);
            return this.simpleTextEmbedding(text.toLowerCase().trim());
        }
    }


    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private simpleTextEmbedding(text: string): number[] {
        const dimension = 384;
        const embedding = new Array(dimension).fill(0);

        // Improved approach: use multiple hash functions for better distribution
        const words = text.split(' ').filter(word => word.length > 2);

        words.forEach((word, wordIndex) => {
            for (let i = 0; i < word.length; i++) {
                const char = word.charCodeAt(i);
                const hash1 = (char * (wordIndex + 1) * 31) % dimension;
                const hash2 = (char * (wordIndex + 1) * 37) % dimension;
                const hash3 = (char * (wordIndex + 1) * 41) % dimension;

                embedding[hash1] += Math.sin(char * 0.1) * 0.3;
                embedding[hash2] += Math.cos(char * 0.1) * 0.3;
                embedding[hash3] += Math.tan(char * 0.01) * 0.2;
            }
        });

        // Enhanced normalization
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] = embedding[i] / magnitude;
            }
        }

        return embedding;
    }

}