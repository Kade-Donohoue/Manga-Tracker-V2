import { Env, friendsMangaScema, mangaDetailsSchema } from '../types';
import { extractValue, verifyIndexRange } from '../utils';

export async function getUnreadManga(
  authId: string,
  userCat: string = '%',
  sortMethod: string = 'interactTime',
  sortOrd: string = 'ASC',
  env: Env
) {
  try {
    console.log({ authId: authId, userCat: userCat, sortMethod: sortMethod, sortOrd: sortOrd });

    var userManga = mangaDetailsSchema
      .array()
      .safeParse(
        (
          await env.DB.prepare(
            `SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.currentChap, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ? AND userCat LIKE ? ORDER BY ${sortMethod} ${sortOrd}`
          )
            .bind(authId, userCat)
            .all()
        ).results as any
      );

    // if (userManga instanceof Response) return new Response(JSON.stringify({message:`No user data found for ${authId} with the cat ${userCat}`}), {status: 404}) // returns zod errors

    if (!userManga.success) {
      return new Response(
        JSON.stringify({
          message: `Internal Server Error!`,
          errors: userManga.error.errors,
        }),
        { status: 500 }
      );
    }

    const mangaList = userManga.data;

    if (!mangaList) {
      console.log({ message: 'No User data found!', authId: authId, userCat: userCat });
      return new Response(
        JSON.stringify({ message: `No user data found for ${authId} with the cat ${userCat}` }),
        { status: 404 }
      );
    }

    // removes manga where you are on latest chapter
    for (let i = mangaList.length - 1; i >= 0; i--) {
      let manga = mangaList[i];

      if (manga.slugList.length - 1 <= manga.currentIndex) mangaList.splice(i, 1);
    }

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ mangaDetails: mangaList, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'unknown error occured' }), { status: 500 });
  }
}

export async function getManga(authId: string, mangaId: string, env: Env) {
  try {
    let userManga = mangaDetailsSchema.safeParse(
      (await env.DB.prepare(
        'SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentIndex, userData.userCat, userData.interactTime FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?  AND userData.mangaId = ? LIMIT 1'
      )
        .bind(authId, mangaId)
        .first()) as any
    );

    if (!userManga.success) {
      return new Response(
        JSON.stringify({
          message: `Internal Server Error!`,
          errors: userManga.error.errors,
        }),
        { status: 500 }
      );
    }

    const manga = userManga.data;

    if (!manga) {
      console.log({ message: 'Manga Not found!', authId: authId, mangaId: mangaId });
      return new Response(JSON.stringify({ message: `Manga Not found!` }), { status: 404 });
    }

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ mangaDetails: manga, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'unknown error occured' }), { status: 500 });
  }
}

export async function getUserManga(authId: string, env: Env) {
  try {
    let queryTimeDebug = 0;
    const userRes = await env.DB.prepare(
      `
      SELECT 
      mangaData.mangaName,
      userData.mangaId,
      mangaData.urlBase,
      mangaData.slugList,
      mangaData.chapterTextList,
      mangaData.updateTime,
      userData.currentChap,
      userData.currentIndex,
      userData.userCat,
      userData.interactTime,
      (
        SELECT GROUP_CONCAT(coverImages.coverIndex) 
        FROM coverImages 
        WHERE coverImages.mangaId = userData.mangaId
      ) AS imageIndexes,
      (
        SELECT GROUP_CONCAT(DISTINCT CONCAT(f.friendId, '-:-', u.imageURL, '-:-', u.userName))
        FROM (
          SELECT 
            CASE 
              WHEN senderId = userData.userId THEN receiverId
              ELSE senderId
            END AS friendId
          FROM friends
          WHERE (senderId = userData.userId OR receiverId = userData.userId) AND friends.status = 'accepted'
        ) AS f
        JOIN userData AS ud2 
          ON ud2.userId = f.friendId AND ud2.mangaId = userData.mangaId 
        JOIN userCategories AS uc
          ON uc.userId = ud2.userId 
          AND uc.value = ud2.userCat 
          AND uc.public = '1'
        JOIN users AS u 
          ON u.userID = f.friendId
      ) AS sharedFriends
    FROM userData 
    JOIN mangaData ON userData.mangaId = mangaData.mangaId 
    WHERE userData.userId = ?
    `
    )
      .bind(authId)
      .all();

    queryTimeDebug += userRes.meta.duration;
    let userManga = mangaDetailsSchema.array().safeParse(userRes.results);

    if (!userManga.success) {
      return new Response(
        JSON.stringify({
          message: `Internal Server Error!`,
          errors: userManga.error.errors,
        }),
        { status: 500 }
      );
    }

    const mangaList = userManga.data;

    if (!mangaList) {
      console.log({ message: 'No User data found!', authId: authId });
      return new Response(JSON.stringify({ message: `No user data found for ${authId}` }), {
        status: 404,
      });
    }

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ mangaDetails: mangaList, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' }), { status: 500 });
  }
}

