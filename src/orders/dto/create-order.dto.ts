import { IsNotEmpty, IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Products } from 'src/products/entities/product.entity';

export class CreateOrderDto {
  @ApiProperty({
    description: 'UUID del usuario que realiza la orden',
    example: '62c862a1-466a-4372-bf63-81db85604b5f',
  })
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @ApiProperty({
    description:
      'Lista de productos a comprar. Cada uno debe tener al menos un productId.',
    type: [Object],
    example: [
      { id: '2dbf2f54-2bfe-4043-9cd4-610d7c0e5b35' },
      { id: '7287a806-e58d-4841-b789-7dd98aa5111c' },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  products: Partial<Products>[];
}
