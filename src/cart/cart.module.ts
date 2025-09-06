import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Products } from 'src/products/entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Products])],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}