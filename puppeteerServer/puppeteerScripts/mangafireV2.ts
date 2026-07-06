import config from '../config.json';
import { createTimestampLogger, match } from '../util';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';
import { ElementHandle } from 'puppeteer';

const Mangafire = 'Mangafire-site';
const ENABLED = true;

let mangaFireLimiter = config.updateSettings.intitalMangaFire
  ? { max: 1, duration: 2000 }
  : { max: config.rateLimits.mangaFireMax, duration: config.rateLimits.mangaFireDuration };

export const mangafireQueue = new Queue(Mangafire, {
  connection,
});

function check(url: string): CheckResult {
  let u: URL;

  try {
    u = new URL(url);
  } catch {
    return { ok: false, stage: 0, reason: 'Invalid URL' };
  }

  if (!u.hostname.includes('mangafire.to')) {
    return { ok: false, stage: 1, reason: 'Hostname does not match mangafire.to' };
  }

  const match = u.pathname.match(
    /^\/(?:read\/[^/]+\/[^/]+\/chapter-\d+(?:\.\d+)?|title\/[^/]+\/\d+)$/i
  );

  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason:
        'Path must match /read/{slug}.{id}/{lang}/chapter-{chapterNum} or /title/{id}-{slug}/{chapterId}',
    };
  }

  return { ok: true, stage: 3 };
}

export const mangafireSite: SiteQueue = {
  name: Mangafire,
  enabled: ENABLED,
  check,
  queue: mangafireQueue,
  start: start,
};

