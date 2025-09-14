/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { RATE_LIMIT_OPTIONS, RateLimitOptions } from './rate-limit.tokens';

type Bucket = { count: number; resetAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, Bucket>();

  constructor(
    @Inject(RATE_LIMIT_OPTIONS) private readonly opts: RateLimitOptions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const key =
      this.opts.keyGenerator?.(req) ??
      (req.ip || req.headers['x-forwarded-for'] || 'global');

    const now = Date.now();
    const { windowMs, max } = this.opts;

    let b = this.buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, b);
    }

    b.count += 1;

    // headers informativos
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - b.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(b.resetAt / 1000)));

    if (b.count > max) {
      const retryAfterSec = Math.max(0, Math.ceil((b.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      throw new BadRequestException(
        'Demasiadas solicitudes, intentá más tarde.',
      );
    }

    return true;
  }
}
