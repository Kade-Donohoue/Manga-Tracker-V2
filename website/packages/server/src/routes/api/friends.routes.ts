import { createDb } from '@/db';
import { friends, mangaData, recommendations, user, userCategories, userData } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { requireAuth } from '@/middlewares/require-auth';
import {
  friendBasicSchema,
  getFriendDetailsSchema,
  recomendMangaSchema,
  sendFriendRequestSchema,
  updateRecomendedStatusSchema,
} from '@/schemas/zodSchemas';
import { cond, friendPairCondition, getLiveUserStats } from '@/utils';
import { zValidator } from '@hono/zod-validator';
import { User } from 'better-auth';
import { and, eq, inArray, ne, or, sql, sum } from 'drizzle-orm';

const friendsRouter = createRouter();

friendsRouter.use('*', requireAuth);

friendsRouter.post('/sendRequest', zValidator('json', sendFriendRequestSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { userName } = c.req.valid('json');

  const foundUser = await db
    .select({ userId: user.id })
    .from(user)
    .where(eq(user.name, userName))
    .get();

  if (!foundUser) return c.json({ Message: `Unable to find User ${userName}` }, 404);

  const existingFriend = await db
    .select()
    .from(friends)
    .where(friendPairCondition(currentUser.id, foundUser.userId, friends))
    .get();

  if (existingFriend)
    return c.json({ message: `Friend request Pending or friendship already exists.` }, 409);

  await db
    .insert(friends)
    .values({ senderId: currentUser.id, receiverId: foundUser.userId, status: 'pending' });

  return c.json({ Message: `Request Sent to ${userName}` });
});

friendsRouter.post('/getFriends', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const friendRows = await db
    .select({
      senderId: friends.senderId,
      receiverId: friends.receiverId,
      id: friends.id,
      sentAt: friends.sentAt,
      respondedAt: friends.respondedAt,
    })
    .from(friends)
    .where(
      and(
        eq(friends.status, 'accepted'),
        or(eq(friends.senderId, currentUser.id), eq(friends.receiverId, currentUser.id))
      )
    );

  const friendIds = friendRows.map((row) =>
    row.senderId === currentUser.id ? row.receiverId : row.senderId
  );

  const usersWithStats = await db
    .select({
      userID: user.id,
      userName: user.name,
      imageURL: user.image,
      createdAt: user.createdAt,

      mangaCount: sql<number>`COALESCE(COUNT(${userData.userID}), 0)`,
      chaptersRead: sql<number>`COALESCE(SUM(CAST(FLOOR(${userData.currentChap}) AS INTEGER)), 0)`,
    })
    .from(user)
    .leftJoin(userData, eq(user.id, userData.userID))
    .leftJoin(
      userCategories,
      and(
        eq(userData.userCat, userCategories.value),
        eq(userData.userID, userCategories.userID),
        eq(userCategories.public, true),
        eq(userCategories.stats, true)
      )
    )
    .where(inArray(user.id, friendIds))
    .groupBy(user.id);

  const userMap = new Map(usersWithStats.map((u) => [u.userID, u]));

  const mergedResults = friendRows.map((row) => {
    const otherId = row.senderId === currentUser.id ? row.receiverId : row.senderId;
    const u = userMap.get(otherId);

    return {
      friendId: row.id,
      sentAt: row.sentAt,
      respondedAt: row.respondedAt,
      userID: u?.userID,
      userName: u?.userName,
      imageURL: u?.imageURL,
      createdAt: u?.createdAt,
      mangaCount: u?.mangaCount ?? 0,
      chaptersRead: u?.chaptersRead ?? 0,
    };
  });

  return c.json({ message: 'Success', data: mergedResults });
});

friendsRouter.post('/getRecieved', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const incommingFriendRequests = await db
    .select({
      senderId: friends.senderId,
      receiverId: friends.receiverId,
      friendId: friends.id,
      respondedAt: friends.respondedAt,
      sentAt: friends.sentAt,
    })
    .from(friends)
    .where(and(eq(friends.status, 'pending'), eq(friends.receiverId, currentUser.id)));

  const friendIds = incommingFriendRequests.map((row) => row.senderId);

  const friendData = await db
    .select({
      userID: user.id,
      userName: user.name,
      imageUrl: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(inArray(user.id, friendIds));

  const userMap = new Map(friendData.map((u) => [u.userID, u]));

  const mergedData = incommingFriendRequests.map((row) => {
    const otherId = row.senderId === currentUser.id ? row.receiverId : row.senderId;
    const u = userMap.get(otherId);

    return {
      friendId: row.friendId,
      sentAt: row.sentAt,
      respondedAt: row.respondedAt,
      userID: u?.userID,
      userName: u?.userName,
      imageURL: u?.imageUrl,
      createdAt: u?.createdAt,
    };
  });

  return c.json({ message: 'Success', data: mergedData });
});

friendsRouter.post('/getCount', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const counts = await db
    .select({
      friendCount: sum(cond(eq(friends.status, 'accepted'))),
      incomingCount: sum(
        cond(and(eq(friends.status, 'pending'), eq(friends.receiverId, currentUser.id)))
      ),
      outgoingCount: sum(
        cond(and(eq(friends.status, 'pending'), eq(friends.senderId, currentUser.id)))
      ),
    })
    .from(friends)
    .where(or(eq(friends.senderId, currentUser.id), eq(friends.receiverId, currentUser.id)));

  return c.json({ message: 'Success', data: counts[0] });
});