let worker: Worker | null = null;
async function start() {
  if (worker) return;

  worker = new Worker(
    Mangafire,
    async (job) => {
      const { url } = job.data;
      console.log('[Mangafire] processing:', url);

      const newUrl = job.data.url.replace(
        /^https:\/\/mangafire\.to\/read\/([^.]+)\.([a-zA-Z0-9]+)\/[^/]+\/chapter-\d+(?:\.\d+)?$/,
        'https://mangafire.to/title/$2-$1/1'
      );

      return await getManga(
        newUrl,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job.data.specialFetchData,
        job
      );
    },
    {
      connection,
      limiter: mangaFireLimiter,
      removeOnFail: { count: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
    }
  );
}

/**
 * Fetches Data from mangaFire
 * @param url: Chapter URL of a manga from ChapManganato.
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
  specialFetchData: string,
  job: Job
): Promise<fetchData> {
  const logWithTimestamp = createTimestampLogger();
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(1000); // timeout nav after 1 sec
    page.setRequestInterception(true);
    const client = await page.target().createCDPSession();

    await client.send('Network.setUserAgentOverride', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      userAgentMetadata: {
        brands: [
          { brand: 'Chromium', version: '141' },
          { brand: 'Google Chrome', version: '141' },
        ],
        fullVersion: '141.0.0.0',
        platform: 'Windows',
        platformVersion: '10.0.0',
        architecture: 'x86',
        model: '',
        mobile: false,
      },
    });
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

    let allowAllRequests: boolean = false;
    const allowRequests = ['mangafire'];
    const forceAllow = ['ajax', '/assets/t2/min/scripts.js'];
    const blockRequests = [
      '.css',
      '.js',
      'facebook',
      'fbcdn.net',
      'bidgear',
      '.png',
      '.jpg',
      '.svg',
      '.webp',
    ];
    page.on('request', (request) => {
      if (allowAllRequests) {
        request.continue();
        return;
      }

      const u = request.url();

      if (match(u, forceAllow)) {
        request.continue();
        return;
      }

      if (match(u, blockRequests)) {
        request.abort();
        return;
      }

      if (!match(u, allowRequests)) {
        request.abort();
        return;
      }

      if (request.resourceType() == 'image') {
        request.abort();
        return;
      }

      request.continue();
    });

    const mangaId = url.match(/\/title\/([a-zA-Z0-9]+)-/)?.[1];

    if (!mangaId) throw new Error('Manga: Unable to get Manga ID!');

    let chapterData = await getChapterList(mangaId, job);
    if (!chapterData) throw new Error('Manga: Unable to fetch Chapter List!');

    const titleDataResp = await fetch(`https://mangafire.to/api/titles/${mangaId}`);

    const titleData: MangaResponse = await titleDataResp.json();

    if (config.debug.verboseLogging) console.log(chapterData);

    await job.log(logWithTimestamp('Finished Fetching Chapter Data. Proccessing!'));
    await job.updateProgress(20);

    const mangaName = titleData.data.title;

    if (config.debug.verboseLogging) console.log(chapterData);

    job.log(logWithTimestamp('Chapter Data Fetched'));
    await job.updateProgress(40);

    let author = titleData.data.authors?.[0]?.title || '';
    let description = titleData.data.synopsisHtml || '';

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }
    const pullCoverImages = icon || config.updateSettings.refetchImgs || inputDate < oneMonthAgo;

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    if (!job.data.update || pullCoverImages) {
      job.log(logWithTimestamp('Loading Volume html'));
      await page.setJavaScriptEnabled(false);

      try {
        job.log(logWithTimestamp(`Fetching image`));
        const res = await fetch(titleData.data.poster.large, { signal: AbortSignal.timeout(2000) });

        if (res.ok) {
          const iconBuffer = await res.arrayBuffer();

          const resizedImage: Buffer<ArrayBufferLike> = await sharp(iconBuffer)
            .resize(480, 720)
            .toBuffer();

          images.push({ image: resizedImage, index: 0 });
          job.log(logWithTimestamp(`Image processed successfully`));
        }
      } catch (err) {
        job.log(logWithTimestamp(`Error processing image: ${(err as Error).message}`));
      }
    }
    await job.updateProgress(90);
    job.log(logWithTimestamp('All Data Fetched processing now'));

    if (config.debug.verboseLogging) {
      console.log(url.split('chapter-').at(-1));
      console.log(chapterData);
    }

    const currIndex = chapterData.slugList.indexOf(url.split('/').at(-1) || '-1');

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: Unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('Done'));
    await job.updateProgress(100);
    return {
      mangaName: mangaName,
      urlBase: 'https://mangafire.to' + titleData.data.url + '/',
      slugList: chapterData.slugList.join(','),
      chapterTextList: chapterData.chapterTextList.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: specialFetchData,
      sourceId: titleData.data.id.toString() || 'Unknown',
      author: author,
      description: description,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn('Unable to fetch data for: ' + url);
    if (config.debug.verboseLogging) console.warn(err);

    //ensure only custom error messages gets sent to user
    if (err instanceof Error) {
      if (err.message.startsWith('Manga:')) throw new Error(err.message);
    }
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  } finally {
    if (page && !page.isClosed()) {
      page.removeAllListeners();
      await page.close().catch(() => {});
    }
  }
}

async function getChapterList(
  siteMangaId: string,
  job: Job
): Promise<{ slugList: string[]; chapterTextList: string[] }> {
  const logWithTimestamp = createTimestampLogger();

  const chapterList: Chapter[] = [];
  let morePages = true;
  let currentPage = 1;

  try {
    while (morePages) {
      const chapterResp = await fetch(
        `https://mangafire.to/api/titles/${siteMangaId}/chapters?language=en&sort=number&order=asc&limit=200&page=${currentPage}`
      );

      const chapterData: ChapterResponse = await chapterResp.json();

      morePages = chapterData.meta.hasNext;
      currentPage++;

      chapterData.items.forEach((chapter) => {
        chapterList.push(chapter);
      });
    }
  } catch (err) {
    job.log(logWithTimestamp(`Error fetching chapter list: ${(err as Error).message}`));
    throw new Error('Unable to fetch chapter list!');
  }

  return dedupeChaptersByNumber(chapterList);
}

// Dedupe chapters by number, keeping the latest createdAt for each chapter number
function dedupeChaptersByNumber(chapters: Chapter[]): {
  slugList: string[];
  chapterTextList: string[];
} {
  const map = new Map<number, Chapter>();

  for (const chapter of chapters) {
    const existing = map.get(chapter.number);

    if (!existing || chapter.createdAt > existing.createdAt) {
      map.set(chapter.number, chapter);
    }
  }

  const deduped = Array.from(map.values()).sort((a, b) => a.number - b.number);

  const slugList = deduped.map((c) => c.id.toString());
  const chapterTextList = deduped.map((c) => c.number.toString());

  return { slugList, chapterTextList };
}

interface ChapterResponse {
  items: Chapter[];
  meta: PaginationMeta;
}

interface Chapter {
  id: number;
  number: number;
  name: string;
  language: string;
  type: string;
  createdAt: number;
}

interface PaginationMeta {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  from: number;
  to: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MangaResponse {
  data: Manga;
}

export interface Manga {
  id: number;
  hid: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  poster: Poster;
  latestChapter: number;
  year: number;
  rank: number;
  chapterUpdatedAt: string;
  url: string;
  synopsisHtml: string;
  altTitles: string[];
  rating: number;
  ratingCount: number;
  chapterTotal: number;
  follows: number;
  viewsTotal: number;
  languages: string[];
  genres: Tag[];
  themes: Tag[];
  demographics: Tag[];
  authors: Tag[];
  artists: Tag[];
}

export interface Poster {
  small: string;
  medium: string;
  large: string;
}

export interface Tag {
  id: number;
  title: string;
}
