import { PickType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsEmpty,
  Validate,
  IsOptional,
} from 'class-validator';
import { MatchPassword } from 'src/helpers/matchPassword';

export class CreateUserDto {
  /**
   * @description Email address of the user
   * @example ignaciofiliba@gmail.com
   */
  @IsNotEmpty()
  @IsEmail()
  email: string;

  /**
   * @description Full name of the user
   * @example Ignacio Filiba
   */
  @IsString()
  @MinLength(3)
  name: string;

  /**
   * @description User's password. Must include uppercase, lowercase, number, and special character.
   * @example Test1234!
   */
  @MinLength(8)
  @MaxLength(15)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.',
  })
  password: string;

  /**
   * @description Must match the password field
   * @example Test1234!
   */
  @Validate(MatchPassword, ['password'])
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(15)
  confirmPassword: string;

  /**
   * @description Home address of the user
   * @example Av. San Martín 1234
   */
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  address: string;

  /**
   * @description Phone number of the user
   * @example 3512345678
   */
  @IsNotEmpty()
  @IsString()
  phone: string;

  /**
   * @description Country of residence
   * @example Argentina
   */
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  country: string;

  /**
   * @description City of residence
   * @example Córdoba
   */
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  city: string;

  @IsOptional()
  @IsString()
  imgUrl?: string;

  /**
   * @description Admin flag. Should not be set manually.
   * @example false
   */
  @IsEmpty()
  isAdmin: boolean;
  @IsEmpty()
  isSuperAdmin: boolean;
}

// Login DTO
/**
 * @description DTO for user login
 */
export class LoginDto extends PickType(CreateUserDto, ['email', 'password']) {}
