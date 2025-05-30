// src/utils/realMovieSeeder.ts
import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

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

export class RealMovieSeeder {
  private fastify: FastifyInstance;
  private jsonFilePath: string;

  constructor(fastify: FastifyInstance, jsonFilePath: string = 'top_movie.json') {
    this.fastify = fastify;
    this.jsonFilePath = path.resolve(jsonFilePath);
  }

  async seedDatabase(): Promise<void> {
    try {
      this.fastify.log.info('Starting real movie database seeding from JSON...');

      // Check if data already exists
      const existingMovies = await this.fastify.queryDatabase('MATCH (m:Movie) RETURN COUNT(m) as count');
      if (existingMovies.records[0].get('count') > 0) {
        this.fastify.log.info('Movies already exist in database, skipping seeding');
        return;
      }

      // Check if JSON file exists
      if (!fs.existsSync(this.jsonFilePath)) {
        this.fastify.log.error(`JSON file not found: ${this.jsonFilePath}`);
        this.fastify.log.info('Please ensure top_movie.json is in the project root');
        return;
      }

      // Read and parse JSON file
      const jsonData = fs.readFileSync(this.jsonFilePath, 'utf8');
      const movies: IMDBMovie[] = JSON.parse(jsonData);

      this.fastify.log.info(`Found ${movies.length} movies in JSON file`);

      // Create constraints and indexes first
      await this.createConstraintsAndIndexes();

      // Extract and seed unique data
      await this.seedGenres(movies);
      await this.seedStudios(movies);
      await this.seedCountries(movies);
      await this.seedLanguages(movies);

      // Seed movies
      await this.seedMovies(movies);

      // Add some sample ratings for demonstration
      await this.seedSampleRatings();

      this.fastify.log.info('Real movie database seeding completed successfully!');
    } catch (error) {
      this.fastify.log.error('Error seeding real movie database:', error);
      throw error;
    }
  }

  private async createConstraintsAndIndexes(): Promise<void> {
    this.fastify.log.info('Creating constraints and indexes...');

    // Constraints
    await this.fastify.queryDatabase('CREATE CONSTRAINT movie_imdb_id_unique IF NOT EXISTS FOR (movie:Movie) REQUIRE movie.imdbId IS UNIQUE');
    await this.fastify.queryDatabase('CREATE CONSTRAINT genre_name_unique IF NOT EXISTS FOR (genre:Genre) REQUIRE genre.name IS UNIQUE');
    await this.fastify.queryDatabase('CREATE CONSTRAINT studio_name_unique IF NOT EXISTS FOR (studio:Studio) REQUIRE studio.name IS UNIQUE');
    await this.fastify.queryDatabase('CREATE CONSTRAINT country_name_unique IF NOT EXISTS FOR (country:Country) REQUIRE country.name IS UNIQUE');
    await this.fastify.queryDatabase('CREATE CONSTRAINT language_code_unique IF NOT EXISTS FOR (language:Language) REQUIRE language.code IS UNIQUE');

    // Indexes for performance
    await this.fastify.queryDatabase('CREATE INDEX movie_title_text IF NOT EXISTS FOR (movie:Movie) ON (movie.title)');
    await this.fastify.queryDatabase('CREATE INDEX movie_release_date IF NOT EXISTS FOR (movie:Movie) ON (movie.releaseDate)');
    await this.fastify.queryDatabase('CREATE INDEX movie_rating IF NOT EXISTS FOR (movie:Movie) ON (movie.imdbRating)');
    await this.fastify.queryDatabase('CREATE INDEX rating_score IF NOT EXISTS FOR ()-[r:RATED]-() ON (r.score)');
    await this.fastify.queryDatabase('CREATE INDEX rating_timestamp IF NOT EXISTS FOR ()-[r:RATED]-() ON (r.timestamp)');
  }

  private async seedGenres(movies: IMDBMovie[]): Promise<void> {
    this.fastify.log.info('Seeding genres...');

    const uniqueGenres = new Set<string>();
    movies.forEach(movie => {
      movie.genres.forEach(genre => uniqueGenres.add(genre));
      movie.interests.forEach(interest => uniqueGenres.add(interest));
    });

    for (const genreName of uniqueGenres) {
      await this.fastify.queryDatabase(`
        MERGE (g:Genre {name: $name})
        SET g.description = CASE 
          WHEN g.description IS NULL THEN $description 
          ELSE g.description 
        END
      `, {
        name: genreName,
        description: this.getGenreDescription(genreName)
      });
    }

    this.fastify.log.info(`Seeded ${uniqueGenres.size} genres`);
  }

