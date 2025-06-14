import {Injectable, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {GoogleGenAI} from '@google/genai';
import {MOVIE_GENRES} from "../common/constants/movie-genres";


export interface QueryIntent {
    type: 'search' | 'recommendation' | 'comparison' | 'filter' | 'chat';
    confidence: number;
    entities: {
        genres?: string[];
        actors?: string[];
        directors?: string[];
        years?: number[];
        keywords?: string[];
    };
    sentiment: 'positive' | 'negative' | 'neutral';
    expandedQuery: string;
    searchStrategy: 'vector' | 'filter' | 'hybrid';
}

@Injectable()
export class GeminiService {
    private readonly logger: Logger = new Logger(GeminiService.name);
    private ai: GoogleGenAI;

    constructor(private configService: ConfigService) {
        const apiKey = configService.get<string>('apiKey');
        if (apiKey) {
            this.ai = new GoogleGenAI({apiKey});
        }
    }

    async responseProcess(prompt: string): Promise<any> {
        try {
            return await this.ai.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: prompt,
            });
        } catch (error) {
            this.logger.error("failed at calling to Germini API", error);
        }
    }

    async analyzeQueryIntent(query: string): Promise<QueryIntent> {
        try {
            if (!this.ai) {
                return this.fallbackIntentAnalysis(query);
            }
            const prompt = this.buildIntentAnalysisPrompt(query);

            const response = await this.responseProcess(prompt);
            const analysis = this.parseGeminiResponse(response.text);
            return analysis || this.fallbackIntentAnalysis(query);

        } catch (error) {
            this.logger.warn('Gemini analysis failed, using fallback:', error.message);
            return this.fallbackIntentAnalysis(query);
        }
    }

    private buildIntentAnalysisPrompt(query: string): string {
        const basicGenres = MOVIE_GENRES.BASIC_GENRES.join(', ');
        return `
Analyze this movie search query and extract ONLY information that is explicitly mentioned. DO NOT guess, assume, or make up any information.

Query: "${query}"

Return ONLY a valid JSON object with this exact structure:
{
  "type": "search|recommendation|comparison|filter|chat",
  "confidence": 0.0-1.0 (number),
  "entities": {
    "genres": [],
    "actors": [],
    "directors": [],
    "years": [],
    "keywords": []
  },
  "sentiment": "positive|negative|neutral",
  "expandedQuery": "",
  "searchStrategy": "vector|filter|hybrid"
}

STRICT RULES - Only fill if explicitly mentioned:

1. "genres": Include ONLY if these exact words appear in query: ${basicGenres}. If query says "funny movies", extract ["comedy"]. If no recognizable genre, leave empty [].

2. "actors": Include ONLY if query mentions specific actor names like "Tom Cruise", "Leonardo DiCaprio". If no actor names mentioned, leave empty [].

3. "directors": Include ONLY if query mentions specific director names like "Christopher Nolan", "Quentin Tarantino". If no director names mentioned, leave empty [].

4. "years": Include ONLY actual years mentioned in query (1900-2099). If query says "recent movies" or "old movies" without specific years, leave empty [].

5. "keywords": Include ONLY descriptive words about movie themes/mood that are explicitly mentioned: "romantic", "scary", "funny", "action-packed", "space", "superhero", etc. Do NOT add synonyms.

6. "type": 
   - "recommendation" if asking for suggestions: "recommend", "suggest", "what should I watch"
   - "comparison" if comparing: "vs", "versus", "compare", "better than"
   - "filter" if listing criteria: "movies from 2020", "action movies"
   - "search" if looking for specific movie: "find Inception", "that movie about"
   - "chat" if casual conversation: "hello", "how are you"

7. "sentiment": 
   - "positive" if using positive words: "good", "best", "amazing", "love"
   - "negative" if using negative words: "bad", "worst", "hate", "avoid"
   - "neutral" otherwise

8. "expandedQuery": Add synonyms ONLY for words actually in the query. If query says "funny", expand to "funny comedy humorous". If query says "scary", expand to "scary horror frightening". DO NOT add words not related to the original query.

9. "searchStrategy":
   - "vector" if query is descriptive/semantic: "movies about dreams", "emotional films"
   - "filter" if query has specific criteria: "movies from 2020", "action genre"
   - "hybrid" if query has both: "good action movies from 2020"

10. "confidence": Rate 0.0-1.0 how clear the query intent is.

CRITICAL: If information is not explicitly in the query, leave those arrays empty [] or fields empty "". DO NOT guess, infer, or make assumptions.

Examples:
- Query: "funny movies" → genres: ["comedy"], actors: [], directors: [], years: []
- Query: "Tom Cruise action films" → genres: ["action"], actors: ["Tom Cruise"], directors: [], years: []
- Query: "good movies" → genres: [], actors: [], directors: [], years: [], keywords: ["good"]
- Query: "movies from 2020" → genres: [], actors: [], directors: [], years: [2020]

Return ONLY the JSON, no other text.`;
    }

    private parseGeminiResponse(responseText: string): QueryIntent | null {
        try {
            // Clean the response to extract JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const jsonStr = jsonMatch[0];
            const parsed = JSON.parse(jsonStr);

            // Validate required fields
            if (!parsed.type || !parsed.searchStrategy) return null;

            return {
                type: parsed.type,
                confidence: parsed.confidence || 0.5,
                entities: parsed.entities || {},
                sentiment: parsed.sentiment || 'neutral',
                expandedQuery: parsed.expandedQuery || '',
                searchStrategy: parsed.searchStrategy
            };
        } catch (error) {
            this.logger.warn('Failed to parse Gemini response:', error.message);
            return null;
        }
    }


    private fallbackIntentAnalysis(query: string): QueryIntent {
        const lowerQuery = query.toLowerCase();

        const hasGenres = /action|comedy|drama|horror|romance|thriller|sci-fi|animation/.test(lowerQuery);
        const hasYear = /\b(19|20)\d{2}\b/.test(lowerQuery);
        const isRecommendation = /recommend|suggest|what should|good|best|similar/.test(lowerQuery);
        const isComparison = /vs|versus|compare|better|difference/.test(lowerQuery);

        let type: QueryIntent['type'] = 'search';
        let searchStrategy: QueryIntent['searchStrategy'] = 'vector';

        if (isRecommendation) type = 'recommendation';
        else if (isComparison) type = 'comparison';
        else if (hasGenres || hasYear) type = 'filter';

        if (hasGenres || hasYear) searchStrategy = 'filter';
        else if (lowerQuery.split(' ').length > 6) searchStrategy = 'hybrid';

        return {
            type,
            confidence: 0.6,
            entities: this.extractBasicEntities(query),
            sentiment: 'neutral',
            expandedQuery: query,
            searchStrategy
        };
    }

    private extractBasicEntities(query: string): {
        genres?: string[];
        actors?: string[];
        directors?: string[];
        years?: number[];
        keywords?: string[];
    } {
        const entities: any = {};
        const lowerQuery = query.toLowerCase();

        // Extract genres
        const genres = ['action', 'comedy', 'drama', 'horror', 'romance', 'thriller', 'sci-fi', 'animation']
            .filter(genre => lowerQuery.includes(genre));
        if (genres.length) entities.genres = genres;

        // Extract years
        const yearMatches = query.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches) entities.years = yearMatches.map(Number);

        return entities;
    }
}