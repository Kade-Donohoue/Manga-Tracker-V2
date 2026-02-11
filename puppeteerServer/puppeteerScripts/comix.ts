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

  const match = u.pathname.match(/title\/([^-\/]+)-[^\/]+\/([0-9]+)-chapter-[0-9]+/i);
  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason: 'Path must match /title/{manga-id}-manga-slug/{chapter-id}-chapter-{chapter-number}',
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

    const mangaSegment = parts[1];
    const chapterSegment = parts[2];

    const mangaId = mangaSegment.split('-')[0];
    const currentChapter = chapterSegment.split('-chapter-')[1];

    job.updateProgress(5);
    job.log(logWithTimestamp('Url Parsed.'));

    const chapters = await fetchAllChapters(mangaId);

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
    // var iconBuffer:Buffer|null|undefined = null
    if (icon || inputDate < oneMonthAgo) {
      parts.pop();
      const overviewResponse = await fetch('https://comix.to/' + parts.join('/'));
      const overviewHtml = await overviewResponse.text();
      console.log(overviewHtml);

      const browser = await getBrowser();
      page = await browser.newPage();

      page.setContent(overviewHtml, { waitUntil: 'domcontentloaded' });

      const titleSelect = await page.waitForSelector('h1.title');
      title = await titleSelect?.evaluate((el) => el.textContent, titleSelect);
      console.log(title);
      const photoSelect = await page.waitForSelector('div.poster > div > img', { timeout: 1000 });
      const photo = await photoSelect?.evaluate((el) => el.getAttribute('src'));

      const icon = await page.goto(photo!, { timeout: 10000 });
      await job.updateProgress(85);

      let iconBuffer = await icon?.buffer();
      let resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();

      images.push({ image: resizedImage, index: 0 });
    }

    let currIndex = chapterTextList.indexOf(currentChapter);

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: `https://comix.to/title/${mangaId}/`,
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: mangaId,
      sourceId: mangaId,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
    if (config.debug.verboseLogging) console.warn(err);

    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  } finally {
    if (page && !page.isClosed()) {
      page.removeAllListeners();
      await page.close().catch(() => {});
    }
  }

  async function fetchAllChapters(mangaId: string): Promise<Chapter[]> {
    let page = 1;
    let lastPage = 1;
    const allChapters: Chapter[] = [];

    job.log(logWithTimestamp(`Starting chapter fetch for manga ${mangaId}`));

    while (page <= lastPage) {
      const url =
        `https://comix.to/api/v2/manga/${mangaId}/chapters` +
        `?limit=100&page=${page}&order[number]=asc`;

      console.log(url);

      job.log(logWithTimestamp(`Fetching page ${page}/${lastPage}`));

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch page ${page}`);
      }

      const data: ChaptersResponse = await res.json();
      console.log(data);

      const { items, pagination } = data.result;

      lastPage = pagination.last_page;
      allChapters.push(...items);

      const progress = 5 + Math.round(((page - 1) / lastPage) * 50);

      job.updateProgress(progress);

      job.log(
        logWithTimestamp(
          `Page ${page}/${lastPage} fetched — ` +
            `${items.length} chapters, ` +
            `${allChapters.length}/${pagination.total} total`
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

    const slugList = deduped.map((c) => c.chapter_id.toString());
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

interface Pagination {
  count: number;
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  from: number;
  to: number;
}

interface ChaptersResult {
  items: Chapter[];
  pagination: Pagination;
}

interface ChaptersResponse {
  status: number;
  result: ChaptersResult;
}
