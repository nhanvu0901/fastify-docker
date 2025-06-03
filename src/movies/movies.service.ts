import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { COLLECTIONS, VECTOR_DIMENSIONS } from '../database/database.constants';
import { EmbeddingService } from './embedding.service';
import { MovieSearchDto } from './dto/movie-search.dto';
import { Movie } from '../common/interfaces';

@Injectable()
export class MoviesService implements OnModuleInit {
    private readonly logger = new Logger(MoviesService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly embeddingService: EmbeddingService,
    ) {}

    async onModuleInit() {
        // Initialize with retry logic
        setTimeout(() => this.initializeCollectionWithRetry(), 1000);
    }

    private async initializeCollectionWithRetry(maxRetries = 5, currentAttempt = 1) {
        try {
            if (!this.databaseService.isReady()) {
                if (currentAttempt <= maxRetries) {
                    this.logger.log(`Database not ready, retrying collection initialization... (${currentAttempt}/${maxRetries})`);
                    setTimeout(() => this.initializeCollectionWithRetry(maxRetries, currentAttempt + 1), 2000);
                    return;
                } else {
                    this.logger.error('Database not ready after max retries, skipping collection initialization');
                    return;
                }
            }

            await this.initializeCollection();
        } catch (error) {
            if (currentAttempt <= maxRetries) {
                this.logger.warn(`Collection initialization attempt ${currentAttempt} failed, retrying...`, error.message);
                setTimeout(() => this.initializeCollectionWithRetry(maxRetries, currentAttempt + 1), 2000);
            } else {
                this.logger.error('Failed to initialize movies collection after max retries:', error);
            }
        }
    }

    private async initializeCollection() {
        try {
            // Create movies collection with vector embeddings
            await this.databaseService.ensureCollection(
                COLLECTIONS.MOVIES,
                VECTOR_DIMENSIONS.MOVIE_EMBEDDINGS,
                'Cosine'
            );

            // Create indexes for filtering
            await this.databaseService.createIndex(COLLECTIONS.MOVIES, 'title', 'text');
            await this.databaseService.createIndex(COLLECTIONS.MOVIES, 'genres', 'keyword');
            await this.databaseService.createIndex(COLLECTIONS.MOVIES, 'releaseYear', 'integer');
            await this.databaseService.createIndex(COLLECTIONS.MOVIES, 'imdbRating', 'float');
            await this.databaseService.createIndex(COLLECTIONS.MOVIES, 'language', 'keyword');

            this.logger.log('Movies collection initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize movies collection:', error);
            throw error;
        }
    }

    async searchMovies(searchDto: MovieSearchDto): Promise<{ movies: Movie[] }> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            let searchVector: number[] | null = null;

            // If there's a text query, generate embedding for semantic search
            if (searchDto.q) {
                searchVector = await this.embeddingService.generateEmbedding(searchDto.q);
            }

            const filter = this.buildFilter(searchDto);

