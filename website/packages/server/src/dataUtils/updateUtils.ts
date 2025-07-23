import { Env } from '../types';

export async function updateCurrentIndex(
  userId: string,
  newIndex: number,
  mangaId: string,
  env: Env
) {
  try {
    const mangaRes = await env.DB.prepare(
      'SELECT mangaData.chapterTextList, userData.currentChap FROM mangaData JOIN userData ON userData.mangaId = mangaData.mangaId WHERE userData.userID = ? AND mangaData.mangaId = ?'
    )
      .bind(userId, mangaId)
      .first<{ chapterTextList: string; currentChap: string }>();

    if (!mangaRes)
      return new Response(JSON.stringify({ message: 'Unable to find manga!' }), { status: 400 });

    const chapterList = mangaRes.chapterTextList.split(',');

    let readChapters = Math.floor(
      parseFloat(chapterList[newIndex]) - parseFloat(mangaRes.currentChap)
    );

    const res = await env.DB.batch([
      env.DB.prepare(
        'UPDATE userData SET currentIndex = ?, interactTime = ?, currentChap = ? WHERE userID = ? AND mangaId = ?'
      ).bind(newIndex, Date.now(), chapterList[newIndex], userId, mangaId),
      env.DB.prepare(
        'INSERT INTO userStats (type, value, mangaId, userID) VALUES ("chapsRead", ?, ?, ?)'
      ).bind(readChapters, mangaId, userId),
    ]);

    if (res[0].success)
      return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });

    return new Response(JSON.stringify({ message: 'Unable to save!' }), { status: 500 });
  } catch (err) {
    return new Response(JSON.stringify({ message: 'An error occurred' + err }), { status: 500 });
  }
}

export async function updateInteractTime(
  authId: string,
  mangaId: string,
  interactTime: number,
  env: Env
) {
  try {
    await env.DB.prepare('UPDATE userData SET interactTime = ? WHERE userID = ? AND mangaId = ?')
      .bind(interactTime, authId, mangaId)
      .run();

    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (err) {
    console.warn('Error with updateInteractTime: ' + err);
    return new Response(JSON.stringify({ message: 'An error occured' + err }), { status: 500 });
  }
}

export async function changeMangaCat(authId: string, mangaId: string, newCat: string, env: Env) {
  if (newCat == '%') newCat = 'unsorted';

  const metric = await env.DB.prepare(
    'UPDATE userData SET userCat = ? WHERE userID = ? AND mangaId = ?'
  )
    .bind(newCat, authId, mangaId)
    .run();

  console.log({ metrics: metric });

  if (metric.success) return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });

  return new Response(JSON.stringify({ message: 'Unable to change Category. Contact an Admin!' }), {
    status: 500,
  });
}

export async function updateUserCategories(
  authId: string,
  newCatList: {
    label: string;
    value: string;
    color: string;
    stats: boolean;
    public: boolean;
    position: number;
  }[],
  env: Env
) {
  try {
    const deleteResponse = await env.DB.prepare('DELETE FROM userCategories WHERE userID = ?')
      .bind(authId)
      .run();

    if (!deleteResponse.success)
      return new Response(
        JSON.stringify({ message: 'Failed to update Categories. unable to remove old!' }),
        {
          status: 500,
        }
      );

    let boundStmt: D1PreparedStatement[] = [];
    for (const cat of newCatList) {
      boundStmt.push(
        env.DB.prepare(
          `INSERT INTO userCategories (userID, label, value, color, stats, public, position)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `
        ).bind(authId, cat.label, cat.value, cat.color, cat.stats, cat.public, cat.position)
      );
    }

    const results = await env.DB.batch(boundStmt);

    // if (results.)

    return new Response(JSON.stringify({ message: 'Success', metrics: results }), { status: 200 });
  } catch (err) {
    console.warn('Error with updateInteractTime: ' + err);
    return new Response(JSON.stringify({ message: 'An error occured' + err + authId }), {
      status: 500,
    });
  }
}
