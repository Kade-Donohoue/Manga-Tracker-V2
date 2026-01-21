import { createDb } from '@/db';
import { coverImages, mangaData, mangaStats, user, userData, userStats } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import { requireAdmin } from '@/middlewares/require-admin';
import { eq, max, sql } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { newMangaSchama, saveImageSchema, updateDataSchema } from '@/schemas/zodSchemas';
import { chunkArray } from '@/utils';

const adminRouter = createRouter();

adminRouter.use('*', requireAuth);
adminRouter.use('*', requireAdmin);

adminRouter.get('/getAllManga', async (c) => {
  const db = createDb(c.env);

  const rows = await db
    .select({
      urlBase: mangaData.urlBase,
      slugList: mangaData.slugList,
      mangaId: mangaData.mangaId,
      mangaName: mangaData.mangaName,
      maxSavedAt: max(coverImages.savedAt),
      maxCoverIndex: max(coverImages.coverIndex),
      specialFetchData: mangaData.specialFetchData,
    })
    .from(mangaData)
    .leftJoin(coverImages, eq(coverImages.mangaId, mangaData.mangaId))
    .groupBy(mangaData.mangaId)
    .all();

  return c.json({ data: rows });
});

adminRouter.post('/saveManga', zValidator('json', newMangaSchama), async (c) => {
  const db = createDb(c.env);
  const { fetchId, newMangaData } = c.req.valid('json');

  console.log(fetchId, newMangaData);

  const userDataKV = await c.env.KV.get(`fetchStatus:${fetchId}`);
  if (!userDataKV) {
    console.error(`Missing fetchStatus for ${fetchId}`);
    return c.json({ error: 'Missing fetch status' }, 400);
  }

  const fetchData: {
    status: string;
    url: string;
    timestamp: number;
    userCat: string;
    userId: string;
  } = JSON.parse(userDataKV);

  console.log(fetchData);
  console.log(newMangaData);

  let newMangaId = crypto.randomUUID();
  const mangaId = await db
    .insert(mangaData)
    .values({
      mangaId: newMangaId,
      mangaName: newMangaData.mangaName,
      urlBase: newMangaData.urlBase,
      slugList: newMangaData.slugList,
      chapterTextList: newMangaData.chapterTextList,
      latestChapterText: Number(newMangaData.chapterTextList.split(',').at(-1) || '0'),
      // useAltStatCalc: false,
      specialFetchData: newMangaData.specialFetchData,
      updateTime: sql`CURRENT_TIMESTAMP`,
      sourceId: newMangaData.sourceId,
    })
    .onConflictDoUpdate({
      target: [mangaData.sourceId],
      set: {
        mangaName: newMangaData.mangaName,
        slugList: newMangaData.slugList,
        chapterTextList: newMangaData.chapterTextList,
        latestChapterText: parseInt(newMangaData.chapterTextList.split(',').at(-1) || '0'),
        specialFetchData: newMangaData.specialFetchData,
        updateTime: sql`CURRENT_TIMESTAMP`,
        // useAltStatCalc: false,
      },
    })
    .returning({ mangaId: mangaData.mangaId });

  await db
    .insert(userData)
    .values({
      userID: fetchData.userId,
      mangaId: mangaId[0].mangaId,
      currentIndex: newMangaData.currentIndex,
      currentChap: newMangaData.chapterTextList.split(',')[newMangaData.currentIndex],
      userCat: fetchData.userCat,
      interactTime: sql`CURRENT_TIMESTAMP`,
      addedAt: sql`CURRENT_TIMESTAMP`,
      userCoverIndex: -1,
    })
    .onConflictDoUpdate({
      target: [userData.userID, userData.mangaId],
      set: {
        currentIndex: newMangaData.currentIndex,
        currentChap: newMangaData.chapterTextList.split(',')[newMangaData.currentIndex],
        userCat: fetchData.userCat,
        interactTime: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning({ addedAt: userData.addedAt });

  await db.insert(mangaStats).values({
    type: 'chapCount',
    value: Number(newMangaData.chapterTextList.split(',').at(-1) || '0'),
    mangaId: mangaId[0].mangaId,
  });
  await db
    .insert(userStats)
    .values({ userID: fetchData.userId, type: 'newManga', value: 1, mangaId: mangaId[0].mangaId });
  await db.insert(userStats).values({
    userID: fetchData.userId,
    type: 'chapsRead',
    value: Number(newMangaData.chapterTextList.split(',')[newMangaData.currentIndex]),
    mangaId: mangaId[0].mangaId,
  });

  await c.env.KV.put(
    `fetchStatus:${fetchId}`,
    JSON.stringify({ ...fetchData, mangaId: mangaId[0].mangaId, status: 'Success' })
  );

  return c.json({ message: 'Success', mangaId: mangaId[0].mangaId }, 200);
});

adminRouter.post('/saveCoverImage', zValidator('json', saveImageSchema), async (c) => {
  const db = createDb(c.env);
  const { img, mangaId, index } = c.req.valid('json');

  console.log(`Saving New Cover Image for mangaId: ${mangaId} at index ${index}`);
  await c.env.IMG.put(`${mangaId}/${index}`, new Uint8Array(img.data).buffer);

  await db
    .insert(coverImages)
    .values({
      mangaId: mangaId,
      coverIndex: index,
    })
    .onConflictDoUpdate({
      target: [coverImages.mangaId, coverImages.coverIndex],
      set: {
        savedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  return c.json('Success', 200);
});

adminRouter.post('/userMangaFailed/:fetchId', async (c) => {
  const fetchId = c.req.param('fetchId');

  const userDataKV = await c.env.KV.get(`fetchStatus:${fetchId}`);
  if (!userDataKV) {
    console.error(`Missing fetchStatus for ${fetchId}`);
    return c.json({ error: 'Missing fetch status' }, 400);
  }

  const fetchData: {
    status: string;
    url: string;
    timestamp: number;
    userCat: string;
    userId: string;
  } = JSON.parse(userDataKV);

  await c.env.KV.put(`fetchStatus:${fetchId}`, JSON.stringify({ ...fetchData, status: 'failed' }));
});

adminRouter.post('/updateManga', zValidator('json', updateDataSchema), async (c) => {
  const db = createDb(c.env);
  const { newData } = c.req.valid('json');

  // Safe batch size based on your table size
  const BATCH_SIZE = 10;
  const batches = chunkArray(newData, BATCH_SIZE);

  for (const batch of batches) {
    await db
      .insert(mangaData)
      .values(
        batch.map((m) => ({
          mangaId: m.mangaId,
          mangaName: m.mangaName,
          urlBase: m.urlBase,
          slugList: m.slugList,
          chapterTextList: m.chapterTextList,
          latestChapterText: parseFloat(m.chapterTextList?.split(',')?.at(-1) || '0'),
          specialFetchData: m.specialFetchData,
          updateTime: new Date().toISOString(),
          sourceId: m.sourceId,
        }))
      )
      .onConflictDoUpdate({
        target: mangaData.mangaId,
        set: {
          mangaName: sql`excluded.mangaName`,
          urlBase: sql`excluded.urlBase`,
          slugList: sql`excluded.slugList`,
          chapterTextList: sql`excluded.chapterTextList`,
          latestChapterText: sql`excluded.latestChapterText`,
          specialFetchData: sql`excluded.specialFetchData`,
          updateTime: sql`CURRENT_TIMESTAMP`,
        },
      });

    await db
      .insert(mangaStats)
      .values(
        batch.map((m) => ({
          type: 'chapCount' as const,
          value: m.newChapterCount,
          mangaId: m.mangaId,
        }))
      )
      .onConflictDoUpdate({
        target: [mangaStats.id], // requires unique index
        set: {
          value: sql`excluded.value`,
        },
      });
  }

  return c.json({ success: true, updated: newData.length });
});

export default adminRouter;
