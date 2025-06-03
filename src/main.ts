import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    // Create NestJS app with Fastify adapter
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            logger: {
                level: 'info',
            },
        }),
    );

    // Enable CORS
    await app.register(require('@fastify/cors'), {
        origin: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Swagger setup
    const config = new DocumentBuilder()
        .setTitle('Movie API')
        .setDescription('API for movie management with vector search capabilities')
        .setVersion('1.0')
        .addTag('movies')
        .addTag('users')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('documentation', app, document);

    // Get port from environment
    const port = process.env.PORT || 3000;
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

    await app.listen(port, host);

    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/documentation`);
    console.log(`🎬 Movie API ready at: http://localhost:${port}/api/movies`);
    console.log(`👥 User API ready at: http://localhost:${port}/api/users`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('Shutting down server...');
        await app.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('Shutting down server...');
        await app.close();
        process.exit(0);
    });
}

bootstrap();