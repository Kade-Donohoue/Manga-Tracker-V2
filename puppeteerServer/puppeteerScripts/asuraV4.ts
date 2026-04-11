import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';

const Asura = 'asura-site';
const ENABLED = true;

export const asuraQueue = new Queue(Asura, {
  connection,
});

function check(url: string): CheckResult {
  let u: URL;

  try {
    u = new URL(url);
  } catch {
    return { ok: false, stage: 0, reason: 'Invalid URL' };
  }

  if (!u.hostname.includes('asuracomic') && !u.hostname.includes('asurascans')) {
    return { ok: false, stage: 1, reason: 'Hostname does not match asuracomic.net' };
  }

  const match = u.pathname.match(/\/chapter\/\d+/i);
  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason: 'Path must match /chapter/{id}',
    };
  }

  return { ok: true, stage: 3 };
}

export const asuraSite: SiteQueue = {
  name: Asura,
  enabled: ENABLED,
  check,
  queue: asuraQueue,
  start: start,
};

let worker: Worker | null = null;
async function start() {
  if (worker) return;

  worker = new Worker(
    Asura,
    async (job) => {
      const url = (job.data.url as string).replace(
        'https://asuracomic.net/series/',
        'https://asurascans.com/comics/'
      );
      console.log('[Asura] processing:', url);

      return await getManga(
        url,
        job.data.getIcon,
        job.data.update,
        job.data.coverIndexes,
        job.data.maxSavedAt,
        job
      );
    },
    {
      connection,
      limiter: { max: 1, duration: 2000 },
      removeOnFail: { count: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
    }
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
  if (config.debug.verboseLogging) console.log('Asura');

  const logWithTimestamp = createTimestampLogger();

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(1000); // timeout nav after 1 sec
    page.setRequestInterception(true);

    let allowAllRequests: boolean = false;
    const allowRequests = ['asura'];
    const bypassAllowReqs = ['_astro', 'asura-images/covers/'];
    const blockRequests = [
      '.css',
      'facebook',
      'fbcdn.net',
      'bidgear',
      '.png',
      '.svg',
      'disqus',
      '.js',
      '.woff',
      '/api/',
    ];
    page.on('request', (request) => {
      if (allowAllRequests) return request.continue();

      const u = request.url();
      if (!match(u, allowRequests)) {
        request.abort();
        return;
      }

      if (match(u, bypassAllowReqs)) {
        request.continue();
        return;
      }

      if (request.resourceType() == 'image') {
        request.abort();
        return;
      }

      if (request.resourceType() == 'fetch') {
        request.abort();
        return;
      }

      if (match(u, blockRequests)) {
        request.abort();
        return;
      }
      request.continue();
    });

    job.log(logWithTimestamp('Starting Loading Chapter'));
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 10 * 1000 });
    await job.updateProgress(20);
    job.log(logWithTimestamp('Chapter Loaded, starting retrial of overview URL and chapterData'));

    await page.click('div.select-none');

    await page.click('div.relative > button.w-full');

    const rawData = await page.$$eval('div.absolute:nth-child(2) a', (anchors) =>
      anchors
        .map((a) => ({
          href: a.href,
          text: a.innerText.trim().match(/\d+(\.\d+)?/g)?.[0] || 'Unknown',
        }))
        .reverse()
    );

    const chapterNumList = rawData.map((chapter) => chapter.href.split('/').at(-1));
    const chapterTextData = rawData.map((chapter) => chapter.text.replace('Chapter', '').trim());

    await job.updateProgress(30);

    const title = await page.$eval('div.truncate:nth-child(1)', (el) => el.innerHTML);

    const overViewURL = await page.$eval('div > a.gap-3', (el) => el.href);
    if (!overViewURL) throw new Error('Manga: Unable to get base URL!');

    job.log(logWithTimestamp(overViewURL));
    await job.updateProgress(35);

    job.log(logWithTimestamp('Data Retried! processing Data'));
    job.log(logWithTimestamp('Chapter Data Processed'));

    if (chapterNumList.length == 0)
      throw new Error('Manga: Issue fetching Chapters, no data was found!');

    if (config.debug.verboseLogging) {
      console.log(overViewURL);
      console.log(chapterNumList, chapterTextData);
      console.log(title);
    }
    job.log(logWithTimestamp('Info Gathered'));

    await job.updateProgress(40);

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Starting Icon Fetch'));

      const photoSelect = await page.waitForSelector('img.rounded-lg', { timeout: 1000 });
      const photo = await photoSelect?.evaluate((el) => el.getAttribute('src'));

      // console.log(photo)
      job.log(logWithTimestamp('Going to Photo'));
      allowAllRequests = true;
      const icon = await page.goto(photo!, { timeout: 10000 });
      await job.updateProgress(60);

      let iconBuffer = await icon?.buffer();
      let resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();

      images.push({ image: resizedImage, index: 0 });
    }
    job.log(logWithTimestamp('Data fetched'));
    await job.updateProgress(80);

    const currIndex = chapterNumList.indexOf(url.split('/chapter/').at(-1));

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: overViewURL + '/chapter/',
      slugList: chapterNumList.join(','),
      chapterTextList: chapterTextData.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: 'Pain Site',
      sourceId: overViewURL.split('-').at(-1) || 'Unknown',
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}, setting 10 second timeout`);
    // await asuraQueue.rateLimit(10000);
    if (config.debug.verboseLogging) console.warn(err);

    if (err instanceof Error) {
      //ensure only custom error messages gets sent to user
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
