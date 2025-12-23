import { createDb } from '@/db';
import { eq, and, or, inArray, max, sql } from 'drizzle-orm';
import { coverImages, friends, mangaData, user, userCategories, userData } from '@/db/schema';
import { createRouter } from '@/lib/create-app';
import { User } from 'better-auth';
import { zValidator } from '@hono/zod-validator';
import { updateUserCategoriesSchema } from '@/schemas/zodSchemas';
import { getLiveUserStats } from '@/utils';

const pullRouter = createRouter();

pullRouter.post('/getUserManga', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const acceptedFriends = await db
    .select({
      senderId: friends.senderId,
      receiverId: friends.receiverId,
    })
    .from(friends)
    .where(
      and(
        eq(friends.status, 'accepted'),
        or(eq(friends.senderId, currentUser.id), eq(friends.receiverId, currentUser.id))
      )
    );

  let friendsIds: string[] = acceptedFriends.map(({ senderId, receiverId }) =>
    senderId === currentUser.id ? receiverId : senderId
  );

  const manga = await db
    .select({
      mangaId: userData.mangaId,
      userTitle: userData.userTitle,
      mangaName: mangaData.mangaName,
      currentChap: userData.currentChap,
      currentIndex: userData.currentIndex,
      slugList: mangaData.slugList,
      chapterTextList: mangaData.chapterTextList,
      interactTime: userData.interactTime,
      addedAt: userData.addedAt,
      userCat: userData.userCat,
      userCoverIndex: userData.userCoverIndex,
      updateTime: mangaData.updateTime,
      urlBase: mangaData.urlBase,
      imageIndexes: max(coverImages.coverIndex),
    })
    .from(userData)
    .innerJoin(mangaData, eq(userData.mangaId, mangaData.mangaId))
    .innerJoin(coverImages, eq(userData.mangaId, coverImages.mangaId))
    .where(eq(userData.userID, currentUser.id))
    .groupBy(userData.mangaId);

  if (!manga || manga.length <= 0) return c.json({ message: 'No Manga!', mangaDetails: [] }, 200);

  const myMangaIds = manga.map((m) => m.mangaId);

  const allFriendsReading = await db
    .select({
      mangaId: userData.mangaId,
      userID: userData.userID,
      userName: user.name,
      avatarUrl: user.image,
      userCat: userData.userCat,
      public: userCategories.public,
    })
    .from(userData)
    .innerJoin(
      userCategories,
      and(eq(userData.userID, userCategories.userID), eq(userData.userCat, userCategories.value))
    )
    .innerJoin(user, eq(user.id, userData.userID))
    .where(inArray(userData.userID, friendsIds));

  const friendsReading = allFriendsReading.filter(
    (row) => myMangaIds.includes(row.mangaId) && row.public
  );

  const mangaIdFriendList: Record<
    string,
    { userID: string; avatarUrl: string | null; userName: string }[]
  > = {};

  friendsReading.forEach(({ mangaId, userID, userName, avatarUrl }) => {
    if (!mangaIdFriendList[mangaId]) mangaIdFriendList[mangaId] = [];
    mangaIdFriendList[mangaId].push({ userID, avatarUrl: avatarUrl, userName });
  });

  const compiledMangaList = manga.map((manga) => ({
    ...manga,
    slugList: manga.slugList.split(','),
    chapterTextList: manga.chapterTextList.split(','),
    friends: mangaIdFriendList[manga.mangaId] || [],
  }));

  return c.json({ mangaDetails: compiledMangaList });
});

pullRouter.post('/getManga/:mangaId', async (c) => {
  const mangaId = c.req.param('mangaId');
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const manga = await db
    .select({
      mangaId: userData.mangaId,
      userTitle: userData.userTitle,
      mangaName: mangaData.mangaName,
      currentChap: userData.currentChap,
      currentIndex: userData.currentIndex,
      slugList: mangaData.slugList,
      chapterTextList: mangaData.chapterTextList,
      interactTime: userData.interactTime,
      addedAt: userData.addedAt,
      userCat: userData.userCat,
      coverIndex: userData.userCoverIndex,
      updateTime: mangaData.updateTime,
      urlBase: mangaData.urlBase,
      imageIndexes: max(coverImages.coverIndex),
    })
    .from(userData)
    .innerJoin(mangaData, eq(userData.mangaId, mangaData.mangaId))
    .innerJoin(coverImages, eq(userData.mangaId, coverImages.mangaId))
    .where(and(eq(userData.userID, currentUser.id), eq(userData.mangaId, mangaId)))
    .get();

  return c.json({ mangaDetails: manga });
});

pullRouter.post('/pullUserCategories', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  const categories = await db
    .select()
    .from(userCategories)
    .where(eq(userCategories.userID, currentUser.id));

  return c.json({ cats: categories });
});

pullRouter.post('userStats', async (c) => {
  const db = createDb(c.env);
  const currentUser: User = c.get('user');
  const date = new Date().toISOString();

  const stats = await getLiveUserStats(db, currentUser.id, date);

  console.log(stats);

  return c.json(stats, 200);
});

pullRouter.post('/sharedFriends/:mangaId', async (c) => {
  const mangaId = c.req.param('mangaId');
  const db = createDb(c.env);
  const currentUser: User = c.get('user');

  try {
    // Fetch public friend manga data
    const friendData = await db
      .select({
        userID: userData.userID,
        currentIndex: userData.currentIndex,
        userName: user.name,
        avatarUrl: user.image,
      })
      .from(userData)
      .innerJoin(
        userCategories,
        and(
          eq(userData.userID, userCategories.userID),
          eq(userData.userCat, userCategories.value),
          eq(userCategories.public, true)
        )
      )
      .innerJoin(user, eq(userData.userID, user.id))
      .where(
        and(
          eq(userData.mangaId, mangaId),
          inArray(
            userData.userID,
            db
              .select({
                friendId: sql<string>`
                  CASE 
                    WHEN ${friends.senderId} = ${currentUser.id} THEN ${friends.receiverId}
                    ELSE ${friends.senderId}
                  END
                `,
              })
              .from(friends)
          )
        )
      )
      .all();

    if (!friendData || friendData.length === 0) {
      return c.json({ message: `No friends appear to be sharing ${mangaId}` }, 404);
    }

    return c.json({ friendData });
  } catch (err) {
    console.error('Error:', err);
    return c.json({ message: 'An unknown error occurred' }, 500);
  }
});

export default pullRouter;
