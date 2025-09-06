import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentsService } from './comments.service';
import { Comment as CommentEntity } from './entity/comments.entity'; // 👈 alias + path correcto

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un comentario para un producto' })
  @ApiBody({ type: CreateCommentDto })
  @ApiCreatedResponse({
    description: 'Comentario creado correctamente',
    type: () => CommentEntity, // 👈 tipo perezoso
  })
  create(@Body() dto: CreateCommentDto) {
    return this.commentsService.create(dto);
  }

  @Get('/product/:id')
  @ApiOperation({ summary: 'Obtener comentarios de un producto' })
  @ApiParam({
    name: 'id',
    example: 'b2f5a0f9-7b8e-4e5d-9d7a-3f8c5d2e6a4f',
    description: 'ID del producto',
  })
  @ApiOkResponse({
    description: 'Lista de comentarios del producto',
    type: () => CommentEntity, // 👈 tipo perezoso
    isArray: true,
  })
  getByProduct(@Param('id') productId: string) {
    return this.commentsService.findByProduct(productId);
  }
}
