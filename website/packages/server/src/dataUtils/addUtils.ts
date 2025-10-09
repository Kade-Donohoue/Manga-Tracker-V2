import { Env, newData, newDataType } from '../types';

export async function saveManga(
  authId: string,
  urls: string[],
  userCat: string = 'unsorted',
  env: Env
) {
  try {
    console.log('starting manga req');

    if (urls && urls.length <= 0)
      return new Response(JSON.stringify({ Message: 'No Urls Provided!' }), { status: 500 });

    const mangaReq: any = await fetch(
      `${env.PUPPETEER_SERVER}/getManga?urls=${urls.join('&urls=')}&pass=${env.SERVER_PASSWORD}`,
      {
        method: 'GET',
      }
    );
    // console.log(mangaReq)

    if (!mangaReq.ok) {
      const errorResp = await mangaReq.json();
      return new Response(
        JSON.stringify({
          message: errorResp.message,
        }),
        { status: mangaReq.status }
      );
    }

    //response from puppeteer server with ids to check
    const {
      addedManga,
      errors,
    }: {
      addedManga: { fetchId: string; url: string }[];
      errors: { message: string; url: string; success: false }[];
    } = await mangaReq.json();

    const waitingManga = new Map<string, string>(
      addedManga.map((item) => [item.fetchId, item.url])
    );

    let newMangaInfo: newDataType[] = [];
    let userReturn: { url: string; message: string; success: boolean }[] = [...errors];
    while (waitingManga.size >= 1) {
      await new Promise((resolve) => setTimeout(resolve, 500 * waitingManga.size));

      let currentStatusRes = await fetch(
        `${env.PUPPETEER_SERVER}/checkStatus/get?fetchIds=${Array.from(waitingManga.keys()).join(
          '&fetchIds='
        )}&pass=${env.SERVER_PASSWORD}`
      );

      if (!currentStatusRes.ok) continue;

      let {
        currentStatus,
      }: { currentStatus: { fetchId: string; status: string; statusCode: number; data: any }[] } =
        await currentStatusRes.json();

      for (let currentJobStatus of currentStatus) {
        if (currentJobStatus.statusCode === 202) {
          //still processing
          continue;
        } else if (currentJobStatus.statusCode === 200) {
          //Finished
          const parsedData = newData.safeParse(currentJobStatus.data);

          if (parsedData.success) {
            console.log(parsedData.data);
            newMangaInfo.push(parsedData.data);
          } else {
            const formattedError = parsedData.error.format();
            console.error(formattedError);
            userReturn.push({
              url: waitingManga.get(currentJobStatus.fetchId) as string,
              message: parsedData.error.toString(),
              success: false,
            });
            waitingManga.delete(currentJobStatus.fetchId);
          }
          userReturn.push({
            url: waitingManga.get(currentJobStatus.fetchId) as string,
            message: 'Successfully added',
            success: true,
          });
          waitingManga.delete(currentJobStatus.fetchId);
        } else if (currentJobStatus.statusCode === 500) {
          //failed
          userReturn.push({
            url: waitingManga.get(currentJobStatus.fetchId) as string,
            message: currentJobStatus.data,
            success: false,
          });
          waitingManga.delete(currentJobStatus.fetchId);
        } else if (currentJobStatus.statusCode === 404) {
          //Job Lost?
          userReturn.push({
            url: waitingManga.get(currentJobStatus.fetchId) as string,
            message: 'Internal Server Error!',
            success: false,
          });
          waitingManga.delete(currentJobStatus.fetchId);
        } else {
          //unknown
          userReturn.push({
            url: waitingManga.get(currentJobStatus.fetchId) as string,
            message: 'An unknown Error occurred please contact an admin!',
            success: false,
          });
          waitingManga.delete(currentJobStatus.fetchId);
        }
      }
    }

    if (userReturn.length <= 0)
      return new Response(JSON.stringify({ Message: 'Internal Server Error!' }), { status: 500 });

    if (newMangaInfo.length <= 0)
      return new Response(JSON.stringify({ results: userReturn }), { status: 200 });

    //check if manga already in DB if so update otherwise insert new magna
    // Split input into with/without specialFetchData
    const withSpecial = newMangaInfo.filter((m) => m.specialFetchData != null);
    const withoutSpecial = newMangaInfo.filter((m) => m.specialFetchData == null);

    let conditions: string[] = [];
    let params: any[] = [];

    if (withSpecial.length > 0) {
      conditions.push(
        `(m.urlBase, m.specialFetchData) IN (${withSpecial.map(() => '(?, ?)').join(', ')})`
      );
      params.push(...withSpecial.flatMap((m) => [m.urlBase, m.specialFetchData]));
    }

    if (withoutSpecial.length > 0) {
      conditions.push(
        `(m.urlBase IN (${withoutSpecial
          .map(() => '?')
          .join(', ')}) AND m.specialFetchData IS NULL)`
      );
      params.push(...withoutSpecial.map((m) => m.urlBase));
    }

    const selectQuery = `
  SELECT m.mangaId, m.mangaName, m.urlBase, m.specialFetchData
  FROM mangaData m
  ${conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : ''}
`;

    const existingMangaRows = (await env.DB.prepare(selectQuery)
      .bind(...params)
      .all()) as {
      results: { mangaId: string; urlBase: string; specialFetchData: string | null }[];
    };

    // Map by both urlBase + specialFetchData so keys are unique
    const existingMangaMap = new Map(
      existingMangaRows.results.map((row) => [
        `${row.urlBase}::${row.specialFetchData ?? 'NULL'}`,
        { mangaId: row.mangaId },
      ])
    );

    const currentTime = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });

    const boundAddStmtsArrs: D1PreparedStatement[][] = await Promise.all(
      newMangaInfo.map(async (manga) => {
        const newBoundStmt: D1PreparedStatement[] = [];

        const key = `${manga.urlBase}::${manga.specialFetchData ?? 'NULL'}`;
        const mangaId = existingMangaMap.get(key)?.mangaId || crypto.randomUUID();

        console.log('Binding values:', {
          mangaId,
          mangaName: manga.mangaName,
          urlBase: manga.urlBase,
          slugList: manga.slugList,
          chapterTextList: manga.chapterTextList,
          updateTime: currentTime,
        });

        newBoundStmt.push(
          env.DB.prepare(
            'INSERT INTO mangaData (mangaId,mangaName,urlBase,slugList,chapterTextList,latestChapterText,updateTime,specialFetchData) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(mangaId) DO UPDATE SET urlBase = excluded.urlBase, slugList = excluded.slugList, chapterTextList = excluded.chapterTextList, updateTime = excluded.updateTime, specialFetchData = excluded.specialFetchData'
          ).bind(
            mangaId,
            manga.mangaName,
            manga.urlBase,
            manga.slugList,
            manga.chapterTextList,
            manga.chapterTextList.slice(manga.chapterTextList.lastIndexOf(',') + 1),
            currentTime,
            manga.specialFetchData
          )
        );

        newBoundStmt.push(
          env.DB.prepare(
            'INSERT INTO userData (userId, mangaId, currentIndex, currentChap, userCat, interactTime) VALUES (?,?,?,?,?,?) ON CONFLICT(userID, mangaId) DO UPDATE SET currentIndex = excluded.currentIndex, currentChap = excluded.currentChap, userCat = excluded.userCat, interactTime = excluded.interactTime'
          ).bind(
            authId,
            mangaId,
            manga.currentIndex,
            manga.chapterTextList.split(',')[manga.currentIndex],
            userCat,
            Date.now()
          )
        );

        //Counts Chapters as Read for manga for stats.
        newBoundStmt.push(
          env.DB.prepare(
            'INSERT INTO userStats (userId, mangaId, type, value) VALUES (?, ?, "chapsRead", ?)'
          ).bind(authId, mangaId, parseInt(manga.chapterTextList.split(',')[manga.currentIndex]))
        );

        await Promise.all(
          manga.images.map(async (img) => {
            await env.IMG.put(`${mangaId}/${img.index}`, new Uint8Array(img.image.data).buffer, {
              httpMetadata: { contentType: 'image/jpeg' },
            });

            newBoundStmt.push(
              env.DB.prepare(
                'INSERT INTO coverImages (mangaId, coverIndex) VALUES (?,?) ON CONFLICT(mangaId, coverIndex) DO NOTHING'
              ).bind(mangaId, img.index)
            );
          })
        );

        return newBoundStmt;
      })
    );

    let boundAddStmts: D1PreparedStatement[] = boundAddStmtsArrs.flat();

    const dbMetrics = await env.DB.batch(boundAddStmts);

    let newMangaCount: number = 0;
    //goes through all mangaData results skipping userData and stats
    for (let i = 0; i < dbMetrics.length; i += 2) {
      // console.log(i)
      if (dbMetrics[i].meta.last_row_id != 0) {
        newMangaCount++;
      }
    }

    let mangaStats = env.DB.prepare(
      'INSERT INTO mangaStats (type, value) VALUES ("mangaCount", ?)'
    ).bind(newMangaCount);

    //If environment isn't prod send collected metrics for debugging
    if (env.ENVIRONMENT != 'production')
      return new Response(
        JSON.stringify({
          results: userReturn,
          dataMetric: dbMetrics,
          statMetric: mangaStats,
          newManga: newMangaCount,
        })
      );
    return new Response(JSON.stringify({ results: userReturn }));
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ message: 'an unknown error occured' + error }), {
      status: 500,
    });
  }
}

export async function existingManga(
  authId: string,
  mangaId: string,
  index: number,
  userCat: string,
  currentChap: string,
  env: Env
) {
  const results = await env.DB.prepare(
    'INSERT INTO userData (userId, mangaId, currentIndex, currentChap, userCat, interactTime) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(userID, mangaId) DO UPDATE SET currentIndex = excluded.currentIndex, currentChap = excluded.currentChap, userCat = excluded.userCat, interactTime = excluded.interactTime'
  )
    .bind(authId, mangaId, index, currentChap, userCat, Date.now())
    .run();

  if (!results.success) {
    return new Response(
      JSON.stringify({ message: 'Unable to save to Database contact support!' }),
      {
        status: 500,
      }
    );
  }

  await env.DB.prepare(
    `UPDATE recommendations SET status = 'accepted' WHERE receiverId = ? AND mangaId = ?`
  )
    .bind(authId, mangaId)
    .run();

  if (results.meta.rows_written <= 0 || !results.meta.changed_db)
    return new Response(JSON.stringify({ message: 'Already Tracked, Updated chapter!' }), {
      status: 200,
    });
  return new Response(JSON.stringify({ message: 'Success!' }), { status: 200 });
}
