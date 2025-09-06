import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateQtyDto {
  @ApiProperty({ minimum: 0, description: '0 = eliminar item' })
  @IsInt()
  @Min(0)
  quantity: number;
}