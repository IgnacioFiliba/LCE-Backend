import {
  Body,
  Controller,
  Get,
  Post,
  UseInterceptors,
  Req,
  UseGuards,
  HttpCode,
  UploadedFile,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  Param,
} from '@nestjs/common';
import { CreateUserDto, LoginDto } from 'src/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { ExcludePasswordInterceptor } from 'src/interceptors/exclude-password.interceptor';
import {
  ApiTags,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@ApiTags('Auth')
@ApiBearerAuth()
@UseInterceptors(ExcludePasswordInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Mensaje de prueba del endpoint /auth' })
  getAuth() {
    return { message: 'GET /auth' };
  }

  @Post('/register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario con imagen de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos para registrar un nuevo usuario',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del usuario (jpg, jpeg, png, webp)',
        },
        name: { type: 'string', example: 'Ignacio Muestra' },
        email: { type: 'string', example: 'muestra@example.com' },
        password: { type: 'string', example: 'Muestra123!' },
        confirmPassword: { type: 'string', example: 'Muestra123!' },
        phone: { type: 'string', example: '3512345678' },
        country: { type: 'string', example: 'Argentina' },
        address: { type: 'string', example: 'Calle Muestra 123' },
        city: { type: 'string', example: 'Córdoba' },
      },
      required: [
        'name',
        'email',
        'password',
        'confirmPassword',
        'phone',
        'country',
        'address',
        'city',
      ],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  register(
    @Body() user: CreateUserDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({
            maxSize: 300000,
            message: 'El archivo es demasiado grande. Máximo 300KB.',
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpg|jpeg|png|webp)$/i,
          }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.authService.register(user, file);
  }

  @Post('/signin')
  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @ApiBody({
    description: 'Credenciales para iniciar sesión',
    schema: {
      example: { email: 'admin@example.com', password: 'Admin123!' },
    },
  })
  signIn(@Body() credentials: LoginDto) {
    return this.authService.signIn(credentials);
  }

  @UseGuards(AuthGuard)
  @Post('/logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cerrar sesión (borra token en front)' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logout(@Req() _req: any) {
    return;
  }

  @Get('/verify/:token')
  async verifyAccount(@Param('token') token: string) {
    const verified = await this.authService.verifyAccount(token);

    if (verified) {
      return { success: true, message: 'Cuenta verificada' };
    } else {
      return { success: false, message: 'Token inválido o expirado' };
    }
  }
}
