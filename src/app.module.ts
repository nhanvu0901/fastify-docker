import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { DatabaseModule } from './database/database.module';
import { SeedersModule } from './seeders/seeders.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
    imports: [
        // Global configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // Database connection
        DatabaseModule,
        // Seeding module
        SeedersModule,
        // Feature modules
        UsersModule,
        MoviesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}