friendsRouter.post('/getSent', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const incommingFriendRequests = await db
    .select({
      senderId: friends.senderId,
      receiverId: friends.receiverId,
      requestId: friends.id,
      respondedAt: friends.respondedAt,
      sentAt: friends.sentAt,
    })
    .from(friends)
    .where(and(eq(friends.status, 'pending'), eq(friends.senderId, currentUser.id)));

  const friendIds = incommingFriendRequests.map((row) => row.receiverId);

  const friendData = await db
    .select({
      userID: user.id,
      userName: user.name,
      imageUrl: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(inArray(user.id, friendIds));

  const userMap = new Map(friendData.map((u) => [u.userID, u]));

  const mergedData = incommingFriendRequests.map((row) => {
    const otherId = row.senderId === currentUser.id ? row.receiverId : row.senderId;
    const u = userMap.get(otherId);

    return {
      requestId: row.requestId,
      sentAt: row.sentAt,
      respondedAt: row.respondedAt,
      userID: u?.userID,
      userName: u?.userName,
      imageURL: u?.imageUrl,
      createdAt: u?.createdAt,
    };
  });

  return c.json({ message: 'Success', data: mergedData });
});

friendsRouter.post('/cancel', zValidator('json', friendBasicSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { requestId } = c.req.valid('json');

  await db
    .delete(friends)
    .where(and(eq(friends.senderId, currentUser.id), eq(friends.id, requestId)));

  return c.json({ Message: 'Success' });
});

friendsRouter.post('/remove', zValidator('json', friendBasicSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { requestId } = c.req.valid('json');

  await db
    .delete(friends)
    .where(
      and(
        or(eq(friends.senderId, currentUser.id), eq(friends.receiverId, currentUser.id)),
        eq(friends.id, requestId)
      )
    );

  return c.json({ Message: 'Success' });
});

friendsRouter.post('/updateStatus', zValidator('json', updateRecomendedStatusSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { requestId, newStatus } = c.req.valid('json');

  await db
    .update(friends)
    .set({ status: newStatus, respondedAt: sql`CURRENT_TIMESTAMP` })
    .where(
      and(
        or(eq(friends.senderId, currentUser.id), eq(friends.receiverId, currentUser.id)),
        eq(friends.id, requestId)
      )
    );

  return c.json({ Message: 'Success' });
});

friendsRouter.post('/recomendManga', zValidator('json', recomendMangaSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { friendId, mangaId } = c.req.valid('json');

  await db
    .insert(recommendations)
    .values({ receiverId: friendId, recommenderId: currentUser.id, mangaId: mangaId });

  return c.json({ Message: 'Success' });
});

friendsRouter.post(
  '/updateRecomendedStatus',
  zValidator('json', updateRecomendedStatusSchema),
  async (c) => {
    const db = createDb(c.env);
    const currentUser: User = c.get('user');
    const { requestId, newStatus } = c.req.valid('json');

    await db
      .update(recommendations)
      .set({ status: newStatus })
      .where(
        and(
          or(
            eq(recommendations.receiverId, currentUser.id),
            eq(recommendations.recommenderId, currentUser.id)
          ),
          eq(friends.id, requestId)
        )
      );

    return c.json({ Message: 'Success' });
  }
);

friendsRouter.post('getFriendDetails', zValidator('json', getFriendDetailsSchema), async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const { friendId } = c.req.valid('json');

  const received = await db
    .select({
      id: recommendations.id,
      mangaId: recommendations.mangaId,
      status: recommendations.status,
      mangaName: mangaData.mangaName,
      urlBase: mangaData.urlBase,
      slugList: mangaData.slugList,
      chapterTextList: mangaData.chapterTextList,
    })
    .from(recommendations)
    .innerJoin(mangaData, eq(mangaData.mangaId, recommendations.mangaId))
    .where(
      and(
        eq(recommendations.receiverId, currentUser.id),
        eq(recommendations.recommenderId, friendId),
        eq(recommendations.status, 'pending')
      )
    );

  //
  // 2. Fetch recommendations SENT to the friend by the user
  //
  const sent = await db
    .select({
      id: recommendations.id,
      mangaId: recommendations.mangaId,
      status: recommendations.status,
      mangaName: mangaData.mangaName,
      urlBase: mangaData.urlBase,
      slugList: mangaData.slugList,
      chapterTextList: mangaData.chapterTextList,
    })
    .from(recommendations)
    .innerJoin(mangaData, eq(mangaData.mangaId, recommendations.mangaId))
    .where(
      and(
        eq(recommendations.receiverId, friendId),
        eq(recommendations.recommenderId, currentUser.id),
        ne(recommendations.status, 'canceled')
      )
    );

  //
  // 3. Fetch friend's live stats (replacement for huge SQL block)
  //
  const date = new Date().toISOString();
  const stats = await getLiveUserStats(db, friendId, date);

  return c.json(
    {
      message: 'Success!',
      data: {
        recomendations: { received, sent },
        stats: stats.userStats,
      },
    },
    200
  );
});

export default friendsRouter;
