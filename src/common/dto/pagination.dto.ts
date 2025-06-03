import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
    @ApiPropertyOptional({
        description: 'Number of items to return',
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

    @ApiPropertyOptional({
        description: 'Number of items to skip',
        minimum: 0,
        default: 0
    })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(0)
    offset?: number = 0;
}