import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Suspension', description: 'Unique name of the category' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
