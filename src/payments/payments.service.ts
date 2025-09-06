import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Products } from 'src/products/entities/product.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { OrderDetails } from 'src/orders/entities/order-detail.entity';
import { Users } from 'src/users/entities/user.entity';
import { MercadoPagoClient } from './mercadopago.client';
import { OrderItem } from 'src/orders/entities/order-item.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly mp: MercadoPagoClient,
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(Products) private productsRepo: Repository<Products>,
    @InjectRepository(Orders) private ordersRepo: Repository<Orders>,
    @InjectRepository(OrderDetails)
    private orderDetailsRepo: Repository<OrderDetails>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  async createCheckoutPreference(cartId: string) {
    try {
      if (!process.env.MP_ACCESS_TOKEN) {
        throw new BadRequestException('MP_ACCESS_TOKEN no configurado');
      }
      if (!process.env.APP_BASE_URL) {
        throw new BadRequestException('APP_BASE_URL no configurado');
      }

      const cart = await this.cartRepo.findOne({
        where: { id: cartId },
        relations: ['items', 'items.product', 'user'],
      });
      if (!cart) throw new NotFoundException('Cart not found');

      if (!cart.items?.length) {
        throw new BadRequestException('Cart has no items');
      }

      const items = cart.items.map((ci) => ({
        id: ci.product.id,
        title: ci.product.name,
        description: ci.product.description ?? undefined,
        quantity: ci.quantity,
        unit_price: Number(ci.unitPriceSnapshot),
        currency_id: 'ARS',
        picture_url: ci.product.imgUrl ?? undefined,
      }));

      const preferenceBody = {
        items,
        external_reference: cart.id,
        notification_url: `${process.env.APP_BASE_URL}/payments/webhook`,
        back_urls: {
          success: `${process.env.APP_BASE_URL_FRONT}/home`,
          failure: `${process.env.APP_BASE_URL_FRONT}/home`,
          pending: `${process.env.APP_BASE_URL_FRONT}/home`,
        },

        auto_return: 'approved',
        payer: {},
      };

      const pref = await this.mp.preferenceApi.create({ body: preferenceBody });

      const prefId = (pref as any)?.id ?? (pref as any)?.body?.id;
      const initPoint =
        (pref as any)?.init_point ??
        (pref as any)?.body?.init_point ??
        (pref as any)?.sandbox_init_point ??
        (pref as any)?.body?.sandbox_init_point;

      if (!prefId || !initPoint) {
        console.error('Respuesta inesperada de MP Preference.create:', pref);
        throw new BadRequestException(
          'No se pudo obtener la preferencia de pago (id/init_point)',
        );
      }

      cart.mpPreferenceId = prefId;
      cart.status = 'pending';
      cart.updatedAt = new Date();
      await this.cartRepo.save(cart);

      return { init_point: initPoint, preference_id: prefId };
    } catch (err: any) {
      console.error('Error en createCheckoutPreference:', err);
      const message =
        err?.message ||
        err?.cause?.message ||
        'No se pudo crear la preferencia de pago';
      throw new BadRequestException(message);
    }
  }

  async updateCartFromPayment(
    mpPaymentId: string,
    status: string,
    externalReference: string, // cartId
  ) {
    try {
      const cart = await this.cartRepo.findOne({
        where: { id: externalReference },
        relations: ['items', 'items.product', 'user'],
      });
      if (!cart) return;

      if (status === 'failure') {
        await this.cartRepo.remove(cart);
        console.log(`🗑️ Carrito ${cart.id} eliminado por pago rechazado`);
        return;
      }

      if (status === 'approved' || process.env.FORCE_SUCCESS === 'true') {
        // Creamos la Order
        const order = this.ordersRepo.create({
          date: new Date(),
          status: 'onPreparation',
          paymentStatus: 'approved',
          mpPreferenceId: cart.mpPreferenceId,
          mpPaymentId,
          user: cart.user,
        });
        await this.ordersRepo.save(order);

        // Calcular total
        const total = cart.items.reduce(
          (acc, item) => acc + Number(item.unitPriceSnapshot) * item.quantity,
          0,
        );

        // Crear OrderDetails con OrderItems
        const orderDetails = this.orderDetailsRepo.create({
          price: total,
          order,
          items: cart.items.map((i) =>
            this.orderItemRepo.create({
              product: i.product,
              quantity: i.quantity,
              unitPrice: i.unitPriceSnapshot,
            }),
          ),
        });
        await this.orderDetailsRepo.save(orderDetails);

        for (const item of cart.items) {
          const product = await this.productsRepo.findOne({
            where: { id: item.product.id },
          });
          if (product) {
            if (product.stock < item.quantity) {
              throw new ConflictException({
                code: 'INSUFFICIENT_STOCK',
                productId: product.id,
                available: product.stock,
              });
            }
            product.stock = product.stock - item.quantity;
            await this.productsRepo.save(product);
          }
        }

        // Borrar carrito ya procesado
        await this.cartRepo.remove(cart);

        console.log(
          `✅ Order ${order.id} creada a partir del carrito ${cart.id}`,
        );
        return order;
      }

      // Estado pendiente → solo actualizamos carrito
      cart.mpPaymentId = mpPaymentId;
      cart.status = 'pending';
      cart.updatedAt = new Date();
      await this.cartRepo.save(cart);
    } catch (err) {
      console.error('Error en updateCartFromPayment:', err);
    }
  }
}
