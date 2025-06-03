// seeders/movie-seeder.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmbeddingService } from '../movies/embedding.service';
import { COLLECTIONS } from '../database/database.constants';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface IMDBMovie {
    id: string;
    url: string;
    primaryTitle: string;
    originalTitle: string;
    type: string;
    description: string;
    primaryImage: string;
    trailer: string;
    contentRating: string;
    startYear: number;
    endYear: number | null;
    releaseDate: string;
    interests: string[];
    countriesOfOrigin: string[];
    externalLinks: string[];
    spokenLanguages: string[];
    filmingLocations: string[];
    productionCompanies: Array<{
        id: string;
        name: string;
    }>;
    budget: number;
    grossWorldwide: number;
    genres: string[];
    isAdult: boolean;
    runtimeMinutes: number;
    averageRating: number;
    numVotes: number;
    metascore: number;
}

@Injectable()
export class MovieSeederService implements OnModuleInit {
    private readonly logger = new Logger(MovieSeederService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly embeddingService: EmbeddingService,
    ) {}

    async onModuleInit() {
        // Auto-seed with delay and retry logic
        setTimeout(() => this.autoSeedWithRetry(), 5000); // Increased delay
    }

    private async autoSeedWithRetry(maxRetries = 3, currentAttempt = 1) {
        try {
            // Wait for database to be ready
            if (!this.databaseService.isReady()) {
                if (currentAttempt <= maxRetries) {
                    this.logger.log(`Database not ready, retrying in 3 seconds... (${currentAttempt}/${maxRetries})`);
                    setTimeout(() => this.autoSeedWithRetry(maxRetries, currentAttempt + 1), 3000);
                    return;
                } else {
                    this.logger.error('Database not ready after max retries, skipping auto-seeding');
                    return;
                }
            }

            // Check if movies collection exists
            const collectionExists = await this.databaseService.collectionExists(COLLECTIONS.MOVIES);
            if (!collectionExists) {
                this.logger.log('Movies collection does not exist, waiting for it to be created...');
                // Wait a bit more for the MoviesService to create the collection
                setTimeout(() => this.autoSeedWithRetry(maxRetries, currentAttempt), 2000);
                return;
            }

            // Check if movies already exist
            const movieCount = await this.databaseService.getClient().count(COLLECTIONS.MOVIES);
            if (movieCount.count === 0) {
                this.logger.log('No movies found, starting automatic seeding...');
                await this.seedFromJSON('top_movie.json');
            } else {
                this.logger.log(`Movies already exist in database (${movieCount.count}), skipping seeding`);
            }
        } catch (error) {
            if (currentAttempt <= maxRetries) {
                this.logger.warn(`Auto-seeding attempt ${currentAttempt} failed, retrying...`, error.message);
                setTimeout(() => this.autoSeedWithRetry(maxRetries, currentAttempt + 1), 3000);
            } else {
                this.logger.error('Auto-seeding failed after max retries:', error);
            }
        }
    }

    async seedFromJSON(jsonFilePath: string = 'top_movie.json'): Promise<void> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            this.logger.log('Starting movie database seeding from JSON...');

            const fullPath = path.resolve(jsonFilePath);

            if (!fs.existsSync(fullPath)) {
                this.logger.error(`JSON file not found: ${fullPath}`);
                this.logger.log('Please ensure top_movie.json is in the project root');
                return;
            }

            const jsonData = fs.readFileSync(fullPath, 'utf8');
            const movies: IMDBMovie[] = JSON.parse(jsonData);

            this.logger.log(`Found ${movies.length} movies in JSON file`);

            await this.seedMovies(movies);

            this.logger.log('Movie database seeding completed successfully!');

