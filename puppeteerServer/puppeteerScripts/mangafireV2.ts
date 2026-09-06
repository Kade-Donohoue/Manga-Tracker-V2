import config from '../config.json';
import { createTimestampLogger, match } from '../util';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';

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
    /^\/(?:read\/[^/]+\/[^/]+\/chapter-\d+(?:\.\d+)?|title\/[^/]+\/\d+)$|\/title\/[^/]+\/chapter\/[^/]+/i
  );

  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason:
        'Path must match /read/{slug}.{id}/{lang}/chapter-{chapterNum} or /title/{id}-{slug}/{chapterId} or /title/{id}-{slug}/chapter/{chapterId}',
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
    await page.route('**/*', async (route) => {
      if (allowAllRequests) {
        await route.continue();
        return;
      }

      const u = route.request().url();

      if (match(u, forceAllow)) {
        await route.continue();
        return;
      }

      if (!match(u, allowRequests)) {
        await route.abort();
        return;
      }

      if (route.request().resourceType() === 'image') {
        await route.abort();
        return;
      }

      if (route.request().resourceType() === 'fetch') {
        await route.abort();
        return;
      }

      if (match(u, blockRequests)) {
        await route.abort();
        return;
      }

      await route.continue();
    });

    const mangaId = url.match(/\/title\/([a-zA-Z0-9]+)-/)?.[1];

    if (!mangaId) throw new Error('Manga: Unable to get Manga ID!');

    let chapterData = await getChapterList(mangaId, job);
    if (!chapterData) throw new Error('Manga: Unable to fetch Chapter List!');

    const titleDataResp = await fetch(
      signMangafireUrl(`https://mangafire.to/api/titles/${mangaId}`),
      {
        headers: {
          Accept: 'application/json',
          Referer: `https://mangafire.to/title/${mangaId}`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      }
    );

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
      specialFetchData: 'N/A',
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
        signMangafireUrl(
          `https://mangafire.to/api/titles/${siteMangaId}/chapters?language=en&sort=number&order=asc&limit=200&page=${currentPage}`
        ),
        {
          headers: {
            Accept: 'application/json',
            Referer: `https://mangafire.to/title/${siteMangaId}`,
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        }
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

const TABLE_1 =
  'yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A==';

const KEY_1 = '0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA=';

const TABLE_2 =
  'IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA==';

const KEY_2 = 'AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ==';

const TABLE_3 =
  'NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ==';

const KEY_3 = 'DELOJgPsVaCcblDtTGMdHzM=';

const stages: {
  table: Uint8Array;
  key: Uint8Array;
  iv: number;
}[] = [
  {
    table: Buffer.from(TABLE_1, 'base64'),
    key: Buffer.from(KEY_1, 'base64'),
    iv: 0x5a,
  },
  {
    table: Buffer.from(TABLE_2, 'base64'),
    key: Buffer.from(KEY_2, 'base64'),
    iv: 0x35,
  },
  {
    table: Buffer.from(TABLE_3, 'base64'),
    key: Buffer.from(KEY_3, 'base64'),
    iv: 0xba,
  },
];

function encryptStage(
  data: Uint8Array,
  table: Uint8Array,
  key: Uint8Array,
  iv: number
): Uint8Array {
  const out = new Uint8Array(data.length);
  let prev = iv;

  for (let i = 0; i < data.length; i++) {
    prev = table[(data[i] ^ key[i % key.length] ^ prev) & 0xff];

    out[i] = prev;
  }

  return out;
}

function signVrf(path: string): string {
  let data: Uint8Array = Buffer.from(path, 'utf8');

  for (const stage of stages) {
    data = encryptStage(data, stage.table, stage.key, stage.iv);
  }

  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function signMangafireUrl(inputUrl: string): string {
  const url = new URL(inputUrl);

  // Only sign /api/ requests, matching the Kotlin interceptor.
  if (!url.pathname.startsWith('/api/')) {
    return inputUrl;
  }

  // Collect every existing query parameter.
  const params = Array.from(url.searchParams.entries());

  // Kotlin's implementation sorts by parameter name.
  params.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  // Build the canonical URL that gets signed.
  let signedPath = url.pathname.replace(/^\/api/, '');

  if (params.length > 0) {
    let lastKey = '';
    let index = 0;

    const query = params
      .map(([key, value]) => {
        let newKey = key;

        if (key.endsWith('[]')) {
          if (lastKey !== key) {
            index = 0;
          }

          lastKey = key;
          newKey = key.replace('[]', `[${index++}]`);
        }

        return `${newKey}=${value}`;
      })
      .join('&');

    signedPath += `?${query}`;
  }

  const vrf = signVrf(signedPath);

  // Rebuild the original URL, replacing any existing query string
  // with the original parameters + vrf.
  const outputUrl = new URL(url.origin + url.pathname);

  for (const [key, value] of params) {
    outputUrl.searchParams.append(key, value);
  }

  outputUrl.searchParams.set('vrf', vrf);

  console.log(`Signed URL: ${outputUrl.toString()}`);
  return outputUrl.toString();
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
