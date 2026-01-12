import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';

const Mangapark = 'Mangapark-site';
const ENABLED = true;

export const mangaparkQueue = new Queue(Mangapark, {
  connection,
});

function check(url: string): CheckResult {
  let u: URL;

  try {
    u = new URL(url);
  } catch {
    return { ok: false, stage: 0, reason: 'Invalid URL' };
  }

  if (!u.hostname.includes('mangapark.org')) {
    return { ok: false, stage: 1, reason: 'Hostname does not match mangapark.org' };
  }

  const match = u.pathname.match(/\/title\/\d+-[^\/]+\/\d+/i);
  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason: 'Path must match /title/{manga-id}-{manga-slug}/chapter-{chapter-id}',
    };
  }

  return { ok: true, stage: 3 };
}

export const mangaparkSite: SiteQueue = {
  name: Mangapark,
  enabled: ENABLED,
  check,
  queue: mangaparkQueue,
  start: start,
};

let worker: Worker | null = null;
async function start() {
  if (worker) return;

  worker = new Worker(
    Mangapark,
    async (job) => {
      const { url } = job.data;
      console.log('[MangaPark] processing:', url);

      return await getManga(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        // job.data.specialFetchData,
        job
      );
    },
    { connection }
  );
}

/**
 * Gets the chapter list from MangaPark
 * @param url: Chapter URL of a manga from MangaPark.
 * @param icon: wether or not to get icon
 * @returns {
 *  "mangaName": name of manga ,
 *  "urlList": string separated by commas(',') for all chapter urls of manga
 *  "chapterTextList": string separated by commas(',') for all chapter text of manga
 *  "iconBuffer": base64 icon for manga
 * }
 */
export async function getManga(
  url: string,
  icon: boolean = true,
  ignoreIndex = false,
  coverIndexes: number[],
  maxSavedAt: string,
  job: Job
): Promise<fetchData> {
  if (config.debug.verboseLogging) console.log('mangaDex');

  const logWithTimestamp = createTimestampLogger();

  const browser = await getBrowser();

  const page = await browser.newPage();

  try {
    job.log(logWithTimestamp('Pulling Chapter Data!'));

    let title: string = job.data.mangaName;

    const match = url.match(/title\/(\d+)[^/]*\/(\d+)/);
    const [, comicId, currentChapterId] = match;

    const response = await fetch('https://mangapark.org/apo/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
        query get_comicChapterList($comicId: ID!) {
          get_comicChapterList(comicId: $comicId) {
            id
            data {
              id
              comicId
              isFinal
              volume
              serial
              dname
              title
              urlPath
              sfw_result
            }
          }
        }
      `,
        variables: { comicId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Manga: Unable to get Chapter List, ${response.status}`);
    }

    const chapterResults: ComicChapterListResponse = await response.json();

    if (config.debug.verboseLogging) console.log(chapterResults.data.get_comicChapterList);

    const chapters = chapterResults.data?.get_comicChapterList;

    if (!chapters) throw new Error('Manga: Failed to get Chapters!');

    const slugList = chapters.map((ch) => ch.data.id);
    const chapterTextList = chapters.map(
      (ch) => ch.data.serial //dname.toLocaleLowerCase().replace('chapter', '').trim()
    );

    await job.updateProgress(40);

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    let baseUrl = url.split('/').slice(0, 5).join('/') + '/';

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    if (icon || inputDate < oneMonthAgo) {
      await page.goto(baseUrl, { timeout: 5000 });

      const imgSelection = await page.waitForSelector('img.w-full.not-prose');

      let imgSrc = '';
      if (imgSelection) {
        const data = await page.evaluate(
          (img) => ({
            src: img.src,
            title: img.alt, // or img.title if that's what you want
          }),
          imgSelection
        );

        title = data.title;
        imgSrc = data.src;
      }

      const imageReq = await fetch(imgSrc);

      const iconBuffer = await imageReq.arrayBuffer();
      let resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();

      images.push({ image: resizedImage, index: 0 });
    }

    job.log(logWithTimestamp('All Data fetch. processing data.'));
    await job.updateProgress(90);

    let currIndex = slugList.indexOf(currentChapterId);

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: baseUrl,
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: null,
      sourceId: comicId,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
    if (config.debug.verboseLogging) console.warn(err);

    //ensure only custom error messages gets sent to user
    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  } finally {
    if (page && !page.isClosed()) {
      page.removeAllListeners();
      await page.close().catch(() => {});
    }
  }

  interface ComicChapter {
    id: string;
    comicId: string;
    isFinal: boolean;
    volume: string | null;
    serial: string | null;
    dname: string;
    title: string;
    urlPath: string;
    sfw_result: boolean;
  }

  interface ComicChapterListResponse {
    data?: {
      get_comicChapterList?: {
        id: string;
        data: ComicChapter;
      }[];
    };
  }
}
