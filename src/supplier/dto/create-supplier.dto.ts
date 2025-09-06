import { IsString, IsOptional, IsEmail } from 'class-validator';
import { PrimaryGeneratedColumn } from 'typeorm';

export class CreateSupplierDto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  cuit: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
