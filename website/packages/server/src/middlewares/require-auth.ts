import type { MiddlewareHandler } from 'hono';
import type { AppBindings } from '@/lib/types';

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
};
