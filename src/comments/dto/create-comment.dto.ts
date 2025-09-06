import { IsInt, IsString, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Muy buen producto, llegó rápido.',
    description: 'Contenido del comentario',
  })
  @IsString()
  content: string;

  @ApiProperty({
    example: 5,
    description: 'Calificación de 1 a 5',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'b2f5a0f9-7b8e-4e5d-9d7a-3f8c5d2e6a4f',
    description: 'ID del producto',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 'c4a4c8c1-1b12-4e2d-a43a-2f6e6b9d7f23',
    description: 'ID del usuario',
  })
  @IsUUID()
  userId: string;
}
