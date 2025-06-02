import {FastifyInstance} from "fastify";
import {MovieModel} from "../../../models/movie"

export default async function usersEndpoint(fastify: FastifyInstance) {
    // Search movies
    const movieModel = new MovieModel(fastify);
    fastify.get<{
        Querystring: {
            q: string;
            limit?: string; // Change to string since query params are strings
            genres?: string;
            yearFrom?: string;
            yearTo?: string;
            minRating?: string;
            language?: string;
        }
    }>('/movies/search', async (request, reply) => {
        try {
            const { q, limit, genres, yearFrom, yearTo, minRating, language } = request.query;

            if (!q) {
                return reply.status(400).send({ error: 'Search query (q) is required' });
            }

            // Simple parameter parsing - let Neo4j handle the integer conversion
            const filters = {
                genres: genres ? genres.split(',') : undefined,
                yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
                yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
                minRating: minRating ? parseFloat(minRating) : undefined,
                language: language ? language : undefined,
                limit: limit ? parseInt(limit, 10) : 20 // Parse but let Neo4j handle final conversion
            };

            // Basic validation
            if (filters.limit && (isNaN(filters.limit) || filters.limit < 0)) {
                return reply.status(400).send({ error: 'Limit must be a non-negative number' });
            }

            // Cap the limit
            if (filters.limit && filters.limit > 100) {
                filters.limit = 100;
            }

            const movies = await movieModel.searchMovies(q, filters);

            return {
                movies,
                count: movies.length,
                query: q,
                filters
            };
        } catch (error) {
            fastify.log.error('Error searching movies:', error);
            return reply.status(500).send({ error: 'Failed to search movies' });
        }
    });
}