import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '@/lib/types';

export const requireAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'admin') {
    return c.json({ error: 'Unauthorized, Admin Only' }, 401);
  }
  return next();
};