            // Log statistics
            const stats = await this.getSeededStatistics();
            this.logger.log('Seeding Statistics:', stats);

        } catch (error) {
            this.logger.error('Error seeding movie database:', error);
            throw error;
        }
    }

    private async seedMovies(movies: IMDBMovie[]): Promise<void> {
        this.logger.log('Seeding movies with vector embeddings...');

        const batchSize = 10; // Process in smaller batches to avoid memory issues
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < movies.length; i += batchSize) {
            const batch = movies.slice(i, i + batchSize);

            try {
                await this.processBatch(batch);
                successCount += batch.length;

                if ((i + batchSize) % 50 === 0) {
                    this.logger.log(`Processed ${i + batchSize}/${movies.length} movies`);
                }
            } catch (error) {
                this.logger.error(`Error processing batch ${i}-${i + batchSize}:`, error);
                errorCount += batch.length;
            }
        }

        this.logger.log(`Movie seeding completed: ${successCount} success, ${errorCount} errors`);
    }

    private async processBatch(movies: IMDBMovie[]): Promise<void> {
        const points = await Promise.all(
            movies.map(async (movie) => {
                try {
                    return await this.createMoviePoint(movie);
                } catch (error) {
                    this.logger.error(`Error creating point for movie ${movie.primaryTitle}:`, error);
                    return null;
                }
            })
        );

        const validPoints = points.filter(point => point !== null);

        if (validPoints.length > 0) {
            await this.databaseService.getClient().upsert(COLLECTIONS.MOVIES, {
                wait: true,
                points: validPoints,
            });
        }
    }

    private async createMoviePoint(movie: IMDBMovie): Promise<any> {
        const movieId = uuidv4();

        // Create searchable text for embedding
        const searchText = this.createSearchableText(movie);

        // Generate embedding for the movie
        const embedding = await this.embeddingService.generateEmbedding(searchText);

        // Extract release year from date
        const releaseYear = movie.startYear || new Date(movie.releaseDate).getFullYear();

        // Clean and organize genres
        const allGenres = [...new Set([...movie.genres, ...movie.interests])].filter(Boolean);

        // Create movie payload
        const payload = {
            id: movieId,
            imdbId: movie.id,
            title: movie.primaryTitle,
            originalTitle: movie.originalTitle,
            description: movie.description,
            releaseDate: movie.releaseDate,
            releaseYear: releaseYear,
            duration: movie.runtimeMinutes,
            language: movie.spokenLanguages[0] || 'en',
            country: movie.countriesOfOrigin[0] || 'US',
            imdbRating: movie.averageRating,
            posterUrl: movie.primaryImage,
            trailerUrl: movie.trailer,
            contentRating: movie.contentRating,
            budget: movie.budget,
            grossWorldwide: movie.grossWorldwide,
            numVotes: movie.numVotes,
            metascore: movie.metascore,
            isAdult: movie.isAdult,
            imdbUrl: movie.url,
            createdAt: new Date().toISOString(),

            // Array fields for filtering
            genres: allGenres,
            studios: movie.productionCompanies.map(company => company.name).filter(Boolean),
            countries: movie.countriesOfOrigin,
            languages: movie.spokenLanguages,

            // Additional searchable fields
            searchText: searchText,
        };

        return {
            id: movieId,
            vector: embedding,
            payload: payload,
        };
    }

    private createSearchableText(movie: IMDBMovie): string {
        // Combine multiple fields for better semantic search
        const parts = [
            movie.primaryTitle,
            movie.originalTitle,
            movie.description,
            movie.genres.join(' '),
            movie.interests.join(' '),
            movie.productionCompanies.map(c => c.name).join(' '),
        ].filter(Boolean);

        return parts.join(' ').toLowerCase();
    }

    async clearMovieData(): Promise<void> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            this.logger.log('Clearing all movie data...');

            // Delete the entire collection
            await this.databaseService.deleteCollection(COLLECTIONS.MOVIES);

            // Recreate the collection
            await this.databaseService.ensureCollection(COLLECTIONS.MOVIES, 384);

            this.logger.log('Movie data cleared successfully');
        } catch (error) {
            this.logger.error('Error clearing movie data:', error);
            throw error;
        }
    }

    async getSeededStatistics(): Promise<any> {
        try {
            if (!this.databaseService.isReady()) {
                return { error: 'Database not ready' };
            }

            const movieCount = await this.databaseService.getClient().count(COLLECTIONS.MOVIES);

            if (movieCount.count === 0) {
                return { movies: 0 };
            }

            // Get sample data for analysis
            const sampleResponse = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                limit: Math.min(1000, movieCount.count),
                with_payload: true,
                with_vector: false,
            });

            const genres = new Set<string>();
            const studios = new Set<string>();
            const countries = new Set<string>();
            const languages = new Set<string>();
            let totalRatings = 0;
            let ratedMovies = 0;

            sampleResponse.points.forEach(point => {
                const payload = point.payload;

                // Collect unique values
                if (payload?.genres) {
                    (payload.genres as string[]).forEach(genre => genres.add(genre));
                }
                if (payload?.studios) {
                    (payload.studios as string[]).forEach(studio => studios.add(studio));
                }
                if (payload?.countries) {
                    (payload.countries as string[]).forEach(country => countries.add(country));
                }
                if (payload?.languages) {
                    (payload.languages as string[]).forEach(language => languages.add(language));
                }

                // Calculate ratings
                if (payload?.imdbRating) {
                    totalRatings += payload.imdbRating as number;
                    ratedMovies++;
                }
            });

            return {
                movies: movieCount.count,
                genres: genres.size,
                studios: studios.size,
                countries: countries.size,
                languages: languages.size,
                averageRating: ratedMovies > 0 ? (totalRatings / ratedMovies).toFixed(2) : 0,
                sampleGenres: Array.from(genres).slice(0, 10),
                sampleStudios: Array.from(studios).slice(0, 10),
            };
        } catch (error) {
            this.logger.error('Error getting seeded statistics:', error);
            throw error;
        }
    }

    // Utility method to re-seed with new embeddings
    async regenerateEmbeddings(): Promise<void> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            this.logger.log('Regenerating embeddings for all movies...');

            const allMovies = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                limit: 10000,
                with_payload: true,
                with_vector: false,
            });

            const batchSize = 10;
            let processed = 0;

            for (let i = 0; i < allMovies.points.length; i += batchSize) {
                const batch = allMovies.points.slice(i, i + batchSize);

                const updates = await Promise.all(
                    batch.map(async (point) => {
                        const payload = point.payload;
                        const searchText = payload?.searchText as string || payload?.title as string || '';
                        const newEmbedding = await this.embeddingService.generateEmbedding(searchText);

                        return {
                            id: point.id,
                            vector: newEmbedding,
                            payload: payload || {},
                        };
                    })
                );

                await this.databaseService.getClient().upsert(COLLECTIONS.MOVIES, {
                    wait: true,
                    points: updates,
                });

                processed += batch.length;
                if (processed % 50 === 0) {
                    this.logger.log(`Regenerated embeddings for ${processed}/${allMovies.points.length} movies`);
                }
            }

            this.logger.log('Embedding regeneration completed');
        } catch (error) {
            this.logger.error('Error regenerating embeddings:', error);
            throw error;
        }
    }
}