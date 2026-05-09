import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';

const comix = 'comix-site';
const ENABLED = true;

export const comixQueue = new Queue(comix, {
  connection,
});

function check(url: string): CheckResult {
  let u: URL;

  try {
    u = new URL(url);
  } catch {
    return { ok: false, stage: 0, reason: 'Invalid URL' };
  }

  if (!u.hostname.includes('comix')) {
    return { ok: false, stage: 1, reason: 'Hostname does not match comix' };
  }

  const match = u.pathname.match(
    /^\/title\/(?<mangaId>[a-z0-9]+)(?:-[^\/]+)?\/(?<chapterId>[0-9]+)(?:-chapter-(?<chapterNumber>[0-9.]+))?$/i
  );

  if (!match?.groups) {
    return {
      ok: false,
      stage: 2,
      reason:
        'Path must match /title/{manga-id}-slug/{chapter-id}-chapter-{chapter-number} OR /title/{manga-id}/{chapter-id}',
    };
  }

  return { ok: true, stage: 3 };
}

export const comixSite: SiteQueue = {
  name: comix,
  enabled: ENABLED,
  check,
  queue: comixQueue,
  start: start,
};

let worker: Worker | null = null;
async function start() {
  if (worker) return;

  worker = new Worker(
    comix,
    async (job) => {
      const { url } = job.data;
      console.log('[Comix] processing:', url);

      return await getManga(
        job.data.url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    },
    { connection, removeOnFail: { count: 1000 }, removeOnComplete: { age: 86400, count: 1000 } }
  );
}

/**
 * Gets the chapter list from ChapManganato
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
  job: Job
): Promise<fetchData> {
  if (config.debug.verboseLogging) console.log('Comix, ' + url);

  const logWithTimestamp = createTimestampLogger();

  let page;

  try {
    job.updateProgress(0);
    job.log(logWithTimestamp('Parsing URL'));

    const parts = new URL(url).pathname.split('/').filter(Boolean);

    console.log(parts);

    const overviewUrl = `https://comix.to/title/${parts[1]}/`;

    const mangaSegment = parts[1];
    const chapterSegment = parts[2];

    const mangaId = mangaSegment.split('-')[0];
    const currentChapter = chapterSegment.split('-chapter-')[1];

    job.updateProgress(5);
    job.log(logWithTimestamp('Url Parsed.'));

    let specialFetchData = job.data.specialFetchData || '';

    if (!specialFetchData) {
      job.log(logWithTimestamp('Fetching specialFetchData from network requests'));

      const browser = await getBrowser();
      page = await browser.newPage();

      let foundUrlParam: string | null = null;

      page.on('request', (req) => {
        try {
          const reqUrl = req.url();

          if (reqUrl.includes('/api/v1/manga/') && reqUrl.includes('/chapters')) {
            const parsed = new URL(reqUrl);

            const urlParam = parsed.searchParams.get('_');

            if (urlParam) {
              foundUrlParam = urlParam;
            }
          }
        } catch {}
      });

      await page.goto(overviewUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForFunction(() => window.performance.getEntriesByType('resource').length > 0, {
        timeout: 10000,
      });

      if (!foundUrlParam) {
        throw new Error('Unable to find _url parameter from chapter request');
      }

      specialFetchData = foundUrlParam;

      job.log(logWithTimestamp(`Found specialFetchData: ${specialFetchData}`));
    }

    const chapters = await fetchAllChapters(mangaId, specialFetchData);

    job.log(logWithTimestamp('Parsing Chapter Data!'));
    const { slugList, chapterTextList } = dedupeChaptersByNumber(chapters);

    job.updateProgress(60);
    job.log(logWithTimestamp('Chapter Data Parsed! Checking cover Image Status'));

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    let title: string = job.data.mangaName || '';
    let author: string = job.data.author || '';
    let description: string = job.data.description || '';
    // var iconBuffer:Buffer|null|undefined = null
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Loading overview page for title/icon'));

      const overviewUrl = 'https://comix.to/' + parts.slice(0, -1).join('/');

      if (!page) {
        const browser = await getBrowser();
        page = await browser.newPage();
      }

      await page.goto(overviewUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const titleSelect = await page.waitForSelector('h1.mpage__title', {
        timeout: 10000,
      });

      title = (await titleSelect?.evaluate((el) => el.textContent.trim())) || 'Unknown Title';

      const imageSelect = await page.waitForSelector(
        'div.mpage__poster > div.poster > img:nth-child(1)',
        {
          timeout: 10000,
        }
      );

      const imageUrl = await imageSelect?.evaluate((el) => el.getAttribute('src'));

      if (!imageUrl) {
        throw new Error('Unable to find cover image');
      }

      job.log(logWithTimestamp('Downloading cover image'));

      const imageResponse = await fetch(imageUrl, {
        headers: {
          Referer: overviewUrl,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      if (!imageResponse.ok) {
        throw new Error('Failed to download cover image');
      }

      const iconBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();

      images.push({
        image: resizedImage,
        index: 0,
      });

      job.updateProgress(85);

      job.log(logWithTimestamp('Cover image processed'));
    }

    let currIndex = chapterTextList.indexOf(currentChapter);

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: overviewUrl,
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: specialFetchData,
      sourceId: mangaId,
      author: author,
      description: description,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
    if (config.debug.verboseLogging) console.warn(err);

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

  async function fetchAllChapters(mangaId: string, specialFetchData: string): Promise<Chapter[]> {
    let page = 1;
    let lastPage = 1;
    const allChapters: Chapter[] = [];

    job.log(logWithTimestamp(`Starting chapter fetch for manga ${mangaId}`));

    while (page <= lastPage) {
      const url = `https://comix.to/api/v1/manga/${mangaId}/chapters?limit=100&page=${page}&order[number]=asc&_=${specialFetchData}`;

      console.log(url);

      job.log(logWithTimestamp(`Fetching page ${page}/${lastPage}`));

      const res = await fetch(url, {
        method: 'GET',

        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Referer: 'https://comix.to/',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
          Origin: 'https://comix.to',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty',
        },
        credentials: 'include',
        mode: 'cors',
        redirect: 'follow',
        referrer: 'https://comix.to/',
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
      if (!res.ok) {
        job.log(logWithTimestamp(`Failed to fetch page ${page}: ${res.status} ${res.statusText}`));
        throw new Error(`Failed to fetch page ${page}`);
      }

      const data: ChaptersResponse = await res.json();
      console.log(data);

      const { items, meta } = data.result;

      lastPage = meta.lastPage;
      allChapters.push(
        ...items.map((chapter) => ({
          chapter_id: chapter.id,
          manga_id: chapter.mangaId,
          scanlation_group_id: chapter.group?.id ?? 0,
          is_official: chapter.isOfficial,
          number: chapter.number,
          name: chapter.name,
          language: chapter.language,
          volume: chapter.volume,
          votes: chapter.votes,
          created_at: 0,
          updated_at: 0,
          scanlation_group: {
            scanlation_group_id: chapter.group?.id ?? 0,
            name: chapter.group?.name ?? '',
            slug: '',
          },
        }))
      );

      const progress = 5 + Math.round(((page - 1) / lastPage) * 50);

      job.updateProgress(progress);

      job.log(
        logWithTimestamp(
          `Page ${page}/${lastPage} fetched — ` +
            `${items.length} chapters, ` +
            `${allChapters.length}/${meta.total} total`
        )
      );

      page++;
    }

    job.updateProgress(55);
    job.log(
      logWithTimestamp(
        `Finished fetching chapters for manga ${mangaId}. ` +
          `Total chapters fetched: ${allChapters.length}`
      )
    );

    return allChapters;
  }

  function dedupeChaptersByNumber(chapters: Chapter[]): {
    slugList: string[];
    chapterTextList: string[];
  } {
    const map = new Map<number, Chapter>();

    for (const chapter of chapters) {
      const existing = map.get(chapter.number);

      if (!existing || chapter.votes > existing.votes) {
        map.set(chapter.number, chapter);
      }
    }

    const deduped = Array.from(map.values()).sort((a, b) => a.number - b.number);

    const slugList = deduped.map(
      (c) => c.chapter_id.toString() + '-chapter-' + c.number.toString()
    );
    const chapterTextList = deduped.map((c) => c.number.toString());

    return { slugList, chapterTextList };
  }
}

interface ScanlationGroup {
  scanlation_group_id: number;
  name: string;
  slug: string;
}

interface Chapter {
  chapter_id: number;
  manga_id: number;
  scanlation_group_id: number;
  is_official: boolean | 0 | 1;
  number: number;
  name: string;
  language: string;
  volume: number;
  votes: number;
  created_at: number; // unix timestamp
  updated_at: number; // unix timestamp
  scanlation_group: ScanlationGroup;
}

interface ApiGroup {
  id: number;
  name: string;
}

interface ApiChapter {
  id: number;
  mangaId: number;
  number: number;
  volume: number;
  name: string;
  language: string;
  isOfficial: boolean;
  votes: number;
  createdAtFormatted: string;
  group: ApiGroup | null;
  creator: unknown;
  url: string;
}

interface Meta {
  total: number;
  perPage: number;
  page: number;
  lastPage: number;
  from: number;
  to: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ChaptersResult {
  items: ApiChapter[];
  meta: Meta;
}

interface ChaptersResponse {
  status: string;
  result: ChaptersResult;
}