  private async seedStudios(movies: IMDBMovie[]): Promise<void> {
    this.fastify.log.info('Seeding production studios...');

    const uniqueStudios = new Set<string>();
    movies.forEach(movie => {
      movie.productionCompanies.forEach(company => {
        if (company.name) {
          uniqueStudios.add(company.name);
        }
      });
    });

    for (const studioName of uniqueStudios) {
      await this.fastify.queryDatabase(`
        MERGE (s:Studio {name: $name})
      `, { name: studioName });
    }

    this.fastify.log.info(`Seeded ${uniqueStudios.size} studios`);
  }

  private async seedCountries(movies: IMDBMovie[]): Promise<void> {
    this.fastify.log.info('Seeding countries...');

    const uniqueCountries = new Set<string>();
    movies.forEach(movie => {
      movie.countriesOfOrigin.forEach(country => uniqueCountries.add(country));
    });

    for (const countryCode of uniqueCountries) {
      await this.fastify.queryDatabase(`
        MERGE (c:Country {code: $code})
        SET c.name = $name
      `, {
        code: countryCode,
        name: this.getCountryName(countryCode)
      });
    }

    this.fastify.log.info(`Seeded ${uniqueCountries.size} countries`);
  }

  private async seedLanguages(movies: IMDBMovie[]): Promise<void> {
    this.fastify.log.info('Seeding languages...');

    const uniqueLanguages = new Set<string>();
    movies.forEach(movie => {
      movie.spokenLanguages.forEach(lang => uniqueLanguages.add(lang));
    });

    for (const langCode of uniqueLanguages) {
      await this.fastify.queryDatabase(`
        MERGE (l:Language {code: $code})
        SET l.name = $name
      `, {
        code: langCode,
        name: this.getLanguageName(langCode)
      });
    }

    this.fastify.log.info(`Seeded ${uniqueLanguages.size} languages`);
  }

  private async seedMovies(movies: IMDBMovie[]): Promise<void> {
    this.fastify.log.info('Seeding movies...');

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];

