import { getManga } from './mangafire';
import config from '../../config.json';
import { appendFile } from 'fs';

async function convert() {
  const resp = await fetch(`${config.serverUrl}/serverReq/data/getAllManga`, {
    method: 'GET',
    headers: {
      pass: config.serverPassWord,
    },
  });

  if (config.verboseLogging) console.log(resp);
  if (resp.status != 200) return console.log('issue fetching data');

  const returnData: updateData = (await resp.json()).data;

  let newManga: mangaData[] = [];
  for (let i = 0; i < returnData.length; i++) {
    let manga = returnData[i];

    if (!manga.urlBase.includes('comick')) continue;

    let searchRes = await fetch(
      'https://mangafire.to/ajax/manga/search?' +
        new URLSearchParams({
          keyword: manga.mangaName,
        }).toString()
    );

    // const contentType = searchRes.headers.get('content-type');
    // if (config.verboseLogging) console.log(searchRes + '\n' + contentType);

    // if (!contentType?.includes('application/json')) {
    //   const textResponse = await searchRes.text(); // Read response as text
    //   console.error('Invalid response (not JSON):', textResponse);
    //   console.log(manga.mangaName);

    //   await new Promise((r) => setTimeout(r, 20000));
    //   continue;
    // }

    if (!searchRes.ok) return console.log('issue fetching data');

    const searchReturn: mangaFireSearchRes = await searchRes.json();

    console.log(searchReturn);

    console.log(searchReturn);
    if (!searchReturn || !searchReturn.result.html || searchReturn.result.count <= 0) {
      console.log(manga.mangaId, manga.mangaName, 'Unable to find');
      continue;
    }

    const match = searchReturn.result.html.match(/<a[^>]+href="([^"]+)"/);
    const bestMatch = match ? match[1] : null;

    try {
      newManga.push({
        ...(await getManga(
          `https://mangafire.to/read${bestMatch.replace('manga/', '')}/en/chapter-1`,
          true,
          true,
          [],
          ''
        )),
        mangaId: manga.mangaId,
      });
    } catch (err) {
      logError({ name: manga.mangaName, url: manga.urlBase, err: err });
    }

    console.log(newManga, manga.mangaName);
  }

  sendUpdate(newManga);
}

async function sendUpdate(newManga: mangaData[]) {
  console.log('Sending Manga Update!');

  if (newManga.length > 0) {
    // returns all manga together if images not fetched
    const updateData = newManga.map(({ images, ...rest }) => ({
      ...rest,
      newChapterCount: 0,
    }));
    //Drops images from updateManga request to be sent seperatly avoiding 503
    const resp = await fetch(`${config.serverUrl}/serverReq/data/updateManga`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pass: config.serverPassWord,
      },
      body: JSON.stringify({
        newData: updateData,
        amountNewChapters: 0, //batch.batchData.newChapterCount - some edge case causes this to become NaN.
        expiresAt: Date.now(),
      }),
    });

    console.log(resp);

    if (!resp.ok) {
      console.warn(resp);
    }

    console.log(await resp.json());

    let savedImageCount = 0;
    let failedImageCount = 0;

    for (let i = 0; i < newManga.length; i++) {
      const manga = newManga[i];
      if (!manga.images.length) continue;
      console.log(`Saving ${manga.images.length} Images for mangaId: ${manga.mangaId}`);

      for (let j = 0; j < manga.images.length; j++) {
        const resp = await fetch(`${config.serverUrl}/serverReq/data/saveCoverImage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            pass: config.serverPassWord,
          },
          body: JSON.stringify({
            img: manga.images[j].image,
            index: manga.images[j].index,
            mangaId: manga.mangaId,
          }),
        });

        // console.log(resp);
        if (!resp.ok) {
          console.warn(`Failed to save!; ${manga.mangaId}`);
          failedImageCount++;
          continue;
        }
        savedImageCount++;
      }
    }

    const successMessage = `${savedImageCount} / ${
      savedImageCount + failedImageCount
    } Cover Images Saved!`;

    console.log(successMessage);
    // console.log('done, Its recomended to turn of auto update images now!');
  }
}

function logError({ name, url, err }) {
  const message =
    `Name: ${name} URL: ${url}\n` + `Error: ${err instanceof Error ? err.stack : String(err)}\n\n`;

  appendFile('error.log', message, (writeErr) => {
    if (writeErr) {
      console.error('Failed to write log:', writeErr);
    }
  });
}

type mangaFireSearchRes = {
  status: number;
  result: {
    count: number;
    html: string;
    linkMore: string;
  };
};

type updateData = {
  mangaId: string;
  urlBase: string;
  slugList: string;
  mangaName: string;
}[];

type mangaData = {
  mangaName: string;
  urlBase: string;
  slugList: string;
  chapterTextList: string;
  currentIndex: number;
  images: { image: Buffer; index: number }[];
  specialFetchData: any;
  mangaId: string;
};

convert();
