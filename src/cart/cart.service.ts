import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Products } from 'src/products/entities/product.entity';
import { AddItemDto } from './dto/add-item.dto';
import { CartView, CartItemView } from './types/cart-view';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Products) private readonly productRepo: Repository<Products>,
  ) {}

  // ---------- helpers ----------
  private toNum(n: any): number {
    if (n === null || n === undefined) return 0;
    if (typeof n === 'number') return n;
    const p = parseFloat(String(n));
    return Number.isFinite(p) ? p : 0;
  }

  private money(n: any): number {
    const v = this.toNum(n);
    return Number(v.toFixed(2));
  }

  private async findOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) {
      cart = this.cartRepo.create({ userId, items: [] });
      await this.cartRepo.save(cart);
    }
    return cart;
  }

  private async loadCartWithItems(userId: string): Promise<Cart> {
    const cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
      order: { updatedAt: 'DESC' },
    });
    return cart ?? this.cartRepo.create({ userId, items: [] });
  }

  private async mapToView(cart: Cart): Promise<CartView> {
    const items = cart.items ?? [];

    // Traer productos actuales
    const productIds = items.map((i) => i.productId);
    const products = productIds.length
      ? await this.productRepo.find({ where: { id: In(productIds) } })
      : [];
    const prodMap = new Map(products.map((p) => [p.id, p]));

    const viewItems: CartItemView[] = items.map((i) => {
      const p = prodMap.get(i.productId);
      const currentPrice = this.toNum(p?.price);
      const stock = this.toNum(p?.stock);

      const outOfStock = !p || stock <= 0;
      const insufficientStock = !outOfStock && i.quantity > stock;
      const priceChanged =
        !!p && this.money(i.unitPriceSnapshot) !== this.money(currentPrice);

      // para mostrar: limitamos a stock si hace falta (no persistimos este cap aquí)
      const quantity = insufficientStock ? stock : i.quantity;

      // si no hay producto o stock, cantidad segura 0 para no romper UI
      const safeQty = outOfStock ? 0 : quantity;

      const unitNow = this.money(currentPrice);
      const lineNow = this.money(safeQty * currentPrice);

      return {
        id: i.id,
        productId: i.productId,
        name: p?.name ?? 'Producto no disponible',
        imgUrl: p?.imgUrl,
        quantity: safeQty,
        unitPriceSnapshot: this.money(i.unitPriceSnapshot),
        unitPriceCurrent: unitNow,
        lineTotalCurrent: lineNow,

        // aliases para compatibilidad con el front (evita undefined.toFixed)
        unitPrice: unitNow,
        lineTotal: lineNow,

        // aliases adicionales muy comunes en UIs
        price: unitNow,
        total: lineNow,
        amount: lineNow,

        flags: { priceChanged, insufficientStock, outOfStock },
      } as any;
    });

    const invalidItemsCount = viewItems.filter(
      (v) =>
        v.flags.outOfStock || v.flags.insufficientStock || v.flags.priceChanged,
    ).length;

    const subtotal = this.money(
      viewItems.reduce((acc, v) => acc + this.toNum(v.lineTotal), 0),
    );
    const tax = 0;
    const discount = 0;
    const total = this.money(subtotal + tax - discount);

    return {
      id: cart.id ?? null,
      userId: cart.userId,
      items: viewItems,
      summary: {
        subtotal,
        discount,
        tax,
        total,
        currency: 'ARS',
        invalidItemsCount,
        // alias para front
        subTotal: subtotal,
        grandTotal: total,
      } as any,
    };
  }

  // ---------- API ----------

  async getCart(userId: string): Promise<CartView> {
    const cart = await this.loadCartWithItems(userId);
    return this.mapToView(cart);
  }

  async addItem(userId: string, dto: AddItemDto): Promise<CartView> {
    const qtyReq = Math.max(1, this.toNum(dto.quantity));
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product || this.toNum(product.stock) <= 0) {
      throw new ConflictException({
        code: 'CART_OUT_OF_STOCK',
        message: 'Producto sin stock.',
      });
    }

    const cart = await this.findOrCreateCart(userId);
    let item = await this.itemRepo.findOne({
      where: { cartId: cart.id, productId: dto.productId },
    });

    const price = this.toNum(product.price);
    const stock = this.toNum(product.stock);

    if (!item) {
      const qty = Math.min(qtyReq, stock);
      if (qty <= 0) throw new ConflictException({ code: 'CART_OUT_OF_STOCK' });
      item = this.itemRepo.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: qty,
        unitPriceSnapshot: price,
      });
      item.cart = cart; // asegura la relación para que TypeORM no intente NULL
    } else {
      const newQty = Math.min(item.quantity + qtyReq, stock);
      if (newQty <= 0)
        throw new ConflictException({ code: 'CART_OUT_OF_STOCK' });
      item.quantity = newQty;
      item.unitPriceSnapshot = price; // refrescamos snapshot
      item.cart = cart; // refuerza la FK al actualizar
    }

    await this.itemRepo.save(item);
    cart.updatedAt = new Date();
    await this.cartRepo.save(cart);

    const fresh = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });
    return this.mapToView(fresh!);
  }

  async updateItemQty(
    userId: string,
    productId: string, // sigue aceptando productId
    qty: number,
  ): Promise<CartView> {
    const cart = await this.findOrCreateCart(userId);

    // Buscar por productId dentro del carrito del usuario
    const item = await this.itemRepo.findOne({
      where: { productId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Item no encontrado en tu carrito');

    const q = Math.max(0, this.toNum(qty));

    if (q === 0) {
      await this.itemRepo.delete({ id: item.id });
    } else {
      const product = await this.productRepo.findOne({
        where: { id: item.productId },
      });
      if (!product)
        throw new ConflictException({
          code: 'CART_OUT_OF_STOCK',
          message: 'Producto inexistente.',
        });
      const stock = this.toNum(product.stock);
      if (stock <= 0)
        throw new ConflictException({ code: 'CART_OUT_OF_STOCK' });
      if (q > stock)
        throw new ConflictException({
          code: 'CART_INSUFFICIENT_STOCK',
          available: stock,
        });

      item.quantity = q;
      item.unitPriceSnapshot = this.toNum(product.price);
      item.cart = cart; // por consistencia, mantenemos la relación
      await this.itemRepo.save(item);
    }

    cart.updatedAt = new Date();
    await this.cartRepo.save(cart);
    const fresh = await this.cartRepo.findOne({
      where: { id: cart.id },
      relations: ['items'],
    });
    return this.mapToView(fresh!);
  }

  // ✅ ahora también borra por productId (sin cambiar nombres/firmas)
  async removeItem(userId: string, itemId: string): Promise<void> {
    const cart = await this.findOrCreateCart(userId);

    // 1) intenta por CartItem.id
    let item = await this.itemRepo.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    // 2) si no existe, intenta por productId dentro del carrito del usuario
    if (!item) {
      item = await this.itemRepo.findOne({
        where: { productId: itemId, cartId: cart.id },
      });
    }

    if (!item) return; // se mantiene el 204 si no existe

    await this.itemRepo.delete({ id: item.id });
    cart.updatedAt = new Date();
    await this.cartRepo.save(cart);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findOne({ where: { userId } });
    if (!cart) return;
    await this.itemRepo.delete({ cartId: cart.id });
    cart.updatedAt = new Date();
    await this.cartRepo.save(cart);
  }

  /**
   * Revalida stock y precios; si hay inconsistencias, lanza 409 con el Cart actualizado.
   * Si todo OK, devuelve OrderDraft (payload para que tu compañero cree la preferencia de Mercado Pago).
   * Aquí NO se descuenta stock ni se crean órdenes definitivas.
   */
  async prepareCheckout(userId: string) {
    const cart = await this.loadCartWithItems(userId);
    if (!cart.id || (cart.items ?? []).length === 0) {
      throw new ConflictException({ code: 'CART_EMPTY' });
    }
    const view = await this.mapToView(cart);
    if (view.summary.invalidItemsCount > 0) {
      throw new ConflictException({ code: 'CART_NEEDS_REFRESH', cart: view });
    }
    // Devolvemos el payload que usa OrdersService (si decides delegar).
    return {
      orderId: null,
      status: 'pending',
      currency: view.summary.currency,
      items: view.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice ?? i.unitPriceCurrent, // alias numérico
      })),
      subtotal: view.summary.subtotal,
      tax: view.summary.tax,
      total: view.summary.total,
    };
  }
}
