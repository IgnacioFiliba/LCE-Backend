import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) quantity: number;

  // Solo como fallback mientras conectas JWT
  @IsOptional() @IsUUID() userId?: string;
}