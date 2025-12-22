import { createDb } from '@/db';
import {
  dailyUserStats,
  globalDailyStats,
  mangaData,
  mangaStats,
  userData,
  userStats,
} from '@/db/schema';
import { Environment } from '@/env';
import { and, count, eq, gte, inArray, or, sql, sum } from 'drizzle-orm';
import { chunkArray, condValue } from '@/utils';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@/db/schema';
import { number } from 'zod';

export async function scheduled(event: ScheduledEvent, env: Environment, ctx: ExecutionContext) {
  const db = createDb(env);
  const date = today();

  await Promise.all([generateUserStatsSnapshot(db, date), generateGlobalStatsSnapshot(db, date)]);
}

async function generateGlobalStatsSnapshot(db: DrizzleD1Database<typeof schema>, date: string) {
  const basicGlobalStats = (await db
    .select({
      mangaTracked: count(mangaData.mangaId),
      chaptersTracked: sum(mangaData.latestChapterText),
    })
    .from(mangaData)
    .where(eq(mangaData.useAltStatCalc, false))
    .get()) ?? { mangaTracked: 0, chaptersTracked: 0 };

  const totalsUser = (await db
    .select({
      totalChapsRead: sum(condValue(eq(userStats.type, 'chapsRead'), sql`${userStats.value}`)),
    })
    .from(userStats)
    .get()) ?? { totalChapsRead: 0 };

  const totalsManga = (await db
    .select({
      totalChapCount: sum(condValue(eq(mangaStats.type, 'chapCount'), sql`${mangaStats.value}`)),
      totalMangaCount: sum(condValue(eq(mangaStats.type, 'mangaCount'), sql`${mangaStats.value}`)),
    })
    .from(mangaStats)
    .where(gte(mangaStats.timestamp, thirtyDaysAgo()))
    .get()) ?? { totalChapCount: 0, totalMangaCount: 0 };

  const readChapters = await db
    .select({
      count: sum(condValue(eq(userStats.type, 'chapsRead'), sql`${userStats.value}`)),
    })
    .from(userStats)
    .where(gte(userStats.timestamp, thirtyDaysAgo()))
    .get();

  await db
    .insert(globalDailyStats)
    .values({
      date,
      mangaTracked: Number(basicGlobalStats.mangaTracked) ?? 0,
      totalChaptersTracked: Number(basicGlobalStats.chaptersTracked) ?? 0,
      totalChaptersRead: Number(totalsUser.totalChapsRead) ?? 0,
      newChapters30: Number(totalsManga.totalChapCount) ?? 0,
      newManga30: Number(totalsManga.totalMangaCount) ?? 0,
      chaptersRead30: Number(readChapters?.count) ?? 0,
    })
    .onConflictDoUpdate({
      target: [globalDailyStats.date],
      set: {
        mangaTracked: sql`excluded.mangaTracked`,
        totalChaptersTracked: sql`excluded.totalChaptersTracked`,
        totalChaptersRead: sql`excluded.totalChaptersRead`,
        newChapters30: sql`excluded.newChapters30`,
        newManga30: sql`excluded.newManga30`,
      },
    });
}

async function generateUserStatsSnapshot(db: DrizzleD1Database<typeof schema>, date: string) {
  const rows = await db
    .select({
      userID: userData.userID,
      currentIndex: userData.currentIndex,
      currentChap: userData.currentChap,
      chapterTextList: mangaData.chapterTextList,
      latest: mangaData.latestChapterText,
      useAlt: mangaData.useAltStatCalc,
    })
    .from(userData)
    .leftJoin(mangaData, eq(userData.mangaId, mangaData.mangaId));

  const statsByUser = new Map<
    string,
    {
      totalCurrent: number;
      totalLatest: number;
    }
  >();

  for (const row of rows) {
    console.log(row);
    const curr = calcCurrent(row);
    const last = calcLatest(row);

    if (!statsByUser.has(row.userID)) {
      statsByUser.set(row.userID, { totalCurrent: 0, totalLatest: 0 });
    }

    const data = statsByUser.get(row.userID)!;
    data.totalCurrent += parseChapterNumber(curr);
    data.totalLatest += safeNumber(last);
  }

  const monthlyReads = await db
    .select({
      userID: userStats.userID,
      total: sql<number>`SUM(${userStats.value})`.as('total'),
    })
    .from(userStats)
    .where(and(eq(userStats.type, 'chapsRead'), gte(userStats.timestamp, thirtyDaysAgo())))
    .groupBy(userStats.userID);

  const monthReadsMap = new Map();
  for (const row of monthlyReads) {
    monthReadsMap.set(row.userID, row.total);
  }

  const values = [];

  for (const [userID, data] of statsByUser.entries()) {
    const totalCurrent = safeNumber(data.totalCurrent);
    const totalLatest = safeNumber(data.totalLatest);
    const backlog = safeNumber(totalLatest - totalCurrent);
    const pastMonthReads = safeNumber(monthReadsMap.get(userID) ?? 0);

    values.push({
      userID,
      date,
      totalCurrentChapters: totalCurrent,
      totalLatestChapters: totalLatest,
      backlog,
      pastMonthReads,
    });
  }

  for (const chunk of chunkArray(values, 100)) {
    await db
      .insert(dailyUserStats)
      .values(chunk)
      .onConflictDoUpdate({
        target: [dailyUserStats.userID, dailyUserStats.date],
        set: {
          totalCurrentChapters: sql`excluded.totalCurrentChapters`,
          totalLatestChapters: sql`excluded.totalLatestChapters`,
          backlog: sql`excluded.backlog`,
          pastMonthReads: sql`excluded.pastMonthReads`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }
}

const safeNumber = (num: number) => (Number.isNaN(num) ? 0 : num);

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function parseChapterNumber(ch: string) {
  const sanitized = ch.replace(/\.(?=.*\.)/g, '');
  return parseFloat(sanitized) || 0;
}

function calcCurrent(row: any) {
  if (!row.useAlt) return row.currentChap;
  const chapters = JSON.parse(row.chapterTextList);
  return parseChapterNumber(chapters[row.currentIndex]);
}

function calcLatest(row: any) {
  if (!row.useAlt) return parseInt(row.latest);
  const chapters = JSON.parse(row.chapterTextList);
  return parseChapterNumber(chapters[chapters.length - 1]);
}
