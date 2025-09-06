import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/interceptors/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common/pipes';
import { FindProductsQuery } from './dto/find-products.query';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Crear un nuevo producto (solo Admin) con imagen' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos para crear un nuevo producto con imagen',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del producto (jpg, jpeg, png, webp)',
        },
        name: { type: 'string', example: 'Filtro de Aceite Bosch' },
        price: { type: 'number', example: 29.99 },
        stock: { type: 'integer', example: 100 },
        imgUrl: { type: 'string', example: 'https://example.com/imagen.jpg' },
        year: { type: 'string', example: '2024' },
        brand: { type: 'string', example: 'Bosch' },
        model: { type: 'string', example: 'XTR-5000' },
        engine: { type: 'string', example: '2.0 Turbo' },
        categoryId: {
          type: 'string',
          format: 'uuid',
          example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        },
      },
      required: [
        'file',
        'name',
        'price',
        'stock',
        'year',
        'brand',
        'model',
        'engine',
        'categoryId',
      ],
    },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 300000,
            message: 'El archivo es demasiado grande. Máximo 300KB.',
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpg|jpeg|png|webp)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.productsService.create(dto, file);
  }

  @ApiOperation({ summary: 'Ejecutar seeder de productos (temporal)' })
  @Get('seeder')
  seeder() {
    return this.productsService.seeder();
  }

  @ApiOperation({
    summary:
      'Obtener todas las marcas, modelos, motores y categorías distintas',
  })
  @Get('facets')
  async getFacets() {
    return this.productsService.getFacets();
  }

  // 🔹 GET con búsqueda + filtros
  @ApiOperation({
    summary: 'Obtener productos con búsqueda y filtros (incluye comentarios)',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Texto parcial' })
  @ApiQuery({ name: 'brands', required: false, description: 'CSV o array' })
  @ApiQuery({ name: 'models', required: false, description: 'CSV o array' })
  @ApiQuery({ name: 'engines', required: false, description: 'CSV o array' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'UUID de categoría',
  })
  @ApiQuery({ name: 'inStock', required: false, description: 'true | false' })
  @ApiQuery({ name: 'yearMin', required: false, type: Number })
  @ApiQuery({ name: 'yearMax', required: false, type: Number })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  async getProducts(@Query() query: FindProductsQuery) {
    const { items } = await this.productsService.findAllWithFilters(query);
    return items;
  }

  @ApiOperation({
    summary: 'Obtener producto por nombre (coincidencia exacta)',
  })
  @ApiParam({
    name: 'name',
    description: 'Nombre del producto',
    example: 'Filtro de Aceite Bosch',
  })
  @Get('name/:name')
  findOneByName(@Param('name') name: string) {
    return this.productsService.findOneByName(name);
  }

  @ApiOperation({ summary: 'Obtener producto por ID (incluye comentarios)' })
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar producto por ID (solo Admin)' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiParam({
    name: 'id',
    description: 'UUID del producto a actualizar',
    example: '92b50dd3-ab7b-453d-9403-e76e479075e7',
  })
  @ApiBody({
    description: 'Datos a actualizar del producto',
    required: true,
    examples: {
      ejemploActualizacion: {
        summary: 'Ejemplo',
        value: {
          name: 'Mouse inalámbrico gamer',
          description: 'Mouse con RGB y 7 botones',
          price: 29.99,
          stock: 100,
          imgUrl: 'https://example.com/mouse.jpg',
        },
      },
    },
  })
  @Put(':id')
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productsService.updateProduct(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar producto por ID (solo Admin)' })
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiParam({
    name: 'id',
    description: 'UUID del producto',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
