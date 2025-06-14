import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { DatabaseModule } from './database/database.module';
import { SeedersModule } from './seeders/seeders.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {RAGModule} from "./rag/rag.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,//Makes ConfigService available throughout the entire app (isGlobal: true)
            envFilePath: '.env',//Reads the .env file specified in envFilePath: '.env'
        }),
        // Database connection
        DatabaseModule,
        // Seeding module
        SeedersModule,
        // Feature modules
        UsersModule,
        MoviesModule,
        RAGModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}