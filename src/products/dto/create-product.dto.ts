import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, IsDecimal, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
 import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imgUrl?: string;

  @ApiProperty()
  @IsString()
  year: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsString()
  engine: string;

  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  categoryId: string;
}
