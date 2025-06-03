export interface MovieRating {
    userId: string;
    movieId: string;
    score: number; // 1-10
    review?: string;
    timestamp: Date;
}