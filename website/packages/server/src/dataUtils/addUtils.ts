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
    const mangaUrlBases = newMangaInfo.map((m) => m.urlBase);

    const selectQuery = `SELECT m.mangaId, m.mangaName, max(c.coverIndex) as maxCoverIndex 
      FROM mangaData m 
      JOIN coverImages c 
        ON m.mangaId = c.mangaId 
      WHERE m.urlBase IN (${mangaUrlBases.map(() => '?').join(', ')})
      GROUP BY m.mangaId, m.urlBase`;

    const existingMangaRows = (await env.DB.prepare(selectQuery)
      .bind(...mangaUrlBases)
      .all()) as { results: { mangaId: string; urlBase: string; maxCoverIndex: number }[] };

    const existingMangaMap = new Map(
      existingMangaRows.results.map((row) => [
        row.urlBase,
        { mangaId: row.mangaId, maxCoverIndex: row.maxCoverIndex },
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

        const mangaId = existingMangaMap.get(manga.urlBase)?.mangaId || crypto.randomUUID();

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

        const coverIndex = (existingMangaMap.get(manga.mangaName)?.maxCoverIndex ?? -1) + 1;

        newBoundStmt.push(
          env.DB.prepare('INSERT INTO coverImages (mangaId, coverIndex) VALUES (?,?)').bind(
            mangaId,
            coverIndex
          )
        );

        await env.IMG.put(
          `${mangaId}/${coverIndex}`,
          new Uint8Array(manga.iconBuffer.data).buffer,
          {
            httpMetadata: { contentType: 'image/jpeg' },
          }
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

    let statMetric = await env.DB.prepare(
      'INSERT INTO mangaStats (type, value) VALUES ("mangaCount", ?)'
    )
      .bind(newMangaCount)
      .run();

    //If environment isn't prod send collected metrics for debugging
    if (env.ENVIRONMENT != 'production')
      return new Response(
        JSON.stringify({
          results: userReturn,
          dataMetric: dbMetrics,
          statMetric: statMetric,
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
