import { createRouter } from '@/lib/create-app';
import { createAuth } from '@/lib/auth';
import { requireAdmin } from '@/middlewares/require-admin';
import { requireAuth } from '@/middlewares/require-auth';

const router = createRouter();

const apiRouter = createRouter();

apiRouter.use('*', requireAuth, requireAdmin);
apiRouter.post('/create', async (c) => {
  const auth = createAuth(c.env);
  const body = await c.req.json();

  // return auth.handler(c.req.raw);
  const apiKey = await auth.api.createApiKey({
    body,
  });

  return c.json(apiKey);
});
apiRouter.post('*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);

  // const session = await auth.api.getSession(c.req.raw);

  // if (!session?.user) return c.json({ error: 'Unauthorized' }, 401);
  // if (session.user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  // const apiKey = await auth.api.createApiKey({
  // body: { userId: session.user.id, name: 'My Key', prefix: 'Util' },
  // });

  // return c.json(apiKey);

  // return auth.handler(c.req.raw);
});

router.route('/api-key', apiRouter);

router.all('*', (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

export default router;