export async function getAllManga(env: Env, pass: string | null) {
  try {
    //Remove all manga that no user is tracking
    await env.DB.prepare(
      'DELETE FROM mangaData WHERE mangaId NOT IN (SELECT mangaId FROM userData)'
    ).run();

    const allManga: [{ mangaName: string; mangaId: string }] = (
      await env.DB.prepare('SELECT mangaName, mangaId FROM mangaData').all()
    ).results as any;
    // console.log(allManga)

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ allData: allManga, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occured' }), { status: 500 });
  }
}

export async function getFriendManga(userId: string, friendId: string, mangaId: string, env: Env) {
  try {
    const friendRes = await env.DB.prepare(
      `
        SELECT 
          ud.userId,
          ud.currentIndex
        FROM userData AS ud
        JOIN userCategories AS uc 
          ON ud.userId = uc.userId AND ud.userCat = uc.catName
        WHERE ud.mangaId = ?
          AND uc.public = '1'
          AND ud.userId IN (
            SELECT 
              CASE 
                WHEN f.senderId = ? THEN f.receiverId
                ELSE f.senderId
              END
            FROM friends f
            WHERE (f.senderId = ? OR f.receiverId = ?) AND f.status = 'accepted'
          )
      `
    )
      .bind(mangaId, userId, friendId, friendId)
      .first();

    let userManga = friendsMangaScema.safeParse(friendRes);

    if (!userManga.success) {
      return new Response(
        JSON.stringify({
          message: `Internal Server Error!`,
          errors: userManga.error.errors,
        }),
        { status: 500 }
      );
    }

    const friendData = userManga.data;

    if (!friendData) {
      console.log({ message: 'Manga not found for friend!', authId: friendId, mangaId: mangaId });
      return new Response(
        JSON.stringify({ message: `Manga ${mangaId} not found for friend ${friendId}` }),
        {
          status: 404,
        }
      );
    }

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ friendData: friendData, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' }), { status: 500 });
  }
}

