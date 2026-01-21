import { createDb } from '@/db';
import { eq, and, or, inArray, max } from 'drizzle-orm';
import {
  coverImages,
  friends,
  mangaData,
  user,
  userCategories,
  userData,
  userStats,
} from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import { User } from 'better-auth';
import { zValidator } from '@hono/zod-validator';
import {
  updateMangaTimeSchema,
  updateMangaIndexSchema,
  updateMangaTitleSchema,
  updateUserCategoriesSchema,
  updateMangaCategorySchema,
} from '@/schemas/zodSchemas';

const updateRouter = createRouter();

updateRouter.post(
  '/updateUserCategories',
  zValidator('json', updateUserCategoriesSchema),
  async (c) => {
    const db = createDb(c.env);
    const currentUser: User = c.get('user');
    const { newCatList } = c.req.valid('json');

    try {
      await db.delete(userCategories).where(eq(userCategories.userID, currentUser.id));

      if (newCatList.length > 0) {
        await db.insert(userCategories).values(
          newCatList.map((cat) => ({
            userID: currentUser.id,
            label: cat.label,
            value: cat.value,
            color: cat.color ?? '#fff',
            stats: cat.stats ?? true,
            public: cat.public ?? false,
            position: cat.position,
          }))
        );
      }

      return c.json({ message: 'Success' });
    } catch (err) {
      console.warn('Error updating user categories:', err);
      return c.json({ message: 'Failed to update categories', error: String(err) }, 500);
    }
  }
);

updateRouter.post('updateCurrentIndex', zValidator('json', updateMangaIndexSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { mangaId, newIndex } = c.req.valid('json');

  const [row] = await db
    .select({
      oldIndex: userData.currentIndex,
      chapterTextList: mangaData.chapterTextList,
    })
    .from(userData)
    .innerJoin(mangaData, eq(userData.mangaId, mangaData.mangaId))
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)))
    .limit(1);

  if (!row) {
    return c.json({ error: 'User manga entry not found' }, 404);
  }

  const chapterTextList = row.chapterTextList.split(',') as string[];

  const chaptersRead = Math.max(
    0,
    parseFloat(chapterTextList[newIndex]) - parseFloat(chapterTextList[row.oldIndex])
  );

  const newCurrentChap = chapterTextList[newIndex] ?? 'chapter unknown';

  await db
    .update(userData)
    .set({
      currentIndex: newIndex,
      currentChap: newCurrentChap,
      interactTime: Date.now(),
    })
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  await db
    .insert(userStats)
    .values({ userID: currentUser.id, type: 'chapsRead', mangaId: mangaId, value: chaptersRead });

  return c.json({ message: 'Success' });
});

updateRouter.post('userCover', zValidator('json', updateMangaIndexSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { mangaId, newIndex } = c.req.valid('json');

  await db
    .update(userData)
    .set({ userCoverIndex: newIndex })
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  return c.json({ message: 'Success' });
});

updateRouter.post('userTitle', zValidator('json', updateMangaTitleSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { mangaId, newTitle } = c.req.valid('json');

  await db
    .update(userData)
    .set({ userTitle: newTitle })
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  return c.json({ message: 'Success' });
});

updateRouter.post('changeMangaCat', zValidator('json', updateMangaCategorySchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  let { mangaId, newCat } = c.req.valid('json');

  if (newCat == '%') newCat = 'unsorted';

  await db
    .update(userData)
    .set({ userCat: newCat })
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  return c.json({ message: 'Success' });
});

updateRouter.post('updateInteractTime', zValidator('json', updateMangaTimeSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { mangaId, newTime } = c.req.valid('json');

  await db
    .update(userData)
    .set({ interactTime: newTime })
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)));

  return c.json({ message: 'Success' });
});

export default updateRouter;
