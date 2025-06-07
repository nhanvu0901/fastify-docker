import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [DatabaseService],// ← This tells NestJS "create this service"
    exports: [DatabaseService],// ← This tells NestJS "other modules can use it"
})
export class DatabaseModule {}