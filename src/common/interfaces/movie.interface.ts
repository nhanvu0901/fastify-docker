export interface Movie {
    id: string;
    title: string;
    originalTitle?: string;
    description: string;
    releaseDate: Date;
    duration: number; // in minutes
    imdbId?: string;
    imdbRating?: number;
    imdbUrl?: string;
    tmdbId?: string;
    posterUrl?: string;
    trailerUrl?: string;
    contentRating?: string;
    language: string;
    country: string;
    budget?: number;
    grossWorldwide?: number;
    revenue?: number;
    numVotes?: number;
    metascore?: number;
    isAdult?: boolean;
    createdAt: Date;

    // Vector search specific
    embedding?: number[];
    score?: number; // Similarity score from vector search

    // Aggregated data
    avgRating?: number;
    ratingsCount?: number;
    genres?: string[];
    studios?: string[];
    countries?: string[];
    languages?: string[];
}