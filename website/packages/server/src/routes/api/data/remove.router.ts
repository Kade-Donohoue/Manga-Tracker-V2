import { createDb } from '@/db';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import { User } from 'better-auth';
import { zValidator } from '@hono/zod-validator';
import { addMangaSchema, addRecomendedSchema, addStatusSchema } from '@/schemas/zodSchemas';
import { recommendations, userData } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const removeRouter = createRouter();

removeRouter.delete('/userManga/:mangaId', async (c) => {
  const currentUser: User = c.get('user');
  const mangaId = c.req.param('mangaId');
  const db = createDb(c.env);

  await db
    .delete(userData)
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  return c.json({ message: 'Success' }, 200);
});

export default removeRouter;
