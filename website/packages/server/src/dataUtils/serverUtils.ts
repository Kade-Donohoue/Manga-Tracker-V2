import { z } from 'zod';
import { clerkUserSchema, Env, updateDataType } from '../types';

/**
 * pulls all manga from DB includeds mangas name, urlList, and id
 * @param env environment
 * @returns Response with array of manga within data
 */
export async function getAllManga(env: Env) {
  try {
    const allManga: [{ mangaId: string; urlBase: string; slugList: string; mangaName: string }] = (
      await env.DB.prepare(
        `SELECT 
            m.urlBase,
            m.slugList,
            m.mangaId,
            m.mangaName,
            ci.maxSavedAt,
            ci.maxCoverIndex
        FROM mangaData m
        LEFT JOIN (
            SELECT 
                mangaId,
                MAX(savedAt) AS maxSavedAt,
                MAX(coverIndex) AS maxCoverIndex
            FROM coverImages
            GROUP BY mangaId
        ) ci ON m.mangaId = ci.mangaId;`
      ).all()
    ).results as any;
    return new Response(JSON.stringify({ data: allManga }), { status: 200 });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ message: 'an unknown error occured' }), { status: 500 });
  }
}

export async function updateManga(newData: updateDataType, expiresAt: number, env: Env) {
  try {
    console.log(newData);
    await env.KV.put('expiresAt', expiresAt.toString());
    const stmt = env.DB.prepare(
      'UPDATE mangaData SET urlBase = ?, slugList = ?, chapterTextList = ?, latestChapterText = ? WHERE mangaId = ?'
    );

    var boundStmt: D1PreparedStatement[] = [];
    for (var i = 0; i < newData.length; i++) {
      // console.log(newData[i].chapterUrlList, newData[i].chapterTextList, newData[i].mangaId)
      if (!newData[i]) continue;
      console.log(i, newData[i]);
      boundStmt.push(
        stmt.bind(
          newData[i].urlBase,
          newData[i].slugList,
          newData[i].chapterTextList,
          newData[i].chapterTextList.slice(newData[i].chapterTextList.lastIndexOf(',') + 1),
          newData[i].mangaId
        )
      );

      boundStmt.push(
        env.DB.prepare(
          'INSERT INTO mangaStats (type, value, mangaId) VALUES ("chapCount", ?, ?)'
        ).bind(newData[i].newChapterCount, newData[i].mangaId)
      );
    }

    await env.DB.batch(boundStmt);

    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (err) {
    console.error('Error:', err, 'Data: ', newData);
    return new Response(JSON.stringify({ message: 'an unknown error occured' }), { status: 500 });
  }
}

export async function fixCurrentChaps(env: Env) {
  const { results: users } = await env.DB.prepare(
    'SELECT userData.userID, userData.mangaId, userData.currentIndex, mangaData.chapterTextList FROM userData JOIN mangaData ON userData.mangaId = mangaData.mangaId'
  ).all();

  let batchedJobs: D1PreparedStatement[] = [];

  for (const user of users) {
    // const manga = await env.DB
    //     .prepare("SELECT chapterTextList FROM mangaData WHERE mangaId = ?")
    //     .bind(user.mangaId)
    //     .first<{ chapterTextList: string }>();

    if (!user?.chapterTextList) continue;

    const chapterList = String(user.chapterTextList)
      .split(',')
      .map((c) => c.trim());

    const chapterText = chapterList[Number(user.currentIndex)] ?? -1;
    const lastChap = chapterList[chapterList.length - 1] ?? -1;

    batchedJobs.push(
      env.DB.prepare('UPDATE userData SET currentChap = ? WHERE mangaId = ? AND userID = ?').bind(
        chapterText,
        user.mangaId,
        user.userID
      )
    );

    batchedJobs.push(
      env.DB.prepare('UPDATE mangaData SET latestChapterText = ? WHERE mangaId = ?').bind(
        lastChap,
        user.mangaId
      )
    );
  }

  await env.DB.batch(batchedJobs);

  return new Response('Fixed currentChap for all users.');
}

export async function newUser(user: z.infer<typeof clerkUserSchema>, env: Env) {
  const results = await env.DB.prepare(
    'INSERT OR REPLACE INTO users (userID, userName, imageUrl, createdAt) VALUES (?, ?, ?, ?)'
  )
    .bind(user.data.id, user.data.username.toLowerCase(), user.data.image_url, user.data.created_at)
    .run();

  if (!results.success)
    return new Response(JSON.stringify({ message: 'Unable To save Data!', results: results }), {
      status: 500,
    });
  return new Response(JSON.stringify({ message: 'User Saved!', results: results }), {
    status: 200,
  });
}

export async function addCoverIndex(env: Env) {
  const list = await env.IMG.list();

  console.log(list);

  for (const obj of list.objects) {
    const oldKey = obj.key;

    if (oldKey.includes('/')) continue;

    const newKey = `${oldKey}/0`;

    const oldObject = await env.IMG.get(oldKey);
    if (!oldObject) {
      console.warn(`${oldKey} Does Not Exist in bucket`);
      continue;
    }

    await env.IMG.put(newKey, oldObject.body);

    await env.IMG.delete(oldKey);

    console.log(`Moved ${oldKey} to ${newKey}`);
  }

  return new Response('Keys Updated!');
}

export async function addCoversToD1(env: Env) {
  const list = await env.IMG.list();

  console.log(list);

  const result = await env.DB.prepare(`SELECT mangaId FROM mangaData`).all();
  const existingMangaIds = new Set(result.results.map((row: any) => row.mangaId));

  const stmt = env.DB.prepare(`INSERT INTO coverImages (mangaId, coverIndex) VALUES (?, ?)`);
  const boundStmt: D1PreparedStatement[] = [];
  for (const obj of list.objects) {
    if (obj.key.includes('mangaNotFound')) continue;

    const keyParts = obj.key.split('/');

    const mangaId = keyParts[0];
    const coverIndex = parseInt(keyParts[1]);

    if (!existingMangaIds.has(mangaId)) {
      console.log(`MangaID ${mangaId} not found in DB!`);
      continue;
    }

    boundStmt.push(stmt.bind(mangaId, coverIndex));
  }
  console.log(boundStmt);
  await env.DB.batch(boundStmt);

  return new Response('coversAdded');
}

export async function saveCoverImage(img: any, index: number, mangaId: string, env: Env) {
  console.log(`Saving New Cover Image for mangaId: ${mangaId} at index ${index}`);
  await env.IMG.put(`${mangaId}/${index}`, new Uint8Array(img.data).buffer);

  await env.DB.prepare(
    'INSERT INTO coverImages (mangaId, coverIndex) VALUES (?, ?) ON CONFLICT (mangaId, coverIndex) DO UPDATE SET savedAt = CURRENT_TIMESTAMP'
  )
    .bind(mangaId, index)
    .run();

  return new Response('Image Saved!');
}
