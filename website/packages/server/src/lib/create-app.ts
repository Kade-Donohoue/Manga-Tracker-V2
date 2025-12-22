import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import withSession from '@/middlewares/with-session';
import notFound from '@/middlewares/not-found';
import onError from '@/middlewares/on-error';
import authCors from '@/middlewares/auth-cors';
import { createEnv } from '@/env';
import { AppBindings } from '@/lib/types';

export function createRouter() {
  return new Hono<AppBindings>({
    strict: false,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use((c, next) => {
    c.env = createEnv(Object.assign(c.env));
    return next();
  });

  app.use('/api/auth/*', authCors);
  app.use('*', withSession);

  app.use(requestId());
  app.onError(onError);
  app.notFound(notFound);
  return app;
}
