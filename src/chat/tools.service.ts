// src/chat/tools.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Products } from 'src/products/entities/product.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { Users } from 'src/users/entities/user.entity';

type FindArgs = {
  tokens?: string[];
  brand?: string;
  model?: string;
  engine?: string;
  year?: string | number;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  limit?: number;
};

@Injectable()
export class ChatToolsService {
  constructor(
    @InjectRepository(Products) private productsRepo: Repository<Products>,
    @InjectRepository(Orders) private ordersRepo: Repository<Orders>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  /** Paso 1: búsqueda estricta (AND entre tokens, respeta inStock/rango de precio) */
  private async searchStrict(args: FindArgs) {
    const qb = this.productsRepo.createQueryBuilder('p');

    if (args.tokens?.length) {
      args.tokens.slice(0, 8).forEach((t, i) => {
        const like = `%${t.toLowerCase()}%`;
        qb.andWhere(
          new Brackets((w) => {
            w.where('LOWER(p.name) LIKE :t', { t: like })
              .orWhere('LOWER(p.brand) LIKE :t', { t: like })
              .orWhere('LOWER(p.model) LIKE :t', { t: like })
              .orWhere('LOWER(p.engine) LIKE :t', { t: like })
              .orWhere('LOWER(p.description) LIKE :t', { t: like });
          }),
        );
      });
    }

    if (args.brand) qb.andWhere('LOWER(p.brand) LIKE LOWER(:b)', { b: `%${args.brand}%` });
    if (args.model) qb.andWhere('LOWER(p.model) LIKE LOWER(:m)', { m: `%${args.model}%` });
    if (args.engine) qb.andWhere('LOWER(p.engine) LIKE LOWER(:e)', { e: `%${args.engine}%` });
    if (args.year != null) qb.andWhere('p.year = :y', { y: String(args.year) });
    if (args.priceMin != null) qb.andWhere('p.price >= :min', { min: args.priceMin });
    if (args.priceMax != null) qb.andWhere('p.price <= :max', { max: args.priceMax });
    if (args.inStock != null) qb.andWhere(args.inStock ? 'p.stock >= 1' : 'p.stock <= 0');

    qb.orderBy('p.stock', 'DESC').addOrderBy('p.name', 'ASC').take(Math.min(args.limit ?? 8, 20));

    return qb.getMany();
  }

  /** Paso 2: si no hay resultados, relaja `inStock` (por si el dato está desactualizado) */
  private async searchNoStockFilter(args: FindArgs) {
    const relaxed: FindArgs = { ...args, inStock: undefined };
    return this.searchStrict(relaxed);
  }

  /** Paso 3: si aún no hay, usar OR entre *todos* los tokens (recall alto) */
  private async searchLooseOr(args: FindArgs) {
    const qb = this.productsRepo.createQueryBuilder('p');

    if (args.tokens?.length) {
      const likes = args.tokens.slice(0, 8).map((t) => `%${t.toLowerCase()}%`);
      qb.andWhere(
        new Brackets((w) => {
          likes.forEach((like, idx) => {
            const alias = `t${idx}`;
            w.orWhere(
              new Brackets((w2) => {
                w2.where(`LOWER(p.name) LIKE :${alias}`, { [alias]: like })
                  .orWhere(`LOWER(p.brand) LIKE :${alias}`, { [alias]: like })
                  .orWhere(`LOWER(p.model) LIKE :${alias}`, { [alias]: like })
                  .orWhere(`LOWER(p.engine) LIKE :${alias}`, { [alias]: like })
                  .orWhere(`LOWER(p.description) LIKE :${alias}`, { [alias]: like });
              }),
            );
          });
        }),
      );
    }

    if (args.brand) qb.andWhere('LOWER(p.brand) LIKE LOWER(:b)', { b: `%${args.brand}%` });
    if (args.priceMin != null) qb.andWhere('p.price >= :min', { min: args.priceMin });
    if (args.priceMax != null) qb.andWhere('p.price <= :max', { max: args.priceMax });

    qb.orderBy('p.stock', 'DESC').addOrderBy('p.name', 'ASC').take(Math.min(args.limit ?? 8, 20));

    return qb.getMany();
  }

  /** Paso 4: búsqueda por grado de aceite solamente (si había alguno) */
  private async searchByOilGradeOnly(args: FindArgs) {
    const grade = args.tokens?.find((t) => /^\d{1,2}w\d{2}$/.test(t));
    if (!grade) return [];
    const qb = this.productsRepo.createQueryBuilder('p')
      .where('LOWER(p.name) LIKE :g OR LOWER(p.description) LIKE :g', { g: `%${grade}%` })
      .orderBy('p.stock', 'DESC')
      .addOrderBy('p.name', 'ASC')
      .take(Math.min(args.limit ?? 8, 20));

    return qb.getMany();
  }

  /** API principal: intenta varias estrategias con fallback */
  async findProducts(args: FindArgs) {
    try {
      const first = await this.searchStrict(args);
      if (first.length) return this.mapProducts(first);

      const second = await this.searchNoStockFilter(args);
      if (second.length) return this.mapProducts(second);

      const third = await this.searchLooseOr(args);
      if (third.length) return this.mapProducts(third);

      const fourth = await this.searchByOilGradeOnly(args);
      if (fourth.length) return this.mapProducts(fourth);

      return [];
    } catch (e: any) {
      console.error('[CHAT][TOOLS][findProducts][ERROR]', e?.message || e);
      return [];
    }
  }

  private mapProducts(rows: Products[]) {
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

  async getOrderById(args: { id: string; requesterUserId?: string; isAdmin?: boolean }) {
    try {
      const qb = this.ordersRepo
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.user', 'user')
        .leftJoinAndSelect('o.orderDetails', 'od')
        .leftJoinAndSelect('od.items', 'item')
        .leftJoinAndSelect('item.product', 'prod')
        .where('o.id = :id', { id: args.id });

      const order = await qb.getOne();
      if (!order) return null;

      if (!args.isAdmin && args.requesterUserId && order.user?.id !== args.requesterUserId) {
        throw new ForbiddenException('No tenés permiso para ver esta orden.');
      }

      const items =
        (order.orderDetails?.items ?? []).map((it) => ({
          productId: it.product?.id,
          productName: it.product?.name,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
        })) ?? [];

      const total = Number(order.orderDetails?.price ?? 0);

      return {
        id: order.id,
        date: order.date,
        status: order.status,
        paymentStatus: order.paymentStatus,
        items,
        total,
      };
    } catch (e: any) {
      console.error('[CHAT][TOOLS][getOrderById][ERROR]', e?.message || e);
      return null;
    }
  }

  async getRecentOrders(args: { requesterUserId: string; limit?: number }) {
    try {
      const take = Math.min(args.limit ?? 5, 20);
      const rows = await this.ordersRepo.find({
        where: { user: { id: args.requesterUserId } },
        order: { date: 'DESC' },
        take,
        relations: { user: true },
      });
      return rows.map((o) => ({
        id: o.id,
        date: o.date,
        status: o.status,
        paymentStatus: o.paymentStatus,
      }));
    } catch (e: any) {
      console.error('[CHAT][TOOLS][getRecentOrders][ERROR]', e?.message || e);
      return [];
    }
  }

  async getProductRating(args: { productId: string }) {
    try {
      const prod = await this.productsRepo.findOne({ where: { id: args.productId } });
      if (!prod) return null;
      return {
        productId: prod.id,
        name: prod.name,
        averageRating: prod.averageRating ?? 0,
        totalReviews: prod.totalReviews ?? 0,
      };
    } catch (e: any) {
      console.error('[CHAT][TOOLS][getProductRating][ERROR]', e?.message || e);
      return null;
    }
  }

  async listOrdersByEmail(args: { email: string; requesterIsAdmin?: boolean }) {
    try {
      if (!args.requesterIsAdmin) throw new ForbiddenException('Solo admin puede buscar por email.');
      const user = await this.usersRepo.findOne({ where: { email: args.email } });
      if (!user) return [];
      const rows = await this.ordersRepo.find({
        where: { user: { id: user.id } },
        order: { date: 'DESC' },
        take: 5,
        relations: { user: true },
      });
      return rows.map((o) => ({
        id: o.id,
        date: o.date,
        status: o.status,
        paymentStatus: o.paymentStatus,
      }));
    } catch (e: any) {
      console.error('[CHAT][TOOLS][listOrdersByEmail][ERROR]', e?.message || e);
      return [];
    }
  }
}
