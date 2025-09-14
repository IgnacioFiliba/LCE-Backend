export const RATE_LIMIT_OPTIONS = Symbol('RATE_LIMIT_OPTIONS');

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: any) => string;
};
