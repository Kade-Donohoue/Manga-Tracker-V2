import { createDb } from '@/db';
import { user } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';

const router = createRouter();

router.use('*', requireAuth);

router.get('/', async (c) => {
  const db = createDb(c.env);

  const user = c.get('user');
  const rows = await db.select().from(user).execute();
  return c.json({ message: 'App API', rows, user }, 200);
});

export default router;
