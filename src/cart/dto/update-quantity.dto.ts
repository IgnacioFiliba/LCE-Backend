import { IsInt, Min } from 'class-validator';
export class UpdateQtyDto {
  @IsInt() @Min(0) quantity: number; // 0 = eliminar
}