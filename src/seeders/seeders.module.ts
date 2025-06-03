import { Module } from '@nestjs/common';
import { MovieSeederService } from './movie-seeder.service';
import { MoviesModule } from '../movies/movies.module';

@Module({
    imports: [MoviesModule],
    providers: [MovieSeederService],
    exports: [MovieSeederService],
})
export class SeedersModule {}