import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto, LoginDto } from 'src/users/dto/create-user.dto';
import { Users } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { FilesUploadRepository } from 'src/files-upload/files-upload.repository';
import { randomUUID } from 'crypto';
import { MailService } from 'src/mail/mail.service';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    private readonly fileUploadRepository: FilesUploadRepository,
    private readonly mailService: MailService,
  ) {}

  async register(
    user: CreateUserDto,
    file?: Express.Multer.File,
  ): Promise<Users> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...userWithoutPassword } = user;

    const findUser = await this.usersRepository.findOne({
      where: { email: user.email },
    });
    if (findUser) throw new BadRequestException('User already registered');

    const hashedPassword = await bcrypt.hash(user.password, 10);

    let imgUrl = '';
    if (file) {
      try {
        const uploadResponse =
          await this.fileUploadRepository.uploadImage(file);
        imgUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error('Error al subir imagen de usuario:', error);
        throw new InternalServerErrorException('Error uploading user image');
      }
    }

    const verificationToken = randomUUID();

    const createUser = this.usersRepository.create({
      ...userWithoutPassword,
      password: hashedPassword,
      imgUrl,
      isVerified: false,
      verificationToken,
    });
    //prueba
    const savedUser = await this.usersRepository.save(createUser);

    await this.mailService.sendVerificationEmail(savedUser);

    return savedUser;
  }

  async signIn(credentials: LoginDto) {
    const findUser: Users | null = await this.usersRepository.findOneBy({
      email: credentials.email,
    });

    if (!findUser) throw new BadRequestException('Bad Credentials');

    if (findUser.isBanned) {
      throw new BadRequestException('User is banned');
    }

    if (!findUser.isVerified) {
      throw new BadRequestException('Account not verified, check your email');
    }

    const matchingPasswords = await bcrypt.compare(
      credentials.password,
      findUser.password,
    );

    if (!matchingPasswords) {
      throw new BadRequestException('Bad Credentials');
    }

    const payload = {
      sub: findUser.id,
      email: findUser.email,
      isAdmin: findUser.isAdmin,
      isSuperAdmin: findUser.isSuperAdmin,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '30d',
    });

    return {
      access_Token: token,
      user: {
        id: findUser.id,
        name: findUser.name,
        email: findUser.email,
        isAdmin: findUser.isAdmin,
        isSuperAdmin: findUser.isSuperAdmin,
      },
    };
  }

  async googleLogin(user: any) {
    let finalUser = await this.usersRepository.findOne({
      where: { email: user.email },
    });

    if (finalUser) {
      if (finalUser.isBanned) {
        throw new BadRequestException('User is banned');
      }

      if (!finalUser.imgUrl && user.imgUrl) {
        finalUser.imgUrl = user.imgUrl;
        await this.usersRepository.save(finalUser);
      }
    } else {
      finalUser = this.usersRepository.create({
        name: user.name,
        email: user.email,
        password: '',
        imgUrl: user.imgUrl,
      });
      await this.usersRepository.save(finalUser);
    }

    const payload = {
      sub: finalUser.id,
      email: finalUser.email,
      isAdmin: finalUser.isAdmin,
      isSuperAdmin: finalUser.isSuperAdmin,
    };

    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '30d',
    });

    return {
      access_Token: token,
      user: {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        imgUrl: finalUser.imgUrl,
        isAdmin: finalUser.isAdmin,
        isSuperAdmin: finalUser.isSuperAdmin,
      },
    };
  }

  async verifyAccount(token: string) {
    const user = await this.usersRepository.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    user.isVerified = true;
    user.verificationToken = null;
    await this.usersRepository.save(user);

    return { message: '✅ Cuenta verificada con éxito' };
  }
}
