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
    const allowRequests = ['comix'];
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

      if (/\/api\/v1\/manga\/[^\/]+\/chapters/.test(u)) {
        const newUrl = new URL(u);
        newUrl.searchParams.set('limit', '100');
        newUrl.searchParams.set('order[number]', 'asc');
        request.continue({ url: newUrl.toString() });
        return;
      }

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

    const chapters: ChapterData[] = [];

    let pageCount = 1;
    while (true) {
      job.log(logWithTimestamp(`Parsing chapter data from page ${pageCount}`));
      await page.waitForSelector('li.mchap-item');

      const pageData = await page.$$eval('li.mchap-item', (items) => {
        return items.map((item) => {
          const groupName =
            item.querySelector('.mchap-row__group span')?.textContent?.trim() ?? null;

          const likesText = item.querySelector('.mchap-row__likes')?.textContent?.trim() ?? '0';

          const likes = Number(likesText.replace(/[^\d]/g, '')) || 0;

          const slug =
            item.querySelector<HTMLAnchorElement>('a.mchap-row__primary')?.href.split('/').at(-1) ??
            '';

          const chapter =
            Number(
              item.querySelector('.mchap-row__ch')?.textContent?.replace(/^Ch\./i, '').trim()
            ) ?? -1;

          return {
            groupName,
            likes,
            slug,
            chapter,
          };
        });
      });

      chapters.push(...pageData);

      const nextButton = await page.$('button.npager__nav[aria-label="Next page"]');

      if (!nextButton) {
        job.log(logWithTimestamp('No next page button found. Finished parsing chapters.'));
        break;
      }
      pageCount++;

      await Promise.all([page.waitForResponse((response) => response.ok()), nextButton.click()]);

      await page.waitForFunction(
        () => {
          return document.querySelectorAll('li.mchap-item').length > 0;
        },
        { timeout: 10000 }
      );
    }

    job.log(logWithTimestamp('Parsing Chapter Data!'));
    const { slugList, chapterTextList, currentChapterIndex } = dedupeChaptersByNumber(
      chapters,
      chapterSegment
    );

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

    job.log(chapters.map((c) => `${c.slug} (${c.chapter}) ====`).join('\n'));
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

  function dedupeChaptersByNumber(chapters: ChapterData[], currentChapter: string) {
    const best = new Map<number, ChapterData>();

    const currentChapterNumber = chapters.find((c) => c.slug === currentChapter)?.chapter;

    for (const chapter of chapters) {
      if ((best.get(chapter.chapter)?.likes ?? -1) < chapter.likes) {
        best.set(chapter.chapter, chapter);
      }
    }

    const deduped = [...best.values()].sort((a, b) => a.chapter - b.chapter);

    const slugList = deduped.map((c) => c.slug);
    const chapterTextList = deduped.map((c) => `${c.chapter}`);

    const currentChapterIndex = deduped.findIndex((c) => c.chapter === currentChapterNumber);

    return {
      slugList,
      chapterTextList,
      currentChapterIndex,
    };
  }
}

type ChapterData = {
  groupName: string | null;
  likes: number;
  slug: string;
  chapter: number;
};
