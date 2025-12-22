import { createDb } from '@/db';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import { User } from 'better-auth';
import { zValidator } from '@hono/zod-validator';
import { addMangaSchema, addRecomendedSchema, addStatusSchema } from '@/schemas/zodSchemas';
import { recommendations, userData } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const addRouter = createRouter();

addRouter.post('/addManga', zValidator('json', addMangaSchema), async (c) => {
  const currentUser: User = c.get('user');
  const { urls, userCat } = c.req.valid('json');

  if (urls && urls.length <= 0) return c.json({ Message: 'No Urls Provided!' }, 500);

  const mangaReq: any = await fetch(
    `${c.env.PUPPETEER_SERVER}/getManga?urls=${urls.join('&urls=')}&pass=${c.env.SERVER_PASSWORD}`,
    {
      method: 'GET',
    }
  );

  if (!mangaReq.ok) {
    const errorResp = await mangaReq.json();
    c.json(
      {
        message: errorResp.message,
      },
      mangaReq.status
    );
  }

  const ids: { addedManga: { fetchId: string; url: string }[] } = await mangaReq.json();

  console.log(ids.addedManga);

  await Promise.all(
    ids.addedManga.map((m) =>
      c.env.KV.put(
        `fetchStatus:${m.fetchId}`,
        JSON.stringify({
          status: 'processing',
          url: m.url,
          timestamp: Date.now(),
          userCat: userCat,
          userId: currentUser.id,
        }),
        { expirationTtl: 3600 }
      )
    )
  );

  return c.json(ids.addedManga, 200);
});

addRouter.post('/checkStatus', zValidator('json', addStatusSchema), async (c) => {
  const currentUser: User = c.get('user');
  const { fetchIds } = c.req.valid('json');

  if (!fetchIds || fetchIds.length <= 0) return c.json({ message: 'No IDs provided!' }, 400);

  const rawStatus = await Promise.all(fetchIds.map((id) => c.env.KV.get(`fetchStatus:${id}`)));

  const status = [];

  for (let i = 0; i < fetchIds.length; i++) {
    const statusRaw = rawStatus[i];
    const fetchId = fetchIds[i];

    if (!statusRaw) {
      status.push({
        fetchId,
        status: 'unknown',
      });
      continue;
    }

    const curStat = JSON.parse(statusRaw);

    if (curStat.userId !== currentUser.id) {
      return c.json({ message: `Unauthorized for fetchId ${fetchId}` }, 401);
    }

    status.push({
      fetchId,
      status: curStat.status,
      url: curStat.url,
    });
  }

  return c.json({ status }, 200);
});

addRouter.post('/recomended', zValidator('json', addRecomendedSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { mangaId, index, currentChap, userCat } = c.req.valid('json');

  const upsertResult = await db
    .insert(userData)
    .values({
      userID: currentUser.id,
      mangaId: mangaId,
      currentIndex: index,
      currentChap: String(currentChap),
      userCat: userCat,
      interactTime: Date.now(),
    })
    .onConflictDoUpdate({
      target: [userData.userID, userData.mangaId],
      set: {
        currentIndex: index,
        currentChap: String(currentChap),
        userCat,
        interactTime: Date.now(),
      },
    })
    .run();

  if (!upsertResult.success) {
    return new Response(
      JSON.stringify({ message: 'Unable to save to Database contact support!' }),
      { status: 500 }
    );
  }

  await db
    .update(recommendations)
    .set({ status: 'accepted' })
    .where(
      and(eq(recommendations.receiverId, currentUser.id), eq(recommendations.mangaId, mangaId))
    );

  if (upsertResult.meta.rows_written <= 0 || !upsertResult.meta.changed_db) {
    return new Response(JSON.stringify({ message: 'Already Tracked, Updated chapter!' }), {
      status: 200,
    });
  }

  return new Response(JSON.stringify({ message: 'Success!' }), { status: 200 });
});

export default addRouter;
