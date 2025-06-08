export const COLLECTIONS = {
    MOVIES: 'movies',
    USERS: 'users',
} as const;

export const VECTOR_DIMENSIONS = {
    MOVIE_EMBEDDINGS: 1024, // Changed from 384 to 1024 for Cohere
    USER_EMBEDDINGS: 1024,
} as const;