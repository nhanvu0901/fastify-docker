import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'User password'
    })
    @IsString()
    password: string;
}