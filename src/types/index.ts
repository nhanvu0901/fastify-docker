interface Movie {
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
    contentRating?: string; // R, PG-13, etc.
    language: string;
    country: string;
    budget?: number;
    grossWorldwide?: number;
    revenue?: number;
    numVotes?: number;
    metascore?: number;
    isAdult?: boolean;
    createdAt: Date;
    // Computed fields
    avgRating?: number;
    ratingsCount?: number;
    genres?: Genre[];
    actors?: Actor[];
    directors?: Director[];
    studios?: Studio[];
    countries?: Country[];
    languages?: Language[];
}

interface Studio {
    id: string;
    name: string;
    description?: string;
}

interface Country {
    id: string;
    code: string;
    name: string;
}

interface Language {
    id: string;
    code: string;
    name: string;
}

interface Genre {
    id: string;
    name: string;
    description?: string;
}

interface Actor {
    id: string;
    name: string;
    birthDate?: Date;
    nationality?: string;
    biography?: string;
    profileImageUrl?: string;
}

interface Director {
    id: string;
    name: string;
    birthDate?: Date;
    nationality?: string;
    biography?: string;
    profileImageUrl?: string;
}

interface MovieRating {
    userId: string;
    movieId: string;
    score: number; // 1-10
    review?: string;
    timestamp: Date;
}

interface CreateMovieInput {
    title: string;
    originalTitle?: string;
    description: string;
    releaseDate: Date;
    duration: number;
    language: string;
    country: string;
    imdbId?: string;
    imdbRating?: number;
    imdbUrl?: string;
    tmdbId?: string;
    posterUrl?: string;
    trailerUrl?: string;
    contentRating?: string;
    budget?: number;
    grossWorldwide?: number;
    revenue?: number;
    numVotes?: number;
    metascore?: number;
    isAdult?: boolean;
    genreIds: string[];
    actorIds: string[];
    directorIds: string[];
    studioIds?: string[];
}

interface UserPreferences {
    preferredGenres: Genre[];
    favoriteActors: Actor[];
    favoriteDirectors: Director[];
    avgRatingGiven: number;
    totalMoviesRated: number;
}


interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Not returned to client
    createdAt: Date;
    updatedAt?: Date;
}

interface loginUserInput {
    email: string;
    password: string;
}

interface CreateUserInput {
    name: string;
    email: string;
    password: string;
}

interface UpdateUserInput {
    name?: string;
    email?: string;
    password?: string;
}



export {
    User,loginUserInput,CreateUserInput,UpdateUserInput,Movie,Studio,Language,Country,MovieRating,CreateMovieInput,UserPreferences
}