import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';
import { Page } from 'puppeteer';

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
  const browser = await getBrowser();
  let page = await browser.newPage();

  try {
    let allowAllRequests: boolean = false;
    const allowRequests = ['comix', 'challenges.cloudflare.com'];
    const forceAllow = ['/api/v1'];
    const blockRequests = [
      '.css',
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

      // console.log('Request URL:', u);
      // if (/\/api\/v1\/manga\/[^\/]+\/chapters/.test(u)) {
      //   console.log('Modifying request to include limit and order parameters:', u);
      //   const newUrl = new URL(u);
      //   newUrl.searchParams.set('limit', '100');
      //   newUrl.searchParams.set('order[number]', 'asc');
      //   request.continue({ url: newUrl.toString() });
      //   return;
      // }

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

    job.updateProgress(0);
    job.log(logWithTimestamp('Parsing URL'));

    const parts = new URL(url).pathname.split('/').filter(Boolean);

    console.log(parts);

    const overviewUrl = `https://comix.to/title/${parts[1]}/`;

    const mangaSegment = parts[1];
    const chapterSegment = parts[2];

    const mangaId = mangaSegment.split('-')[0];

    job.updateProgress(5);
    job.log(logWithTimestamp('Url Parsed.'));

    await page.goto(overviewUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    const rawChapters = await getChapterList(page, mangaId);

    const { slugList, chapterTextList, currentChapterIndex } = dedupeChapters(rawChapters, url);

    job.log(logWithTimestamp('Chapter List Fetched' + JSON.stringify(rawChapters)));
    // throw new Error('Not Implemented Yet');

    job.log(logWithTimestamp('Parsing Chapter Data!'));

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

      await page.goto(overviewUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      if (!author) {
        author = await page.evaluate(() => {
          const blocks = Array.from(document.querySelectorAll('div.mpage__detail'));

          const authorBlock = blocks.find(
            (b) => b.querySelector('dt')?.textContent?.trim() === 'Authors'
          );

          if (!authorBlock) return '';

          return Array.from(authorBlock.querySelectorAll('dd a'))
            .map((a) => (a.textContent ?? '').trim())
            .filter(Boolean)
            .join(',');
        });
      }

      if (!description) {
        description = await page
          .$eval('.mpage__desc', (el) => (el.textContent ?? '').trim())
          .catch(() => '');
      }

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

    if (currentChapterIndex == -1 && !ignoreIndex) {
      job.log(
        logWithTimestamp(
          'Unable to find current chapter in chapter list data: ' +
            currentChapterIndex +
            ' - ' +
            chapterSegment
        )
      );
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: overviewUrl,
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currentChapterIndex,
      images: images,
      specialFetchData: '',
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

  async function getChapterList(
    page: Page,
    mangaId: string,
    latestChapterId?: number
  ): Promise<ComixChapter[]> {
    return page.evaluate(
      async ({ mangaId, latestChapterId }) => {
        // Same selector used by the Comix extension.
        const mainScript = document.querySelector<HTMLScriptElement>(
          'script[type="module"][src*="/dist/main-"]'
        );

        const mainScriptUrl = mainScript?.src;

        if (!mainScriptUrl) {
          throw new Error('Could not find main bundle');
        }

        console.log('[Comix] Main bundle:', mainScriptUrl);

        // Fetch the main bundle.
        const mainResponse = await fetch(mainScriptUrl);

        if (!mainResponse.ok) {
          throw new Error(
            `Could not load main bundle: ${mainResponse.status} ${mainResponse.statusText}`
          );
        }

        const mainJavaScript = await mainResponse.text();

        // Same regex used by the extension.
        const environmentFile = mainJavaScript.match(/from\s*["']\.\/(env-[^"']+\.js)["']/)?.[1];

        if (!environmentFile) {
          throw new Error('Could not find environment bundle');
        }

        const environmentUrl = new URL(environmentFile, mainScriptUrl).href;

        console.log('[Comix] Environment bundle:', environmentUrl);

        // Dynamically import the environment module.
        const environment = await import(environmentUrl);

        // Find the exported object containing chapters().
        const mangaApi = Object.values(environment).find(
          (value: unknown) =>
            value &&
            typeof value === 'object' &&
            'chapters' in value &&
            typeof (value as { chapters?: unknown }).chapters === 'function'
        ) as
          | {
              chapters: (
                mangaId: string,
                options: {
                  page: number;
                  limit: number;
                  order: {
                    number: 'desc' | 'asc';
                  };
                }
              ) => Promise<ChapterResponse>;
            }
          | undefined;

        if (!mangaApi) {
          throw new Error('Could not find manga API');
        }

        console.log('[Comix] Found manga API');

        const items: ComixChapter[] = [];

        let chapterPage = 1;

        // The extension has a MAX_CHAPTER_PAGES limit.
        const MAX_CHAPTER_PAGES = 100;

        while (chapterPage <= MAX_CHAPTER_PAGES) {
          console.log(`[Comix] Fetching chapter page ${chapterPage}`);

          const response = await mangaApi.chapters(mangaId, {
            page: chapterPage,
            limit: 100,
            order: {
              number: 'desc',
            },
          });

          const pageItems = response?.items;

          if (!Array.isArray(pageItems) || pageItems.length === 0) {
            break;
          }

          items.push(...pageItems);

          // Stop once we've reached the chapter we already know about.
          if (
            latestChapterId != null &&
            pageItems.some((item) => Number(item.id) === Number(latestChapterId))
          ) {
            break;
          }

          const meta = response.meta ?? response.pagination ?? {};

          const lastPage = meta.lastPage ?? meta.last_page ?? chapterPage;

          if (!(meta.hasNext || chapterPage < lastPage)) {
            break;
          }

          chapterPage++;
        }

        return items;
      },
      {
        mangaId,
        latestChapterId: latestChapterId ?? null,
      }
    );
  }

  function dedupeChapters(chapters: ComixChapter[], currentUrl: string): DedupeChapterResult {
    const bestByNumber = new Map<number, ComixChapter>();

    // First determine the best chapter for every chapter number.
    for (const chapter of chapters) {
      const chapterNumber = Number(chapter.number);

      if (!Number.isFinite(chapterNumber)) {
        continue;
      }

      const existing = bestByNumber.get(chapterNumber);

      if (!existing) {
        bestByNumber.set(chapterNumber, chapter);
        continue;
      }

      const votes = Number(chapter.votes ?? 0);
      const existingVotes = Number(existing.votes ?? 0);

      if (votes > existingVotes) {
        bestByNumber.set(chapterNumber, chapter);
      }
    }

    // Sort chapters ascending by chapter number.
    const dedupedChapters = Array.from(bestByNumber.values()).sort(
      (a, b) => Number(a.number) - Number(b.number)
    );

    // Extract the last part of a URL's path.
    const getSlug = (url: string): string => {
      const parsed = new URL(url, currentUrl);
      const parts = parsed.pathname.split('/').filter(Boolean);

      return parts.at(-1) ?? '';
    };

    const currentSlug = getSlug(currentUrl);

    let currentChapterIndex = -1;
    console.log('Current slug:', currentSlug);
    console.log(
      'tested slugs:',
      dedupedChapters.map((chapter) => getSlug(chapter.url ?? ''))
    );

    const exactIndex = dedupedChapters.findIndex(
      (chapter) => chapter.url && getSlug(chapter.url) === currentSlug
    );

    if (exactIndex !== -1) {
      currentChapterIndex = exactIndex;
    } else {
      const originalCurrentChapter = chapters.find(
        (chapter) => chapter.url && getSlug(chapter.url) === currentSlug
      );

      if (originalCurrentChapter?.number != null) {
        const currentNumber = Number(originalCurrentChapter.number);

        currentChapterIndex = dedupedChapters.findIndex(
          (chapter) => Number(chapter.number) === currentNumber
        );
      }
    }

    return {
      slugList: dedupedChapters.map((chapter) => getSlug(chapter.url ?? '')),

      chapterTextList: dedupedChapters.map((chapter) => String(chapter.number)),

      currentChapterIndex,
    };
  }
}

interface ComixChapter {
  id: number | string;
  number?: number | string;
  title?: string;
  slug?: string;
  url: string;
  votes?: number;
  isOfficial?: boolean;
  createdAtFormatted?: string;
  [key: string]: unknown;
}

interface ChapterResponse {
  items?: ComixChapter[];
  meta?: {
    hasNext?: boolean;
    lastPage?: number;
    last_page?: number;
    [key: string]: unknown;
  };
  pagination?: {
    hasNext?: boolean;
    lastPage?: number;
    last_page?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface DedupeChapterResult {
  slugList: string[];
  chapterTextList: string[];
  currentChapterIndex: number;
}
