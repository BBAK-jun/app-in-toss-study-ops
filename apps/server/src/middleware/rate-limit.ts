import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';

export const authLoginRateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key: `login:${ip}` });
  if (!success) {
    throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many login attempts. Try again later.');
  }
  await next();
};
