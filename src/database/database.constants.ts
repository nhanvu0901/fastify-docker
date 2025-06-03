export const COLLECTIONS = {
    MOVIES: 'movies',
    USERS: 'users',
} as const;

export const VECTOR_DIMENSIONS = {
    MOVIE_EMBEDDINGS: 384, // For sentence transformers
    USER_PREFERENCES: 128,
} as const;