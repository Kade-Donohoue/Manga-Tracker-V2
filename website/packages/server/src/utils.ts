import { eq, and, or, SQL, sql, desc, gte, inArray, ne } from 'drizzle-orm';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import {
  dailyUserStats,
  globalDailyStats,
  mangaData,
  mangaStats,
  userData,
  userStats,
} from '@/db/schema';

export function friendPairCondition(
  a: string,
  b: string,
  table: {
    senderId: any;
    receiverId: any;
  }
) {
  return or(
    and(eq(table.senderId, a), eq(table.receiverId, b)),
    and(eq(table.senderId, b), eq(table.receiverId, a))
  );
}

export const cond = (condition: SQL | undefined) =>
  sql`CASE WHEN ${condition ?? sql`0`} THEN 1 ELSE 0 END`;

export const condValue = (condition: SQL | undefined, value: SQL) =>
  sql`CASE WHEN ${condition ?? sql`0`} THEN ${value} ELSE 0 END`;

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be > 0');
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

//STATS
interface LiveUserStats {
  readChapters: number;
  trackedChapters: number;
  chaptersUnread: number;
  readThisMonth: number;
  unreadManga: number;
  readManga: number;
  averagePerDay: number;
  priorAveragePerDay: number;
}
interface GlobalStats {
  mangaCount: number;
  newManga: number;
  trackedChapters: number;
  readChapters: number;
  newChapters: number;
  readThisMonth: number;
}

export async function getLiveUserStats(
  db: DrizzleD1Database<typeof schema>,
  userID: string,
  date: string // YYYY-MM-DD of last snapshot
): Promise<{ userStats: LiveUserStats; globalStats: GlobalStats }> {
  const snapshot = await db
    .select()
    .from(dailyUserStats)
    .where(eq(dailyUserStats.userID, userID))
    .orderBy(desc(dailyUserStats.date))
    .limit(2);

  const baseStats = snapshot[0] ?? {
    totalCurrentChapters: 0,
    totalLatestChapters: 0,
    backlog: 0,
    pastMonthReads: 0,
    updatedAt: date,
  };

  const trackedManga = await db
    .select({ mangaId: userData.mangaId })
    .from(userData)
    .where(eq(userData.userID, userID))
    .all();

  const unreadCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userData)
    .leftJoin(mangaData, eq(userData.mangaId, mangaData.mangaId))
    .where(and(eq(userData.userID, userID), ne(userData.currentChap, mangaData.latestChapterText)))
    .get();

  const newUserStats = await db
    .select({
      chapsRead: sql<number>`SUM(CASE WHEN ${userStats.type} = 'chapsRead' THEN ${userStats.value} ELSE 0 END)`,
      newManga: sql<number>`SUM(CASE WHEN ${userStats.type} = 'newManga' THEN ${userStats.value} ELSE 0 END)`,
    })
    .from(userStats)
    .where(and(eq(userStats.userID, userID), gte(userStats.timestamp, baseStats.updatedAt)))
    .get();

  const newMangaStats = await db
    .select({
      chapCount: sql<number>`SUM(CASE WHEN ${mangaStats.type} = 'chapCount' THEN ${mangaStats.value} ELSE 0 END)`,
      mangaCount: sql<number>`SUM(CASE WHEN ${mangaStats.type} = 'mangaCount' THEN ${mangaStats.value} ELSE 0 END)`,
    })
    .from(mangaStats)
    .innerJoin(userData, eq(mangaStats.mangaId, userData.mangaId))
    .where(and(gte(mangaStats.timestamp, baseStats.updatedAt), eq(userData.userID, userID)))
    .get();

  const globalStatsRow = await db
    .select({
      mangaCount: globalDailyStats.mangaTracked,
      newManga: globalDailyStats.newManga30,
      trackedChapters: globalDailyStats.totalChaptersTracked,
      readChapters: globalDailyStats.totalChaptersRead,
      newChapters: globalDailyStats.newChapters30,
      readThisMonth: globalDailyStats.chaptersRead30,
    })
    .from(globalDailyStats)
    .orderBy(desc(globalDailyStats.updatedAt))
    .get();

  const globalStats: GlobalStats = {
    mangaCount: globalStatsRow?.mangaCount ?? 0,
    newManga: globalStatsRow?.newManga ?? 0,
    trackedChapters: globalStatsRow?.trackedChapters ?? 0,
    readChapters: globalStatsRow?.readChapters ?? 0,
    newChapters: globalStatsRow?.newChapters ?? 0,
    readThisMonth: 0,
  };

  const userReadMonth = baseStats.pastMonthReads + (newUserStats?.chapsRead ?? 0);

  const liveStats: LiveUserStats = {
    readChapters: baseStats.totalCurrentChapters + (newUserStats?.chapsRead ?? 0),
    trackedChapters: baseStats.totalLatestChapters + (newMangaStats?.chapCount ?? 0),
    chaptersUnread:
      baseStats.backlog + (newMangaStats?.chapCount ?? 0) - (newUserStats?.chapsRead ?? 0),
    readThisMonth: userReadMonth,
    unreadManga: unreadCount?.count ?? 0,
    readManga: trackedManga.length,
    averagePerDay: userReadMonth / 30,
    priorAveragePerDay: (snapshot[2]?.pastMonthReads ?? 0) / 30,
  };

  return { userStats: liveStats, globalStats: globalStats };
}
