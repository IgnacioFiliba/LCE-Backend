/* eslint-disable @typescript-eslint/no-unused-vars */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  ILike,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { Products } from 'src/products/entities/product.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { Users } from 'src/users/entities/user.entity';

@Injectable()
export class ChatToolsService {
  constructor(
    @InjectRepository(Products) private productsRepo: Repository<Products>,
    @InjectRepository(Orders) private ordersRepo: Repository<Orders>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  async findProducts(args: {
    q?: string;
    brand?: string;
    model?: string;
    engine?: string;
    year?: string | number;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    limit?: number;
  }) {
    // QueryBuilder = menos fricción con tipos/columnas
    const qb = this.productsRepo.createQueryBuilder('p');

    if (args.q)
      qb.andWhere('LOWER(p.name) LIKE LOWER(:q)', { q: `%${args.q}%` });
    if (args.brand)
      qb.andWhere('LOWER(p.brand) LIKE LOWER(:b)', { b: `%${args.brand}%` });
    if (args.model)
      qb.andWhere('LOWER(p.model) LIKE LOWER(:m)', { m: `%${args.model}%` });
    if (args.engine)
      qb.andWhere('LOWER(p.engine) LIKE LOWER(:e)', { e: `%${args.engine}%` });
    if (args.year != null) qb.andWhere('p.year = :y', { y: String(args.year) });
    if (args.categoryId)
      qb.andWhere('p.categoryId = :cid', { cid: args.categoryId }); // si tu FK es diferente, ajusta

    if (args.priceMin != null)
      qb.andWhere('p.price >= :min', { min: args.priceMin });
    if (args.priceMax != null)
      qb.andWhere('p.price <= :max', { max: args.priceMax });
    if (args.inStock != null)
      qb.andWhere(args.inStock ? 'p.stock >= 1' : 'p.stock <= 0');

    qb.orderBy('p.name', 'ASC').take(Math.min(args.limit ?? 5, 20));

    const rows = await qb.getMany();

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand ?? null,
      model: p.model ?? null,
      engine: p.engine ?? null,
      year: p.year ?? null,
      price: Number(p.price),
      stock: p.stock ?? 0,
      averageRating: p.averageRating ?? 0,
      totalReviews: p.totalReviews ?? 0,
      imgUrl: p.imgUrl ?? null,
    }));
  }

  async getOrderById(args: {
    id: string;
    requesterUserId?: string;
    isAdmin?: boolean;
  }) {
    // Cargamos relaciones de forma segura con QB
    const qb = this.ordersRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.orderDetails', 'od')
      // Si tu OrderDetails tiene relación 'items' y cada item tiene 'product', funciona así:
      .leftJoinAndSelect('od.items', 'item')
      .leftJoinAndSelect('item.product', 'prod')
      .where('o.id = :id', { id: args.id });

    const order = await qb.getOne();

    if (!order) return null;

    // Autorización
    if (
      !args.isAdmin &&
      args.requesterUserId &&
      order.user?.id !== args.requesterUserId
    ) {
      throw new ForbiddenException('No tenés permiso para ver esta orden.');
    }

    // Armar respuesta
    const items =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (order as any)?.orderDetails?.items?.map((it: any) => ({
        productId: it.product?.id,
        productName: it.product?.name,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
      })) ?? [];

    const total = Number((order as any)?.orderDetails?.price ?? 0);

    return {
      id: order.id,
      date: order.date,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items,
      total,
    };
  }

  async getRecentOrders(args: { requesterUserId: string; limit?: number }) {
    const take = Math.min(args.limit ?? 5, 20);
    const orders = await this.ordersRepo.find({
      where: { user: { id: args.requesterUserId } },
      order: { date: 'DESC' },
      take,
      relations: { user: true },
    });
    return orders.map((o) => ({
      id: o.id,
      date: o.date,
      status: o.status,
      paymentStatus: o.paymentStatus,
    }));
  }

  async getProductRating(args: { productId: string }) {
    const prod = await this.productsRepo.findOne({
      where: { id: args.productId },
    });
    if (!prod) return null;
    return {
      productId: prod.id,
      name: prod.name,
      averageRating: prod.averageRating ?? 0,
      totalReviews: prod.totalReviews ?? 0,
    };
  }

  async listOrdersByEmail(args: {
    email: string;
    requesterIsAdmin?: boolean;
    requesterUserId?: string;
  }) {
    if (!args.requesterIsAdmin)
      throw new ForbiddenException('Solo admin puede buscar por email.');
    const user = await this.usersRepo.findOne({ where: { email: args.email } });
    if (!user) return [];
    const orders = await this.ordersRepo.find({
      where: { user: { id: user.id } },
      order: { date: 'DESC' },
      take: 5,
      relations: { user: true },
    });
    return orders.map((o) => ({
      id: o.id,
      date: o.date,
      status: o.status,
      paymentStatus: o.paymentStatus,
    }));
  }
}
