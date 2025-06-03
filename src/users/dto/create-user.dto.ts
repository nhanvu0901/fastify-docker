import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        description: 'User full name',
        example: 'John Doe'
    })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User password',
        minLength: 6
    })
    @IsString()
    @MinLength(6)
    password: string;
}