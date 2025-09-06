import { Module } from '@nestjs/common';
import { MercadoPagoClient } from './mercadopago.client';
import { PaymentsService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Products } from 'src/products/entities/product.entity';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { OrderDetails } from 'src/orders/entities/order-detail.entity';
import { Users } from 'src/users/entities/user.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Products,
      Orders,
      OrderDetails,
      OrderItem,
      Users,
    ]),
  ],
  providers: [MercadoPagoClient, PaymentsService],
  controllers: [PaymentsController, WebhookController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
