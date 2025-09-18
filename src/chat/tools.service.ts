/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Products } from 'src/products/entities/product.entity';
import { Orders } from 'src/orders/entities/order.entity';
import { Users } from 'src/users/entities/user.entity';

type FindArgs = {
  tokens?: string[]; // tokens de texto (aceite, filtro, etc.)
  gradeTokens?: string[]; // tokens de grado (5w40, 0w20, etc.)
  brand?: string;
  model?: string;
  engine?: string;
  year?: string | number;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  limit?: number;
};

function makeGradeVariants(grade: string): string[] {
  // 5w40 -> variantes para LIKE (maneja espacios/hífen)
  const m = grade.match(/^(\d{1,2})w(\d{2})$/i);
  if (!m) return [`%${grade.toLowerCase()}%`];
  const a = m[1],
    b = m[2];
  return [
    `%${a}w${b}%`,
    `%${a}w-${b}%`,
    `%${a} w ${b}%`,
    `%${a} w-${b}%`,
    `%${a}w ${b}%`,
  ];
}

@Injectable()
export class ChatToolsService {
  constructor(
    @InjectRepository(Products) private productsRepo: Repository<Products>,
    @InjectRepository(Orders) private ordersRepo: Repository<Orders>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  // ---------- PRODUCT SEARCH con múltiples estrategias ----------
  private baseOrder(
    qb: ReturnType<Repository<Products>['createQueryBuilder']>,
    limit?: number,
  ) {
    qb.orderBy('p.stock', 'DESC')
      .addOrderBy('p.name', 'ASC')
      .take(Math.min(limit ?? 12, 30));
  }

  private applyCommonFilters(qb: any, args: FindArgs) {
    if (args.brand) qb.andWhere('p.brand ILIKE :b', { b: `%${args.brand}%` });
    if (args.model) qb.andWhere('p.model ILIKE :m', { m: `%${args.model}%` });
    if (args.engine)
      qb.andWhere('p.engine ILIKE :e', { e: `%${args.engine}%` });
    if (args.year != null) qb.andWhere('p.year = :y', { y: String(args.year) });
    if (args.priceMin != null)
      qb.andWhere('p.price >= :min', { min: args.priceMin });
    if (args.priceMax != null)
      qb.andWhere('p.price <= :max', { max: args.priceMax });
    if (args.inStock != null)
      qb.andWhere(args.inStock ? 'p.stock >= 1' : 'p.stock <= 0');
  }

  // Estrategia A: AND entre tokens + AND entre grados (cada grado puede aparecer en name/brand/model/engine/description con variaciones)
  private async searchStrict(args: FindArgs) {
    const qb = this.productsRepo.createQueryBuilder('p');

    if (args.tokens?.length) {
      args.tokens.slice(0, 8).forEach((t, i) => {
        const like = `%${t.toLowerCase()}%`;
        qb.andWhere(
          new Brackets((w) => {
            w.where('LOWER(p.name) LIKE :t' + i, { ['t' + i]: like })
              .orWhere('LOWER(p.brand) LIKE :t' + i, { ['t' + i]: like })
              .orWhere('LOWER(p.model) LIKE :t' + i, { ['t' + i]: like })
              .orWhere('LOWER(p.engine) LIKE :t' + i, { ['t' + i]: like })
              .orWhere('LOWER(p.description) LIKE :t' + i, { ['t' + i]: like });
          }),
        );
      });
    }

    if (args.gradeTokens?.length) {
      args.gradeTokens.slice(0, 3).forEach((g, i) => {
        const variants = makeGradeVariants(g.toLowerCase());
        qb.andWhere(
          new Brackets((w) => {
            variants.forEach((pat, j) => {
              const key = `g${i}_${j}`;
              w.orWhere('p.name ILIKE :' + key, { [key]: pat })
                .orWhere('p.brand ILIKE :' + key, { [key]: pat })
                .orWhere('p.model ILIKE :' + key, { [key]: pat })
                .orWhere('p.engine ILIKE :' + key, { [key]: pat })
                .orWhere('p.description ILIKE :' + key, { [key]: pat });
            });
          }),
        );
      });
    }

    this.applyCommonFilters(qb, args);
    this.baseOrder(qb, args.limit);
    return qb.getMany();
  }

  // Estrategia B: relajamos inStock
  private async searchRelaxStock(args: FindArgs) {
    const qb = this.productsRepo.createQueryBuilder('p');

    if (args.tokens?.length) {
      qb.andWhere(
        new Brackets((w) => {
          args.tokens!.slice(0, 8).forEach((t, i) => {
            const like = `%${t.toLowerCase()}%`;
            w.andWhere(
              new Brackets((w2) => {
                w2.where('LOWER(p.name) LIKE :t' + i, { ['t' + i]: like })
                  .orWhere('LOWER(p.brand) LIKE :t' + i, { ['t' + i]: like })
                  .orWhere('LOWER(p.model) LIKE :t' + i, { ['t' + i]: like })
                  .orWhere('LOWER(p.engine) LIKE :t' + i, { ['t' + i]: like })
                  .orWhere('LOWER(p.description) LIKE :t' + i, {
                    ['t' + i]: like,
                  });
              }),
            );
          });
        }),
      );
    }

    if (args.gradeTokens?.length) {
      qb.andWhere(
        new Brackets((w) => {
          args.gradeTokens!.slice(0, 3).forEach((g, i) => {
            const variants = makeGradeVariants(g.toLowerCase());
            w.andWhere(
              new Brackets((w2) => {
                variants.forEach((pat, j) => {
                  const key = `rg${i}_${j}`;
                  w2.orWhere('p.name ILIKE :' + key, { [key]: pat })
                    .orWhere('p.brand ILIKE :' + key, { [key]: pat })
                    .orWhere('p.model ILIKE :' + key, { [key]: pat })
                    .orWhere('p.engine ILIKE :' + key, { [key]: pat })
                    .orWhere('p.description ILIKE :' + key, { [key]: pat });
                });
              }),
            );
          });
        }),
      );
    }

    // Igual que la A pero sin forzar inStock
    const relaxed: FindArgs = { ...args, inStock: undefined };
    this.applyCommonFilters(qb, relaxed);
    this.baseOrder(qb, args.limit);
    return qb.getMany();
  }

  // Estrategia C: OR global entre todos los tokens (recall alto)
  private async searchLooseOr(args: FindArgs) {
    const qb = this.productsRepo.createQueryBuilder('p');

    // OR de text-tokens
    if (args.tokens?.length) {
      qb.andWhere(
        new Brackets((w) => {
          args.tokens!.slice(0, 8).forEach((t, i) => {
            const like = `%${t.toLowerCase()}%`;
            const alias = `lt${i}`;
            w.orWhere('LOWER(p.name) LIKE :' + alias, { [alias]: like })
              .orWhere('LOWER(p.brand) LIKE :' + alias, { [alias]: like })
              .orWhere('LOWER(p.model) LIKE :' + alias, { [alias]: like })
              .orWhere('LOWER(p.engine) LIKE :' + alias, { [alias]: like })
              .orWhere('LOWER(p.description) LIKE :' + alias, {
                [alias]: like,
              });
          });
        }),
      );
    }

    // OR de grados (con variantes)
    if (args.gradeTokens?.length) {
      qb.andWhere(
        new Brackets((w) => {
          args.gradeTokens!.slice(0, 3).forEach((g, i) => {
            const variants = makeGradeVariants(g.toLowerCase());
            variants.forEach((pat, j) => {
              const key = `lg${i}_${j}`;
              w.orWhere('p.name ILIKE :' + key, { [key]: pat })
                .orWhere('p.brand ILIKE :' + key, { [key]: pat })
                .orWhere('p.model ILIKE :' + key, { [key]: pat })
                .orWhere('p.engine ILIKE :' + key, { [key]: pat })
                .orWhere('p.description ILIKE :' + key, { [key]: pat });
            });
          });
        }),
      );
    }

    // Relajamos también inStock
    const relaxed: FindArgs = { ...args, inStock: undefined };
    this.applyCommonFilters(qb, relaxed);
    this.baseOrder(qb, args.limit);
    return qb.getMany();
  }

  // Estrategia D: solo grado (si vino alguno)
  private async searchByOilGradeOnly(args: FindArgs) {
    if (!args.gradeTokens?.length) return [];
    const qb = this.productsRepo.createQueryBuilder('p');

    qb.andWhere(
      new Brackets((w) => {
        args.gradeTokens!.slice(0, 3).forEach((g, i) => {
          const variants = makeGradeVariants(g.toLowerCase());
          variants.forEach((pat, j) => {
            const key = `og${i}_${j}`;
            w.orWhere('p.name ILIKE :' + key, { [key]: pat })
              .orWhere('p.brand ILIKE :' + key, { [key]: pat })
              .orWhere('p.model ILIKE :' + key, { [key]: pat })
              .orWhere('p.engine ILIKE :' + key, { [key]: pat })
              .orWhere('p.description ILIKE :' + key, { [key]: pat });
          });
        });
      }),
    );

    // Sin inStock forzado y sin rango para maximizar recall
    this.baseOrder(qb, args.limit);
    return qb.getMany();
  }

  /** API principal con fallbacks encadenados */
  async findProducts(args: FindArgs) {
    try {
      // 1) Estricto
      const a = await this.searchStrict(args);
      if (a.length) return this.mapProducts(a);

      // 2) Sin inStock
      const b = await this.searchRelaxStock(args);
      if (b.length) return this.mapProducts(b);

      // 3) OR global
      const c = await this.searchLooseOr(args);
      if (c.length) return this.mapProducts(c);

      // 4) Solo grado
      const d = await this.searchByOilGradeOnly(args);
      if (d.length) return this.mapProducts(d);

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

  // ---------- ÓRDENES ----------
  async getOrderById(args: {
    id: string;
    requesterUserId?: string;
    isAdmin?: boolean;
  }) {
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

      if (
        !args.isAdmin &&
        args.requesterUserId &&
        order.user?.id !== args.requesterUserId
      ) {
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
    } catch (e: any) {
      console.error('[CHAT][TOOLS][getProductRating][ERROR]', e?.message || e);
      return null;
    }
  }

  async listOrdersByEmail(args: { email: string; requesterIsAdmin?: boolean }) {
    try {
      if (!args.requesterIsAdmin)
        throw new ForbiddenException('Solo admin puede buscar por email.');
      const user = await this.usersRepo.findOne({
        where: { email: args.email },
      });
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
