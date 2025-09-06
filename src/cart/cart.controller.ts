import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateQtyDto } from './dto/update-qty.dto';

// ⬇️ TU guard de autenticación (ajusta la ruta si es diferente)
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /** Obtiene el id del usuario autenticado desde req.user (id o sub). */
  private getUserId(req: Request): string {
    const user: any = (req as any)?.user;
    const userId = user?.id ?? user?.sub;
    if (!userId) throw new UnauthorizedException('USER_ID_REQUIRED');
    return String(userId);
  }

  @ApiOperation({ summary: 'Obtener carrito del usuario (revalida por defecto)' })
  @Get()
  async getCart(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.cartService.getCart(userId);
  }

  @ApiOperation({ summary: 'Agregar item (crea carrito si no existe)' })
  @Post('items')
  async addItem(@Req() req: Request, @Body() dto: AddItemDto) {
    const userId = this.getUserId(req);
    return this.cartService.addItem(userId, dto);
  }

  // ✅ Ahora el parámetro de ruta es productId y se busca por { cartId, productId }
  @ApiOperation({ summary: 'Actualizar cantidad de un producto en el carrito (0 = eliminar)' })
  @Patch('items/:productId')
  async updateQty(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() dto: UpdateQtyDto,
  ) {
    const userId = this.getUserId(req);
    return this.cartService.updateItemQty(userId, productId, dto.quantity);
  }

  // (Se mantiene igual: elimina por CartItem.id)
  @ApiOperation({ summary: 'Eliminar item' })
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(@Req() req: Request, @Param('itemId') itemId: string) {
    const userId = this.getUserId(req);
    await this.cartService.removeItem(userId, itemId);
  }

  @ApiOperation({ summary: 'Vaciar carrito' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clear(@Req() req: Request) {
    const userId = this.getUserId(req);
    await this.cartService.clearCart(userId);
  }

  @ApiOperation({ summary: 'Validar y preparar payload para checkout (orden preliminar)' })
  @Post('checkout')
  async checkout(@Req() req: Request) {
    const userId = this.getUserId(req);
    return this.cartService.prepareCheckout(userId);
  }
}