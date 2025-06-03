import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { EmbeddingService } from './embedding.service';

@Module({
    controllers: [MoviesController],
    providers: [MoviesService, EmbeddingService],
    exports: [MoviesService, EmbeddingService], // Export EmbeddingService so other modules can use it
})
export class MoviesModule {}