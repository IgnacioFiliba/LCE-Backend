/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/interceptors/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import {
  ApiBearerAuth,
  ApiParam,
  ApiTags,
  ApiOperation,
} from '@nestjs/swagger';
import { FavoritesService } from './favorite.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(AuthGuard) // 🔒 Todos los endpoints requieren usuario logueado
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @ApiOperation({
    summary: 'Agregar un producto a favoritos (solo usuario logueado)',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto a agregar a favoritos',
    example: '3fa2e8db-e990-450b-9163-067794f02475',
  })
  @Post(':productId')
  async addFavorite(
    @Req() req,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const userId = req.user.id;
    return this.favoritesService.addFavorite(userId, productId);
  }

  @ApiOperation({
    summary: 'Eliminar un producto de favoritos (solo usuario logueado)',
  })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto a eliminar de favoritos',
    example: '3fa2e8db-e990-450b-9163-067794f02475',
  })
  @Delete(':productId')
  async removeFavorite(
    @Req() req,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const userId = req.user.id;
    await this.favoritesService.removeFavorite(userId, productId);
    return { message: 'Producto eliminado de favoritos' };
  }

  @ApiOperation({ summary: 'Obtener todos los favoritos del usuario logueado' })
  @Get()
  async getFavorites(@Req() req) {
    const userId = req.user.id;
    return this.favoritesService.getFavorites(userId);
  }

  @ApiOperation({ summary: 'Obtener todos los favoritos (solo Admin)' })
  @Get('admin/all')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAllFavorites() {
    return this.favoritesService.getAll();
  }
}
