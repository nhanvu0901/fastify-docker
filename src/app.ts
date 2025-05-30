import {createServer} from './api/server';
import {RealMovieSeeder} from "./utils/realMovieSeeder";

// Start server
const start = async (): Promise<void> => {
  try {
    const server = await createServer();

    try {
      const movieSeeder = new RealMovieSeeder(server, 'top_movie.json');
      await movieSeeder.seedDatabase();

      // Log seeding statistics
      const stats = await movieSeeder.initMovieRelatedDatabase();
      server.log.info('Database seeding completed:', stats);
      console.log('📊 Database Stats:', {
        movies: stats.movies,
        genres: stats.genres,
        studios: stats.studios,
        countries: stats.countries,
        languages: stats.languages,
        sampleRatings: stats.ratings
      });
    } catch (err) {
      server.log.error('Failed to seed movie database:', err);
      console.log('⚠️  Seeding failed - server will continue without sample data');
      console.log('   Make sure top_movie.json is in the project root directory');
    }


    await server.listen({port: Number(process.env.PORT) || 3000, host: '0.0.0.0'});
    console.log(`🚀 Server is running on port ${process.env.PORT || 3000}`);
    console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT || 3000}/documentation`);
    console.log(`🎬 Movie API ready at: http://localhost:${process.env.PORT || 3000}/api/movies`);
    console.log(`👥 User API ready at: http://localhost:${process.env.PORT || 3000}/api/fastify`);
    console.log(`🎯 Try: http://localhost:${process.env.PORT || 3000}/api/movies/movies to see your IMDB Top 250!`);

    const shutdown = async () => {
      console.log('Shutting down server...');
      await server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {

    process.exit(1);
  }
};
start();