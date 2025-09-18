/* eslint-disable no-useless-escape */
import { Injectable } from '@nestjs/common';
import { ChatToolsService } from './tools.service';

type Intent =
  | {
      type: 'product.search';
      args: {
        tokens?: string[];
        gradeTokens?: string[]; // ej: ['5w40']
        brand?: string;
        inStock?: boolean;
        priceMin?: number;
        priceMax?: number;
      };
    }
  | { type: 'order.byId'; args: { id: string } }
  | { type: 'order.mine'; args: { limit?: number } }
  | { type: 'product.rating'; args: { productId: string } }
  | { type: 'order.byEmail'; args: { email: string } }
  | { type: 'smalltalk' };

const BRANDS = [
  'shell',
  'total',
  'castrol',
  'ypf',
  'bosch',
  'ngk',
  'mann',
  'mann-filter',
  'fram',
  'wix',
  'mobil',
  'elf',
  'liqui',
  'liqui moly',
  'motul',
  'acdelco',
  'champion',
  'valvoline',
].map((n) => n.toLowerCase());

function normalize(str: string) {
  return (str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s\-.,]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Detecta grados tipo "5w40", "0 w 20", "10W-40", etc. y los devuelve en forma canónica "5w40"
function extractOilGrades(raw: string): string[] {
  const s = normalize(raw).replace(/\s*-\s*/g, ' ');
  const found = new Set<string>();
  const re = /(\d{1,2})\s*w\s*(\d{2})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    found.add(`${m[1]}w${m[2]}`);
  }
  return Array.from(found);
}

function expandSynonyms(tokens: string[]): string[] {
  const map: Record<string, string[]> = {
    aceite: ['lubricante', 'oil'],
    filtro: ['filtros', 'filter'],
    bujia: ['bujia', 'bujias', 'bujía', 'bujías', 'spark', 'sparkplug'],
    pastilla: ['pastillas', 'freno', 'frenos'],
  };
  const out = new Set<string>(tokens);
  for (const base of tokens) {
    for (const [key, arr] of Object.entries(map)) {
      if (base === key || arr.includes(base)) {
        out.add(key);
        arr.forEach((a) => out.add(a));
      }
    }
  }
  return Array.from(out);
}

function tokenizeForSearch(q: string): {
  textTokens: string[];
  gradeTokens: string[];
} {
  const norm = normalize(q);
  const stop = new Set([
    'tenes',
    'tienes',
    'hay',
    'buscar',
    'busca',
    'precio',
    'stock',
    'producto',
    'productos',
    'en',
    'de',
    'la',
    'el',
    'los',
    'las',
    'un',
    'una',
    'mis',
    'ultimas',
    'ultimos',
    'mostrar',
    'conseguis',
    'conseguís',
    'vendes',
    'vendés',
    'por',
    'para',
    'del',
    'al',
    'hasta',
    'entre',
    'menor',
    'mayor',
    'me',
    'anda',
    'para',
    'con',
  ]);
  const words = norm.split(' ').filter((t) => t.length > 1 && !stop.has(t));
  const grades = extractOilGrades(q);
  const text = expandSynonyms(Array.from(new Set(words))).slice(0, 8);
  return { textTokens: text, gradeTokens: grades.slice(0, 3) };
}

function detectBrand(q: string): string | undefined {
  const norm = normalize(q);
  const found = BRANDS.find((b) => norm.includes(b));
  if (found === 'liqui moly') return 'liqui'; // DB suele guardar 'Liqui' / 'Liqui Moly'
  if (found === 'mann-filter') return 'mann';
  return found ?? undefined;
}

function parsePriceRange(q: string): { min?: number; max?: number } {
  const norm = normalize(q).replace(/[,\.](?=\d{3}\b)/g, '');
  const nums = norm.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  const between = norm.match(/entre\s+(\d+(?:\.\d+)?)\s+y\s+(\d+(?:\.\d+)?)/);
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  if (/(hasta|menor|<=|<\s*\=?)/.test(norm) && nums.length >= 1)
    return { max: nums[0] };
  if (/(mayor|>=|>\s*\=?)/.test(norm) && nums.length >= 1)
    return { min: nums[0] };
  return {};
}

@Injectable()
export class ChatService {
  constructor(private tools: ChatToolsService) {}

