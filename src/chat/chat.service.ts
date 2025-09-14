import { Injectable } from '@nestjs/common';
import { ChatToolsService } from './tools.service';

type Intent =
  | {
      type: 'product.search';
      args: { q?: string; brand?: string; inStock?: boolean };
    }
  | { type: 'order.byId'; args: { id: string } }
  | { type: 'order.mine'; args: { limit?: number } }
  | { type: 'product.rating'; args: { productId: string } }
  | { type: 'order.byEmail'; args: { email: string } }
  | { type: 'smalltalk' };

@Injectable()
export class ChatService {
  constructor(private tools: ChatToolsService) {}

  private classify(q: string): Intent {
    const m = q.toLowerCase().trim();

    // order by id (uuid-like o id largo alfanumérico)
    const idMatch = m.match(/[0-9a-f]{8}-[0-9a-f-]{13,}|[0-9a-z]{10,}/i);
    if (/(orden|pedido|order|estado)/.test(m) && idMatch) {
      return { type: 'order.byId', args: { id: idMatch[0] } };
    }

    // mis compras
    if (
      /(mis|mis\s+ultimas|últimas|ultimas).*(compras|ordenes|pedidos)/.test(m)
    ) {
      return { type: 'order.mine', args: {} };
    }

    // órdenes por email (solo admin)
    const emailMatch = m.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (/(ordenes|pedidos|compras).*(de|por).*@/.test(m) && emailMatch) {
      return { type: 'order.byEmail', args: { email: emailMatch[0] } };
    }

    // rating de producto (cuando envían un id explícito)
    const pid = m.match(/prod(?:ucto)?[:\s-]*([0-9a-f-]{10,})/i)?.[1];
    if (/rating|promedio|calificacion|reseñas|reviews/.test(m) && pid) {
      return { type: 'product.rating', args: { productId: pid } };
    }

    // búsqueda de productos
    if (
      /(tenes|tienes|hay|buscar|busca|precio|stock|conseguis|conseguís|vendes|vendés|producto)/.test(
        m,
      )
    ) {
      // heurística simple para marca/stock
      const stock = /(en\s+stock|disponible|disponibles)/.test(m)
        ? true
        : undefined;
      // ejemplo: "precio de filtros mann"
      const brand = m.match(/\b(mann|shell|castrol|ypf|bosch|ngk)\b/i)?.[0];
      const qtext = q
        .replace(
          /(tenes|tienes|hay|buscar|busca|precio|stock|producto|en\s+stock)/gi,
          '',
        )
        .trim();
      return {
        type: 'product.search',
        args: {
          q: qtext || undefined,
          brand: brand || undefined,
          inStock: stock,
        },
      };
    }

    return { type: 'smalltalk' };
  }

  async respond(message: string, ctx: { userId?: string; isAdmin?: boolean }) {
    const intent = this.classify(message);
    console.log('[CHAT]', { message, intent, ctx });

    try {
      switch (intent.type) {
        case 'product.search': {
          const rows = await this.tools.findProducts({
            q: intent.args.q,
            brand: intent.args.brand,
            inStock: intent.args.inStock,
            limit: 5,
          });
          if (!rows.length) return 'No encontré productos para esa búsqueda.';
          const lines = rows.map(
            (p) =>
              `• ${p.name}${p.brand ? ` (${p.brand})` : ''} — $${p.price} — stock: ${p.stock}`,
          );
          return lines.join('\n');
        }

        case 'order.byId': {
          const data = await this.tools.getOrderById({
            id: intent.args.id,
            requesterUserId: ctx.userId,
            isAdmin: !!ctx.isAdmin,
          });
          if (!data) return `No encontré la orden ${intent.args.id}.`;
          return `Orden ${data.id}\nEstado: ${data.status}\nPago: ${data.paymentStatus}\nFecha: ${data.date.toISOString().slice(0, 10)}\nTotal: $${data.total}`;
        }

        case 'order.mine': {
          if (!ctx.userId)
            return 'Para ver tus compras necesitás iniciar sesión.';
          const rows = await this.tools.getRecentOrders({
            requesterUserId: ctx.userId,
            limit: 5,
          });
          if (!rows.length) return 'No encontré compras asociadas a tu cuenta.';
          return rows
            .map(
              (o) =>
                `• ${o.id} — ${o.status} — ${o.date.toISOString().slice(0, 10)}`,
            )
            .join('\n');
        }

        case 'order.byEmail': {
          const rows = await this.tools.listOrdersByEmail({
            email: intent.args.email,
            requesterIsAdmin: !!ctx.isAdmin,
            requesterUserId: ctx.userId,
          });
          if (!rows.length)
            return `No encontré órdenes para ${intent.args.email}.`;
          return rows
            .map(
              (o) =>
                `• ${o.id} — ${o.status} — ${o.date.toISOString().slice(0, 10)}`,
            )
            .join('\n');
        }

        case 'product.rating': {
          const r = await this.tools.getProductRating({
            productId: intent.args.productId,
          });
          if (!r) return 'Producto no encontrado.';

          return `⭐ ${r.averageRating?.toFixed(1) ?? 0} (${r.totalReviews} reseñas) — ${r.name}`;
        }

        default:
          return 'Puedo buscar productos o ver el estado de tus órdenes. Probá: “¿Tenés aceite 5W40?” o “Mis últimas compras”.';
      }
    } catch (err: any) {
      if (err?.status === 403)
        return err.message || 'No tenés permiso para esa acción.';
      console.error('[CHAT][ERROR]', intent, err?.message || err);
      return 'Ocurrió un error procesando tu solicitud.';
    }
  }
}
