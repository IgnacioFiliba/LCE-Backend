import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesUploadService } from './files-upload.service';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('file')
export class FilesUploadController {
  constructor(private readonly filesService: FilesUploadService) {}

  @Post('uploadImage/:productId')
  @ApiOperation({ summary: 'Subir imagen de un producto por ID' })
  @ApiParam({
    name: 'productId',
    description: 'UUID del producto',
    format: 'uuid',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagen (jpg, jpeg, png o webp, máx 200KB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('image')) // <-- el nombre del campo en form-data
  async uploadImage(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 200 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/i }),
        ],
      }),
    )
    image: Express.Multer.File,
  ) {
    // Sube la imagen y guarda la URL en BD
    const result = await this.filesService.uploadProductImage(productId, image);
    return { ok: true, ...result };
  }
}