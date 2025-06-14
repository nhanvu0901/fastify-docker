import {Injectable} from "@nestjs/common";

interface ConversationMemory {
    sessionId: string;
    userPreferences: {
        likedGenres: string[];
        dislikedGenres: string[];
        preferredDecade?: string;
        minRating?: number;
    };
    queryHistory: Array<{
        query: string;
        timestamp: Date;
        results: any[];
        userFeedback?: 'helpful' | 'not_helpful';
    }>;
    currentTopic?: string; // e.g., "action movies", "comedy recommendations"
}

@Injectable()
export class ConversationContextService {
    private conversations = new Map<string, ConversationMemory>();

    getOrCreateContext(sessionId: string): ConversationMemory {
        if (!this.conversations.has(sessionId)) {
            this.conversations.set(sessionId, {
                sessionId: sessionId,
                userPreferences: {
                    likedGenres: [],
                    dislikedGenres: []
                },
                queryHistory: []
            })
        }
        return this.conversations.get(sessionId);
    }

    updateContext(sessionId: string, query: string, results: any[]): void {
        const context = this.conversations.get(sessionId);
        if (context) {
            context.queryHistory.push({
                query,
                timestamp: new Date(),
                results,
            });
            if (context.queryHistory.length > 10) {
                context.queryHistory.shift()
            }

            this.extractPreferencesFromQuery(context, query);
        }
    }

    extractPreferencesFromQuery(context: ConversationMemory, query: string): void {
        const lowerQuery = query.toLowerCase();

        const genrePatterns = {
            'action': ['action', 'fight', 'explosion', 'superhero'],
            'comedy': ['funny', 'laugh', 'comedy', 'hilarious'],
            'drama': ['drama', 'emotional', 'serious'],
            'horror': ['scary', 'horror', 'frightening'],
            'romance': ['romantic', 'love', 'romance'],
        };

        Object.entries(genrePatterns).forEach(([genre, pattern]) => {
            const hasPositiveContext = pattern.some(type =>{
                lowerQuery.includes(`love ${type}`) ||
                lowerQuery.includes(`prefer ${type}`) ||
                lowerQuery.includes(`like ${type}`)
            })
            if (hasPositiveContext && !context.userPreferences.likedGenres.includes(genre)) {
                context.userPreferences.likedGenres.push(genre);
            }
        })


    }

}