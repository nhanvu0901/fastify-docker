import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';

import { MoviesModule } from '../movies/movies.module';


@Module({
    imports: [MoviesModule],

    providers: [
        GeminiService,

    ],
    exports: [
        GeminiService,

    ],
})
export class RAGModule {}