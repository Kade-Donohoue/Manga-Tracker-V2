import config from '../config.json';
import { createTimestampLogger, match } from '../util';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { Job } from 'bullmq';
import { fetchData } from '../types';

/**
 * Gets the chapter list from bato.to
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
  const logWithTimestamp = createTimestampLogger();
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultNavigationTimeout(1000); // timeout nav after 1 sec
    page.setRequestInterception(true);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
    );
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

    let allowAllRequests: boolean = false;
    const allowRequests = ['bato'];
    const forceAllow = [];
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
      '.ico',
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

      if (!match(u, allowRequests)) {
        request.abort();
        return;
      }

      if (request.resourceType() == 'image') {
        request.abort();
        return;
      }

      if (match(u, blockRequests)) {
        request.abort();
        return;
      }
      request.continue();
    });

    job.log(logWithTimestamp('Loading Chapter Page'));
    await page.goto(url, { waitUntil: 'load', timeout: 10 * 1000 });
    await job.updateProgress(20);
    job.log(logWithTimestamp('Chapter Page Loaded. Fetching Data'));

    const { slugList, chapterTextList } = await page.$$eval(
      '.nav-epis select optgroup[label="Chapters"] option',
      (options) => ({
        slugList: options.map((opt) => opt.value.trim()),
        chapterTextList: options.map((opt) => opt.textContent.replace('Chapter', '').trim()),
      })
    );

    const titleSelect = await page.$eval('h3.nav-title > a', (el: HTMLAnchorElement) => ({
      title: el.innerText || null,
      overviewUrl: el.href,
    }));
    const mangaName = titleSelect?.title;
    const overviewUrl = titleSelect?.overviewUrl;

    if (slugList.length <= 0)
      throw new Error('Manga: Issue fetching chapters! Please Contact and Admin!');

    job.log(logWithTimestamp('Chapter Data Fetched'));
    await job.updateProgress(40);

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    // var iconBuffer:Buffer|null|undefined = null
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Loading Overview Page'));
      await page.setJavaScriptEnabled(false);
      allowAllRequests = true;

      await page.goto(overviewUrl);

      job.log(logWithTimestamp('Overview page loaded'));
      await job.updateProgress(50);

      const photoElement = await page.waitForSelector('div.attr-cover > img');

      const photoUrl = await photoElement?.evaluate((el) => el.src);

      job.log(logWithTimestamp('Photo Page Fetched'));
      await job.updateProgress(60);

      job.log(logWithTimestamp('Loading Cover Image'));

      if (config.debug.verboseLogging) console.log(photoUrl);
      const iconBuffer = await fetch(photoUrl, {
        headers: {
          Host: 'img-r1.2xstorage.com',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0',
          'Accept-Language': 'en-US,en;q=0.5',
          Referer: 'https://bato.to/',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          Pragma: 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      if (config.debug.verboseLogging) console.log(iconBuffer);
      if (!iconBuffer.ok) throw new Error('Manga: Unable to fetch cover image contact an admin!');
      job.log(logWithTimestamp('Cover Image Loaded saving now!'));
      await job.updateProgress(80);

      let resizedImage = await sharp(await iconBuffer.arrayBuffer())
        .resize(480, 720)
        .toBuffer();

      images.push({ image: resizedImage, index: 0 });
    }
    await job.updateProgress(90);
    job.log(logWithTimestamp('All Data Fetched processing now'));

    if (config.debug.verboseLogging) {
      console.log(url.split('chapter-').at(-1));
      console.log(slugList);
    }

    const currIndex = slugList.indexOf(url.split('/').at(-1));

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: Unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('Done'));
    await job.updateProgress(100);
    return {
      mangaName: mangaName,
      urlBase: 'https://bato.to/chapter/',
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: null,
      sourceId: overviewUrl.split('/').at(-1),
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn('Unable to fetch data for: ' + url);
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
}
