import {FastifyInstance} from "fastify";
import {MovieModel} from "../../../models/movie"
export default async function usersEndpoint(fastify: FastifyInstance) {
    // Search movies
    const movieModel = new MovieModel(fastify);
    fastify.get<{
        Querystring: {
            q: string;
            limit?: number;
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

            const filters = {
                genres: genres ? genres.split(',') : undefined,
                yearFrom: yearFrom ? parseInt(yearFrom) : undefined,
                yearTo: yearTo ? parseInt(yearTo) : undefined,
                minRating: minRating ? parseFloat(minRating) : undefined,
                language: language ? language : undefined,
                limit:  limit ? Math.floor(limit) : 20
            };

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