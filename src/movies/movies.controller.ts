import {
    Controller,
    Get,
    Query,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { MovieSearchDto } from './dto/movie-search.dto';

@ApiTags('movies')
@Controller('api/movies')
export class MoviesController {
    constructor(private readonly moviesService: MoviesService) {}

    @Get('search')
    @ApiOperation({ summary: 'Search movies with vector similarity and filters' })
    @ApiResponse({
        status: 200,
        description: 'Movies retrieved successfully'
    })
    async searchMovies(@Query() searchDto: MovieSearchDto) {
        try {
            const result = await this.moviesService.searchMovies(searchDto);
            return {
                movies: result.movies,
                count: result.movies.length,
                query: searchDto.q,
                filters: {
                    genres: searchDto.genres,
                    yearFrom: searchDto.yearFrom,
                    yearTo: searchDto.yearTo,
                    minRating: searchDto.minRating,
                    language: searchDto.language,
                },
                searchType: searchDto.q ? 'semantic' : 'filtered',
            };
        } catch (error) {
            throw new HttpException(
                'Failed to search movies',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get()
    @ApiOperation({ summary: 'Get all movies with pagination' })
    @ApiResponse({
        status: 200,
        description: 'Movies retrieved successfully'
    })
    async findAll(@Query() searchDto: MovieSearchDto) {
        try {
            const result = await this.moviesService.findAll(searchDto);
            return {
                movies: result.movies,
                total: result.total,
                limit: searchDto.limit,
            };
        } catch (error) {
            throw new HttpException(
                'Failed to fetch movies',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('genres')
    @ApiOperation({ summary: 'Get all available genres' })
    @ApiResponse({
        status: 200,
        description: 'Genres retrieved successfully'
    })
    async getGenres() {
        try {
            const genres = await this.moviesService.getAllGenres();
            return { genres };
        } catch (error) {
            throw new HttpException(
                'Failed to fetch genres',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get movie database statistics' })
    @ApiResponse({
        status: 200,
        description: 'Statistics retrieved successfully'
    })
    async getStats() {
        try {
            const stats = await this.moviesService.getStatistics();
            return stats;
        } catch (error) {
            throw new HttpException(
                'Failed to fetch statistics',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
