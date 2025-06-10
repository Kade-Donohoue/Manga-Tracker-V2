import { Env, mangaDetailsSchema } from '../types';
import { verifyIndexRange } from '../utils';

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
      'SELECT mangaData.mangaName, userData.mangaId, mangaData.urlBase, mangaData.slugList, mangaData.chapterTextList, mangaData.updateTime, userData.currentChap, userData.currentIndex, userData.userCat, userData.interactTime, (SELECT GROUP_CONCAT(coverImages.coverIndex) FROM coverImages WHERE coverImages.mangaId = userData.mangaId) AS imageIndexes FROM userData JOIN mangaData ON (userData.mangaId = mangaData.mangaId) WHERE userData.userId = ?'
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

export async function userStats(userId: string, env: Env) {
  try {
    let results = await env.DB.batch([
      env.DB.prepare(
        // users Manga
        `SELECT u.currentChap, u.mangaId, m.latestChapterText, u.userCat, m.useAltStatCalc, m.chapterTextList FROM userData u JOIN mangaData m ON u.mangaId = m.mangaId WHERE u.userID = ?`
      ).bind(userId),
      env.DB.prepare('SELECT COUNT(*) AS total FROM mangaData'), // Total Manga Count
      env.DB.prepare(
        // New Chapters
        'SELECT SUM(stat_value) AS total FROM stats WHERE type = "chapCount" AND timestamp > datetime("now", "-30 days")'
      ),
      env.DB.prepare(
        // newManga
        'SELECT SUM(stat_value) AS total FROM stats WHERE type = "mangaCount" AND timestamp > datetime("now", "-30 days")'
      ),
      env.DB.prepare(
        //readChapter
        `SELECT SUM(
          CASE
            WHEN m.useAltStatCalc = 1 THEN
              FLOOR(u.currentIndex) + 1
            ELSE
              FLOOR(u.currentChap)
          END
        ) AS total
        FROM userData u
          JOIN mangaData m ON u.mangaId = m.mangaId
          JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
        WHERE u.userId = ?
          AND c.stats = 1`
      ).bind(userId),
      env.DB.prepare(
        //globalTrackedChapters
        `SELECT SUM(
          CASE
            WHEN useAltStatCalc = 1 THEN
              LENGTH(latestChapterText) - LENGTH(REPLACE(latestChapterText, ',', '')) + 1
            ELSE
              FLOOR(latestChapterText)
          END
        ) AS total
      FROM mangaData`
      ),
      env.DB.prepare(
        //userTrackedChapters
        `SELECT SUM(
          CASE
            WHEN m.useAltStatCalc = 1 THEN
              LENGTH(m.latestChapterText) - LENGTH(REPLACE(m.latestChapterText, ',', '')) + 1
            ELSE
              FLOOR(m.latestChapterText)
          END
        ) AS total
        FROM userData u
          JOIN mangaData m ON u.mangaId = m.mangaId
          JOIN userCategories c ON u.userCat = c.value AND u.userId = c.userId
        WHERE u.userId = ?
          AND c.stats = 1`
      ).bind(userId),
    ]);
    console.log(results);

    const userManga = results[0].results as {
      currentChap: string;
      mangaId: string;
      latestChapterText: string;
      userCat: string;
    }[];
    const mangaCount = results[1].results[0] as { total: number };
    const updateCount = results[2].results[0] as { total: number };
    const newCount = results[3].results[0] as { total: number };
    const readChapter = results[4].results[0] as { total: number };
    const globalTrackedChapter = results[5].results[0] as { total: number };
    const userTrackedChapters = results[6].results[0] as { total: number };

    let unreadManga: number = 0;

    for (const manga of userManga) {
      if (!manga.currentChap || !manga.latestChapterText) {
        console.warn(`${manga.mangaId} has no Chapter List!`);
        continue;
      }

      if (manga.currentChap !== manga.latestChapterText) unreadManga++;
    }
    const userStats = {
      chaptersRead: readChapter.total || 0,
      chaptersUnread: userTrackedChapters.total - readChapter.total,
      unreadManga: unreadManga,
      readManga: userManga.length,
    };
    const mangaStats = {
      trackedManga: mangaCount?.total || 0,
      totalTrackedChapters: globalTrackedChapter.total || 0,
      newMangaCount: newCount?.total || 0,
      newChapterCount: updateCount?.total || 0,
    };

    const expiresAt = (await env.KV.get('expiresAt')) || Date.now() + 1 * 60 * 1000; //1 hr from now if no expiresAt is strored

    return new Response(
      JSON.stringify({ userStats: userStats, globalStats: mangaStats, expiresAt: expiresAt }),
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
