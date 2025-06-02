import {FastifyInstance} from "fastify";
import {Record as Neo4jRecord} from "neo4j-driver";
import {Movie} from "../types";


export class MovieModel {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    private recordToMovie(record: Neo4jRecord, movieKey: string = 'movie'): Movie {
        const node = record.get(movieKey);
        return {
            id: node.identity.toString(),
            title: node.properties.title,
            description: node.properties.description,
            releaseDate: new Date(node.properties.releaseDate),
            duration: node.properties.duration,
            imdbRating: node.properties.imdbRating,
            tmdbId: node.properties.tmdbId,
            posterUrl: node.properties.posterUrl,
            trailerUrl: node.properties.trailerUrl,
            language: node.properties.language,
            country: node.properties.country,
            budget: node.properties.budget,
            revenue: node.properties.revenue,
            createdAt: new Date(node.properties.createdAt),
            avgRating: record.has('avgRating') ? record.get('avgRating') : undefined,
            ratingsCount: record.has('ratingsCount') ? record.get('ratingsCount') : undefined
        };
    }

    async searchMovies(query: string, filters?: {
        genres?: string[] | undefined;
        yearFrom?: number | undefined;
        yearTo?: number | undefined;
        minRating?: number | undefined;
        language?: string | undefined;
        limit?: number;
    }): Promise<Movie[]> {
        try {
            const {genres, yearFrom, yearTo, minRating, language, limit = 20} = filters || {};

            // Ensure limit is definitely an integer - this is critical for Neo4j
            const safeLimit = Math.floor(Math.abs(Number(limit)));

            let conditions: string[] = [
                'movie.title CONTAINS $query OR movie.description CONTAINS $query'
            ];

            // Create params object with explicit integer for limit
            let params: any = {
                query,
                limit: safeLimit  // Guaranteed to be a positive integer
            };

            if (genres && genres.length > 0) {
                conditions.push('ANY(genre_data in $genres WHERE genre.name CONTAINS genre_data)');
                params.genres = genres;
            }

            if (yearFrom) {
                conditions.push('movie.releaseDate >= date($yearFrom)');
                params.yearFrom = `${yearFrom}-01-01`;
            }

            if (yearTo) {
                conditions.push('movie.releaseDate <= date($yearTo)');
                params.yearTo = `${yearTo}-12-31`;
            }

            if (language) {
                conditions.push('movie.language = $language');
                params.language = language;
            }

            // Build the WHERE clause properly
            const whereClause = conditions.join(' AND ');

            // Build the query with proper conditional MATCH for genres
            let cypher = `
            MATCH (movie:Movie)
            ${genres && genres.length > 0 ? 'MATCH (movie)-[:BELONGS_TO]->(genre:Genre)' : ''}
            WHERE ${whereClause}
            OPTIONAL MATCH (movie)<-[r:RATED]-()
            WITH movie, AVG(r.score) as avgRating, COUNT(r) as ratingsCount
            ${minRating ? 'WHERE avgRating >= $minRating' : ''}
            RETURN movie, avgRating, ratingsCount
            ORDER BY avgRating DESC, ratingsCount DESC
            LIMIT $limit
        `;

            // Add minRating to params if provided
            if (minRating) {
                params.minRating = minRating;
            }

            const result = await this.fastify.queryDatabase(cypher, params);
            return result.records.map(record => this.recordToMovie(record));
        } catch (err) {
            this.fastify.log.error('Error searching movies:', err);
            throw err;
        }
    }

}