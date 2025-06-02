import {FastifyInstance} from "fastify";
import {Record as Neo4jRecord} from "neo4j-driver";
import {Movie} from "../types";
interface QueryParams {
    query: string;
    limit: number;
    genres?: string[] | undefined;
    yearFrom?: string | undefined;
    yearTo?: string | undefined;
    language?: string | undefined;
    minRating?: number | undefined;
}
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
            let conditions: string[] = [
                'movie.title CONTAINS $query OR movie.description CONTAINS $query'
            ]
            let params:QueryParams = {query, limit}
            if (genres && genres.length > 0) {
                conditions.push(` AND ANY(genre_data in $genres WHERE genre.name CONTAINS genre_data)`);
                params.genres = genres;
            }
            if (yearFrom) {
                conditions.push(` AND movie.releaseDate >= date($yearFrom)`);
                params.yearFrom = `${yearFrom}-01-01`;
            }

            if (yearTo) {
                conditions.push(` AND movie.releaseDate <= date($yearTo)`);
                params.yearTo = `${yearTo}-12-31`;
            }

            if (language) {
                conditions.push(` AND movie.language = $language`);
                params.language = language;
            }
            const whereClause = conditions.join(' ');
            const result = await this.fastify.queryDatabase(`
    MATCH (movie:Movie)
    ${genres && genres.length > 0 ? ` MATCH(movie)-[:BELONGS_TO]->(genre:Genre)` : ''}
    WHERE ${whereClause}
    OPTIONAL MATCH (movie)<-[r:RATED]-()
    WITH movie, AVG(r.score) as avgRating, COUNT(r) as ratingsCount
    ${filters?.minRating ? 'WHERE avgRating >= $minRating' : ''}
    RETURN movie, avgRating, ratingsCount
    ORDER BY avgRating DESC, ratingsCount DESC
    LIMIT $limit
  `, {...params, ...(minRating && {minRating: minRating})});//...{attrribute in params}, ... (true && {minRating})
            return result.records.map(record => this.recordToMovie(record));
        } catch (err) {
            this.fastify.log.error('Error searching movies:', err);
            throw err;
        }
    }

}