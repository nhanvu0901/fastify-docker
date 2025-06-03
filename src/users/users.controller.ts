import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    HttpStatus,
    HttpException,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({
        status: 200,
        description: 'List of users retrieved successfully'
    })
    async findAll(@Query() pagination: PaginationDto) {
        try {
            const { users, total } = await this.usersService.findAll(pagination);
            return {
                users,
                total,
                limit: pagination.limit,
                offset: pagination.offset,
            };
        } catch (error) {
            throw new HttpException(
                'Failed to fetch users',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('signup')
    @ApiOperation({ summary: 'Create a new user account' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({
        status: 201,
        description: 'User created successfully'
    })
    @ApiResponse({
        status: 409,
        description: 'Email already exists'
    })
    async signup(@Body() createUserDto: CreateUserDto) {
        try {
            // Check if user already exists
            const existingUser = await this.usersService.findByEmail(createUserDto.email);
            if (existingUser) {
                throw new HttpException(
                    'Email already exists',
                    HttpStatus.CONFLICT,
                );
            }

            const user = await this.usersService.create(createUserDto);
            return { user };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to create user',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('signin')
    @ApiOperation({ summary: 'Sign in user' })
    @ApiBody({ type: LoginUserDto })
    @ApiResponse({
        status: 200,
        description: 'User signed in successfully'
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid credentials'
    })
    async signin(@Body() loginUserDto: LoginUserDto) {
        try {
            const user = await this.usersService.validateUser(
                loginUserDto.email,
                loginUserDto.password,
            );

            if (!user) {
                throw new HttpException(
                    'Invalid credentials',
                    HttpStatus.UNAUTHORIZED,
                );
            }

            return { user };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to sign in',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update user' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({
        status: 200,
        description: 'User updated successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'User not found'
    })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        try {
            // Check if user exists
            const existingUser = await this.usersService.findById(id);
            if (!existingUser) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            // Check email uniqueness if email is being updated
            if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
                const userWithEmail = await this.usersService.findByEmail(updateUserDto.email);
                if (userWithEmail) {
                    throw new HttpException(
                        'Email already exists',
                        HttpStatus.CONFLICT,
                    );
                }
            }

            const updatedUser = await this.usersService.update(id, updateUserDto);
            return { user: updatedUser };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to update user',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({
        status: 200,
        description: 'User found successfully'
    })
    @ApiResponse({
        status: 404,
        description: 'User not found'
    })
    async findById(@Param('id', ParseUUIDPipe) id: string) {
        try {
            const user = await this.usersService.findById(id);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }
            return { user };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to fetch user',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}