  private classify(q: string): Intent {
    const m = (q || '').toLowerCase().trim();

    // 1) Orden por ID
    const idMatch = m.match(/[0-9a-f]{8}-[0-9a-f-]{13,}|[0-9a-z]{10,}/i);
    if (/(orden|pedido|order|estado)/.test(m) && idMatch) {
      return { type: 'order.byId', args: { id: idMatch[0] } };
    }

    // 2) Mis compras
    if (
      /(mis|mis\s+ultimas|últimas|ultimas).*(compras|ordenes|pedidos)/.test(m)
    ) {
      return { type: 'order.mine', args: {} };
    }

    // 3) Órdenes por email (solo admin)
    const emailMatch = m.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    if (/(ordenes|pedidos|compras).*(de|por).*@/.test(m) && emailMatch) {
      return { type: 'order.byEmail', args: { email: emailMatch[0] } };
    }

    // 4) Rating de producto
    const pid = m.match(/prod(?:ucto)?[:\s-]*([0-9a-f-]{10,})/i)?.[1];
    if (/rating|promedio|calificacion|reseñas|reviews/.test(m) && pid) {
      return { type: 'product.rating', args: { productId: pid } };
    }

    // 5) Búsqueda de productos
    if (
      /(tenes|tienes|hay|buscar|busca|precio|stock|conseguis|conseguís|vendes|vendés|producto|filtro|aceite|bujia|bujía)/.test(
        m,
      ) ||
      /\d{1,2}\s*w\s*\d{2}/i.test(m)
    ) {
      const inStock = /(en\s+stock|disponible|disponibles)/.test(m)
        ? true
        : undefined;
      const brand = detectBrand(q);
      const { min: priceMin, max: priceMax } = parsePriceRange(q);
      const { textTokens, gradeTokens } = tokenizeForSearch(q);
      return {
        type: 'product.search',
        args: {
          tokens: textTokens,
          gradeTokens,
          brand,
          inStock,
          priceMin,
          priceMax,
        },
      };
    }

    return { type: 'smalltalk' };
  }

  async respond(message: string, ctx: { userId?: string; isAdmin?: boolean }) {
    const intent = this.classify(message || '');
    console.log('[CHAT][INTENT]', JSON.stringify(intent));

    try {
      switch (intent.type) {
        case 'product.search': {
          const rows = await this.tools.findProducts({
            tokens: intent.args.tokens,
            gradeTokens: intent.args.gradeTokens,
            brand: intent.args.brand,
            inStock: intent.args.inStock,
            priceMin: intent.args.priceMin,
            priceMax: intent.args.priceMax,
            limit: 12,
          });

          if (!rows.length) return 'No encontré productos para esa búsqueda.';

          const lines = rows.map((p) => {
            const price = isFinite(Number(p.price))
              ? Number(p.price).toFixed(2)
              : String(p.price);
            return `• ${p.name}${p.brand ? ` (${p.brand})` : ''} — $${price} — stock: ${p.stock}`;
          });
          return lines.join('\n');
        }

        case 'order.byId': {
          const data = await this.tools.getOrderById({
            id: intent.args.id,
            requesterUserId: ctx.userId,
            isAdmin: !!ctx.isAdmin,
          });
          if (!data) return `No encontré la orden ${intent.args.id}.`;
          return [
            `Orden ${data.id}`,
            `Estado: ${data.status}`,
            `Pago: ${data.paymentStatus}`,
            `Fecha: ${data.date?.toISOString?.().slice(0, 10) ?? ''}`,
            `Total: $${Number(data.total ?? 0).toFixed(2)}`,
          ].join('\n');
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
                `• ${o.id} — ${o.status} — ${o.date?.toISOString?.().slice(0, 10) ?? ''}`,
            )
            .join('\n');
        }

        case 'order.byEmail': {
          const rows = await this.tools.listOrdersByEmail({
            email: intent.args.email,
            requesterIsAdmin: !!ctx.isAdmin,
          });
          if (!rows.length)
            return `No encontré órdenes para ${intent.args.email}.`;
          return rows
            .map(
              (o) =>
                `• ${o.id} — ${o.status} — ${o.date?.toISOString?.().slice(0, 10) ?? ''}`,
            )
            .join('\n');
        }

        case 'product.rating': {
          const r = await this.tools.getProductRating({
            productId: intent.args.productId,
          });
          if (!r) return 'Producto no encontrado.';
          const avg = Number(r.averageRating ?? 0).toFixed(1);
          return `⭐ ${avg} (${r.totalReviews} reseñas) — ${r.name}`;
        }

        default:
          return 'Puedo buscar productos o ver el estado de tus órdenes. Probá: “¿Tenés aceite 5W40?” o “Mis últimas compras”.';
      }
    } catch (err: any) {
      console.error('[CHAT][ERROR]', err?.message || err);
      if (err?.status === 403)
        return err.message || 'No tenés permiso para esa acción.';
      return 'Ocurrió un error procesando tu solicitud.';
    }
  }
}
