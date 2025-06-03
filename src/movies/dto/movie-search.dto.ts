import { IsOptional, IsString, IsNumber, IsArray, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MovieSearchDto {
    @ApiPropertyOptional({
        description: 'Search query for movie title or description',
        example: 'inception'
    })
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({
        description: 'Comma-separated list of genres',
        example: 'Action,Drama'
    })
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
    @IsArray()
    @IsString({ each: true })
    genres?: string[];

    @ApiPropertyOptional({
        description: 'Minimum release year',
        example: 2000
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1900)
    yearFrom?: number;

    @ApiPropertyOptional({
        description: 'Maximum release year',
        example: 2023
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1900)
    yearTo?: number;

    @ApiPropertyOptional({
        description: 'Minimum IMDB rating',
        example: 7.0,
        minimum: 0,
        maximum: 10
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    @Max(10)
    minRating?: number;

    @ApiPropertyOptional({
        description: 'Language code',
        example: 'en'
    })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({
        description: 'Number of results to return',
        minimum: 1,
        maximum: 100,
        default: 20
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    @Max(100)
    limit?: number = 20;
}