            if (searchVector) {
                // Semantic search with vector similarity
                const response = await this.databaseService.getClient().search(COLLECTIONS.MOVIES, {
                    vector: searchVector,
                    limit: searchDto.limit || 20,
                    filter,
                    with_payload: true,
                    with_vector: false,
                    score_threshold: 0.3, // Minimum similarity threshold
                });

                const movies = response.map(point => this.mapPointToMovie(point));
                return { movies };
            } else {
                // Filter-only search (no text query)
                const response = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                    limit: searchDto.limit || 20,
                    filter,
                    with_payload: true,
                    with_vector: false,
                });

                const movies = response.points.map(point => this.mapPointToMovie(point));
                return { movies };
            }
        } catch (error) {
            this.logger.error('Error searching movies:', error);
            throw error;
        }
    }

    async findAll(searchDto: MovieSearchDto): Promise<{ movies: Movie[]; total: number }> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            const filter = this.buildFilter(searchDto);

            const response = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                limit: searchDto.limit || 20,
                filter,
                with_payload: true,
                with_vector: false,
            });

            const movies = response.points.map(point => this.mapPointToMovie(point));

            // Get total count with same filter
            const countResponse = await this.databaseService.getClient().count(COLLECTIONS.MOVIES, {
                filter,
            });

            return {
                movies,
                total: countResponse.count,
            };
        } catch (error) {
            this.logger.error('Error finding all movies:', error);
            throw error;
        }
    }

    async getAllGenres(): Promise<string[]> {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            // Get all unique genres from movie collection
            const response = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                limit: 10000, // Get all movies to extract genres
                with_payload: ['genres'],
                with_vector: false,
            });

            const genresSet = new Set<string>();
            response.points.forEach(point => {
                const genres = point.payload?.genres as string[];
                if (genres) {
                    genres.forEach(genre => genresSet.add(genre));
                }
            });

            return Array.from(genresSet).sort();
        } catch (error) {
            this.logger.error('Error getting genres:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            if (!this.databaseService.isReady()) {
                throw new Error('Database is not ready');
            }

            const totalMovies = await this.databaseService.getClient().count(COLLECTIONS.MOVIES);

            // Get some sample data for statistics
            const sampleMovies = await this.databaseService.getClient().scroll(COLLECTIONS.MOVIES, {
                limit: 1000,
                with_payload: true,
                with_vector: false,
            });

            const genres = new Set<string>();
            const languages = new Set<string>();
            const countries = new Set<string>();
            let totalRatings = 0;
            let ratedMovies = 0;

            sampleMovies.points.forEach(point => {
                const payload = point.payload;

                if (payload?.genres) {
                    (payload.genres as string[]).forEach(genre => genres.add(genre));
                }
                if (payload?.language) {
                    languages.add(payload.language as string);
                }
                if (payload?.country) {
                    countries.add(payload.country as string);
                }
                if (payload?.imdbRating) {
                    totalRatings += payload.imdbRating as number;
                    ratedMovies++;
                }
            });

            return {
                movies: totalMovies.count,
                genres: genres.size,
                languages: languages.size,
                countries: countries.size,
                averageRating: ratedMovies > 0 ? (totalRatings / ratedMovies).toFixed(2) : 0,
                sampleSize: sampleMovies.points.length,
            };
        } catch (error) {
            this.logger.error('Error getting statistics:', error);
            throw error;
        }
    }

    private buildFilter(searchDto: MovieSearchDto): any {
        const mustConditions: any[] = [];

        if (searchDto.genres && searchDto.genres.length > 0) {
            mustConditions.push({
                key: 'genres',
                match: {
                    any: searchDto.genres,
                },
            });
        }

        if (searchDto.yearFrom) {
            mustConditions.push({
                key: 'releaseYear',
                range: {
                    gte: searchDto.yearFrom,
                },
            });
        }

        if (searchDto.yearTo) {
            mustConditions.push({
                key: 'releaseYear',
                range: {
                    lte: searchDto.yearTo,
                },
            });
        }

        if (searchDto.minRating) {
            mustConditions.push({
                key: 'imdbRating',
                range: {
                    gte: searchDto.minRating,
                },
            });
        }

        if (searchDto.language) {
            mustConditions.push({
                key: 'language',
                match: {
                    value: searchDto.language,
                },
            });
        }

        return mustConditions.length > 0 ? { must: mustConditions } : undefined;
    }

    private mapPointToMovie(point: any): Movie {
        const payload = point.payload;
        return {
            id: payload.id,
            title: payload.title,
            originalTitle: payload.originalTitle,
            description: payload.description,
            releaseDate: new Date(payload.releaseDate),
            duration: payload.duration,
            imdbId: payload.imdbId,
            imdbRating: payload.imdbRating,
            imdbUrl: payload.imdbUrl,
            tmdbId: payload.tmdbId,
            posterUrl: payload.posterUrl,
            trailerUrl: payload.trailerUrl,
            contentRating: payload.contentRating,
            language: payload.language,
            country: payload.country,
            budget: payload.budget,
            grossWorldwide: payload.grossWorldwide,
            revenue: payload.revenue,
            numVotes: payload.numVotes,
            metascore: payload.metascore,
            isAdult: payload.isAdult,
            createdAt: new Date(payload.createdAt),
            score: point.score, // Vector similarity score
            genres: payload.genres,
            studios: payload.studios,
            countries: payload.countries,
            languages: payload.languages,
        };
    }
}