      try {
        // Create movie node
        await this.fastify.queryDatabase(`
          MERGE (m:Movie {imdbId: $imdbId})
          SET m.title = $title,
              m.originalTitle = $originalTitle,
              m.description = $description,
              m.releaseDate = date($releaseDate),
              m.duration = $duration,
              m.language = $language,
              m.country = $country,
              m.imdbRating = $imdbRating,
              m.posterUrl = $posterUrl,
              m.trailerUrl = $trailerUrl,
              m.contentRating = $contentRating,
              m.budget = $budget,
              m.grossWorldwide = $grossWorldwide,
              m.numVotes = $numVotes,
              m.metascore = $metascore,
              m.isAdult = $isAdult,
              m.imdbUrl = $imdbUrl,
              m.createdAt = datetime()
        `, {
          imdbId: movie.id,
          title: movie.primaryTitle,
          originalTitle: movie.originalTitle,
          description: movie.description,
          releaseDate: movie.releaseDate,
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
          imdbUrl: movie.url
        });

        const uniqueGenres = new Set<string>();
        movies.forEach(movie => {
          movie.genres.forEach(genre => uniqueGenres.add(genre));
          movie.interests.forEach(interest => uniqueGenres.add(interest));
        });
        for (const genreName of uniqueGenres) {
          await this.fastify.queryDatabase(`
            MATCH (m:Movie {imdbId: $imdbId}), (g:Genre {name: $genreName})
            MERGE (m)-[:BELONGS_TO]->(g)
          `, { imdbId: movie.id, genreName });
        }

        // Connect to production companies
        for (const company of movie.productionCompanies) {
          if (company.name) {
            await this.fastify.queryDatabase(`
              MATCH (m:Movie {imdbId: $imdbId}), (s:Studio {name: $studioName})
              MERGE (m)-[:PRODUCED_BY]->(s)
            `, { imdbId: movie.id, studioName: company.name });
          }
        }

        // Connect to countries
        for (const countryCode of movie.countriesOfOrigin) {
          await this.fastify.queryDatabase(`
            MATCH (m:Movie {imdbId: $imdbId}), (c:Country {code: $countryCode})
            MERGE (m)-[:FILMED_IN]->(c)
          `, { imdbId: movie.id, countryCode });
        }

        // Connect to languages
        for (const langCode of movie.spokenLanguages) {
          await this.fastify.queryDatabase(`
            MATCH (m:Movie {imdbId: $imdbId}), (l:Language {code: $langCode})
            MERGE (m)-[:SPOKEN_IN]->(l)
          `, { imdbId: movie.id, langCode });
        }

        if ((i + 1) % 50 === 0) {
          this.fastify.log.info(`Seeded ${i + 1}/${movies.length} movies`);
        }
      } catch (error) {
        this.fastify.log.error(`Error seeding movie ${movie.primaryTitle}:`, error);
      }
    }

    this.fastify.log.info(`Successfully seeded ${movies.length} movies`);
  }

  private async seedSampleRatings(): Promise<void> {
    this.fastify.log.info('Seeding sample ratings...');

    // Get all users and movies
    const usersResult = await this.fastify.queryDatabase('MATCH (u:User) RETURN ID(u) as userId LIMIT 20');
    const moviesResult = await this.fastify.queryDatabase(`
      MATCH (m:Movie) 
      RETURN ID(m) as movieId, m.title as title, m.imdbRating as imdbRating
      ORDER BY m.imdbRating DESC
      LIMIT 100
    `);

    const userIds = usersResult.records.map(r => r.get('userId'));
    const movies = moviesResult.records.map(r => ({
      id: r.get('movieId'),
      title: r.get('title'),
      imdbRating: r.get('imdbRating')
    }));

    if (userIds.length === 0) {
      this.fastify.log.info('No users found, skipping sample ratings');
      return;
    }

    // Create sample ratings for each user
    for (const userId of userIds) {
      // Each user rates 10-30 random movies
      const numRatings = Math.floor(Math.random() * 20) + 10;
      const shuffledMovies = [...movies].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(numRatings, shuffledMovies.length); i++) {
        const movie = shuffledMovies[i];

        // Generate realistic ratings based on IMDB rating
        // Higher IMDB rated movies get slightly higher user ratings on average
        const baseScore = movie.imdbRating || 7;
        const variance = Math.random() * 4 - 2; // -2 to +2
        const score = Math.max(1, Math.min(10, Math.round(baseScore + variance)));

        // Generate random timestamp within the last 2 years
        const daysAgo = Math.floor(Math.random() * 730);

        await this.fastify.queryDatabase(`
          MATCH (u:User), (m:Movie)
          WHERE ID(u) = $userId AND ID(m) = $movieId
          MERGE (u)-[r:RATED]->(m)
          SET r.score = $score,
              r.timestamp = datetime() - duration('P' + toString($daysAgo) + 'D'),
              r.review = CASE 
                WHEN rand() < 0.3 THEN $review 
                ELSE null 
              END
        `, {
          userId,
          movieId: movie.id,
          score,
          daysAgo,
          review: this.generateSampleReview(score)
        });
      }
    }

    this.fastify.log.info('Sample ratings seeded successfully');
  }

  private getGenreDescription(genre: string): string {
    const descriptions: { [key: string]: string } = {
      'Action': 'High-energy films with exciting sequences and stunts',
      'Adventure': 'Exciting journeys and explorations',
      'Animation': 'Animated films using various techniques',
      'Biography': 'Life stories of real people',
      'Comedy': 'Humorous films designed to entertain and amuse',
      'Crime': 'Films centered around criminal activities',
      'Documentary': 'Non-fictional films about real subjects',
      'Drama': 'Serious narrative films focusing on character development',
      'Family': 'Films suitable for all family members',
      'Fantasy': 'Movies featuring magical or supernatural elements',
      'Film-Noir': 'Dark, stylistic crime dramas',
      'History': 'Films set in historical periods',
      'Horror': 'Films designed to frighten and create suspense',
      'Music': 'Films centered around musical themes',
      'Musical': 'Films featuring songs and musical numbers',
      'Mystery': 'Films involving puzzles and unknown elements',
      'Romance': 'Movies focusing on love stories and relationships',
      'Sci-Fi': 'Science fiction films exploring futuristic concepts',
      'Sport': 'Films centered around sports and athletics',
      'Thriller': 'Suspenseful films that keep audiences on edge',
      'War': 'Films depicting warfare and its effects',
      'Western': 'Movies set in the American Old West',
      'Epic': 'Large-scale, ambitious films with grand themes',
      'Period Drama': 'Dramatic films set in historical periods',
      'Prison Drama': 'Dramatic films set in prison environments'
    };

    return descriptions[genre] || `Films in the ${genre} category`;
  }

  private getCountryName(code: string): string {
    const countries: { [key: string]: string } = {
      'US': 'United States',
      'UK': 'United Kingdom',
      'CA': 'Canada',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'JP': 'Japan',
      'KR': 'South Korea',
      'IN': 'India',
      'CN': 'China',
      'AU': 'Australia',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'ES': 'Spain',
      'RU': 'Russia',
      'NZ': 'New Zealand',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland'
    };

    return countries[code] || code;
  }

  private getLanguageName(code: string): string {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'fr': 'French',
      'es': 'Spanish',
      'de': 'German',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'ru': 'Russian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'nl': 'Dutch',
      'pl': 'Polish'
    };

    return languages[code] || code;
  }

  private generateSampleReview(score: number): string {
    const reviews: { [key: number]: string[] } = {
      10: [
        "Absolutely masterful! A perfect film in every way.",
        "This movie changed my life. Pure cinematic perfection.",
        "Flawless execution. One of the greatest films ever made."
      ],
      9: [
        "Outstanding film with incredible performances.",
        "Nearly perfect. Highly recommended!",
        "Brilliant storytelling and amazing cinematography."
      ],
      8: [
        "Really enjoyed this one. Great entertainment.",
        "Solid film with good acting and direction.",
        "Very well made and engaging throughout."
      ],
      7: [
        "Good movie, worth watching.",
        "Decent film with some great moments.",
        "Enjoyable overall despite some flaws."
      ],
      6: [
        "It was okay, had its moments.",
        "Average film, nothing spectacular.",
        "Watchable but not memorable."
      ],
      5: [
        "Mediocre at best.",
        "Neither good nor bad, just meh.",
        "Could have been much better."
      ]
    };

    const scoreGroup = Math.max(5, Math.min(10, score));
    const reviewOptions = reviews[scoreGroup] || reviews[5];
    return reviewOptions[Math.floor(Math.random() * reviewOptions.length)];
  }

  // Utility method to clear all movie data (for testing)
  async clearMovieData(): Promise<void> {
    this.fastify.log.info('Clearing all movie data...');

    await this.fastify.queryDatabase(`
      MATCH (m:Movie)
      DETACH DELETE m
    `);

    await this.fastify.queryDatabase(`
      MATCH (g:Genre)
      DETACH DELETE g
    `);

    await this.fastify.queryDatabase(`
      MATCH (s:Studio)
      DETACH DELETE s
    `);

    await this.fastify.queryDatabase(`
      MATCH (c:Country)
      DETACH DELETE c
    `);

    await this.fastify.queryDatabase(`
      MATCH (l:Language)
      DETACH DELETE l
    `);

    this.fastify.log.info('Movie data cleared successfully');
  }

  // Method to get seeding statistics
  async initMovieRelatedDatabase(): Promise<any> {
    const results = await Promise.all([
      this.fastify.queryDatabase('MATCH (m:Movie) RETURN COUNT(m) as count'),
      this.fastify.queryDatabase('MATCH (g:Genre) RETURN COUNT(g) as count'),
      this.fastify.queryDatabase('MATCH (s:Studio) RETURN COUNT(s) as count'),
      this.fastify.queryDatabase('MATCH (c:Country) RETURN COUNT(c) as count'),
      this.fastify.queryDatabase('MATCH (l:Language) RETURN COUNT(l) as count'),
      this.fastify.queryDatabase('MATCH ()-[r:RATED]->() RETURN COUNT(r) as count')
    ]);

    return {
      movies: results[0].records[0].get('count'),
      genres: results[1].records[0].get('count'),
      studios: results[2].records[0].get('count'),
      countries: results[3].records[0].get('count'),
      languages: results[4].records[0].get('count'),
      ratings: results[5].records[0].get('count')
    };
  }
}