export async function getSharedManga(userId: string, mangaId: string, env: Env) {
  try {
    const friendRes = await env.DB.prepare(
      `
        SELECT 
          ud.userID,
          ud.currentIndex
        FROM userData AS ud
        JOIN userCategories AS uc 
          ON ud.userId = uc.userId AND ud.userCat = uc.value
          AND uc.public = '1'
        WHERE ud.mangaId = ?
          AND ud.userId IN (
            SELECT 
              CASE 
                WHEN f.senderId = ? THEN f.receiverId
                ELSE f.senderId
              END
            FROM friends f
          )
      `
    )
      .bind(mangaId, userId)
      .all();

    let userManga = friendsMangaScema.array().safeParse(friendRes.results);

    if (!userManga.success) {
      return new Response(
        JSON.stringify({
          message: `Internal Server Error!`,
          errors: userManga.error.errors,
        }),
        { status: 500 }
      );
    }

    const friendData = userManga.data;

    if (!friendData) {
      console.log({ message: 'No Manga Shared with Friends!', mangaId: mangaId });
      return new Response(JSON.stringify({ message: `No Friends seam to be sharing ${mangaId}` }), {
        status: 404,
      });
    }

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(JSON.stringify({ friendData: friendData, expiresAt: expiresAt }), {
      status: 200,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' }), { status: 500 });
  }
}

export async function userStats(userId: string, env: Env) {
  try {
    const queries = {
      global: env.DB.prepare(`
        SELECT
        (SELECT COUNT(*) FROM mangaData) AS mangaCount,
        (SELECT SUM(value) FROM mangaStats WHERE type = 'chapCount' AND timestamp > datetime('now', '-30 days')) AS newChapters,
        (SELECT SUM(value) FROM mangaStats WHERE type = 'mangaCount' AND timestamp > datetime('now', '-30 days')) AS newManga,
        (SELECT SUM(CASE WHEN useAltStatCalc = 1 THEN LENGTH(latestChapterText) - LENGTH(REPLACE(latestChapterText, ',', '')) + 1 ELSE FLOOR(latestChapterText) END) FROM mangaData) AS trackedChapters,
        (SELECT SUM(value) FROM userStats WHERE type = 'chapsRead' AND timestamp > datetime('now', '-30 days')) AS readThisMonth
      `),
      user: env.DB.prepare(
        `
        WITH dailySums AS (
          SELECT DATE(timestamp) AS day, SUM(value) AS totalPerDay
          FROM userStats 
          WHERE userID = ? AND timestamp > datetime("now", "-30 days")
          GROUP BY day
        )
        SELECT
          (SELECT SUM(
            CASE WHEN m.useAltStatCalc = 1 THEN FLOOR(u.currentIndex) + 1 ELSE FLOOR(u.currentChap) END
          )
          FROM userData u
          JOIN mangaData m ON u.mangaId = m.mangaId
          JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
          WHERE u.userId = ? AND c.stats = 1) AS readChapters,

          (SELECT SUM(
            CASE WHEN m.useAltStatCalc = 1 THEN LENGTH(m.latestChapterText) - LENGTH(REPLACE(m.latestChapterText, ',', '')) + 1 ELSE FLOOR(m.latestChapterText) END
          )
          FROM userData u
          JOIN mangaData m ON u.mangaId = m.mangaId
          JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
          WHERE u.userId = ?) AS trackedChapters,

          (SELECT SUM(value)
          FROM userStats
          WHERE type = 'chapsRead' AND timestamp > datetime('now', '-30 days') AND userID = ?) AS readThisMonth,

          (SELECT AVG(totalPerDay) FROM dailySums) AS averagePerDay
      `
      ).bind(userId, userId, userId, userId),
      userManga: env.DB.prepare(
        `
        SELECT u.currentChap, u.mangaId, m.latestChapterText, u.userCat, m.useAltStatCalc, m.chapterTextList
        FROM userData u
        JOIN mangaData m ON u.mangaId = m.mangaId
        WHERE u.userID = ?
      `
      ).bind(userId),
    };

    // Run all queries
    const results = await env.DB.batch(Object.values(queries));

    // Destructure and name clearly
    const [globalRes, userRes, userMangaRes] = results.map((r) => r.results);

    // Now you can clearly use:
    const userManga = userMangaRes as {
      currentChap: string;
      mangaId: string;
      latestChapterText: string;
      userCat: string;
    }[];

    const globalStats = globalRes[0] as {
      mangaCount: number;
      newChapters: number;
      newManga: number;
      trackedChapters: number;
      readThisMonth: number;
    };
    const rawUserStats = userRes[0] as {
      readChapters: number;
      trackedChapters: number;
      readThisMonth: number;
      averagePerDay: number;
    };

    let unreadManga: number = 0;

    for (const manga of userManga) {
      if (!manga.currentChap || !manga.latestChapterText) {
        console.warn(`${manga.mangaId} has no Chapter List!`);
        continue;
      }

      if (manga.currentChap !== manga.latestChapterText) unreadManga++;
    }
    const userStats = {
      chaptersUnread: rawUserStats.trackedChapters - rawUserStats.readChapters,
      unreadManga: unreadManga,
      readManga: userManga.length,
      ...rawUserStats,
    };

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(
      JSON.stringify({ userStats: userStats, globalStats: globalStats, expiresAt: expiresAt }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occurred' + err }), {
      status: 500,
    });
  }
}

export async function getUpdateData(env: Env, pass: string | null) {
  if (pass != env.SERVER_PASSWORD)
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  try {
    const allManga: [{ mangaId: string; urlBase: string; slugList: string; mangaName: string }] = (
      await env.DB.prepare('SELECT urlBase, slugList, mangaId, mangaName FROM mangaData').all()
    ).results as any;
    // console.log(allManga)
    return new Response(JSON.stringify({ data: allManga }), { status: 200 });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occured' }), { status: 500 });
  }
}

export async function pullUserCategories(authId: string, env: Env) {
  try {
    // let categories:{value:string,label:string,color?:string} = []

    const { results } = await env.DB.prepare(
      'Select label, value, color, stats, public, position FROM userCategories WHERE userID = ? ORDER BY position ASC'
    )
      .bind(authId)
      .all();

    const rows = results as {
      label: string;
      value: string;
      color: string;
      stats: boolean;
      public: boolean;
      position: number;
    }[];

    // return default categories if no categories are found for user
    if (!results)
      return new Response(JSON.stringify({ message: 'No Custom Cats', cats: [] }), { status: 200 });

    let formattedRows = rows.map((row) => {
      return {
        ...row,
        stats: !!row.stats,
        public: !!row.public,
      };
    });

    return new Response(JSON.stringify({ message: 'Success', cats: formattedRows }), {
      status: 200,
    });
  } catch (err) {
    console.warn('Error with pullUserCategories: ' + err);
    return new Response(JSON.stringify({ message: 'An error occured' + err }), { status: 500 });
  }
}
