import config from '../config.json';
import { createTimestampLogger, match } from '../util';
import sharp from 'sharp';
import { getBrowser, mangaFireQueue } from '../jobQueue';
import { Job, Worker } from 'bullmq';
import { fetchData } from '../types';

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
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

    let allowAllRequests: boolean = false;
    const allowRequests = ['mangafire'];
    const forceAllow = ['ajax', 'mfcdn.cc/assets/t2/min/scripts.js'];
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

    const urlBase = url.split(/\/[a-z]{2}\/chapter/i)[0];
    const mangaId = urlBase.split('.').at(-1);

    job.log(logWithTimestamp('Starting Optimistic Fetch!'));
    let chapterResp = await fetch(
      `https://mangafire.to/ajax/read/${mangaId}/chapter/en?vrf=${specialFetchData}`,
      {
        signal: AbortSignal.timeout(2000),
      }
    );

    if (chapterResp.status === 429 || chapterResp.status === 1015) {
      let retryDelay = (parseInt(chapterResp.headers.get('retry-after')) || 5) * 1000;
      page.removeAllListeners();
      await page.close();

      console.warn(
        'MangaFire Rate Limit Hit, consider adjusting base delay if this appears frequently!'
      );
      job.log(logWithTimestamp(`Rate Limit Hit. setting rate limit to ${retryDelay}ms`));
      await mangaFireQueue.rateLimit(retryDelay);

      throw Worker.RateLimitError();
    }

    job.log(logWithTimestamp('Optimistic fetch finished with code: ' + chapterResp.status));

    let chapterData: any;
    if (chapterResp.status === 403 || !specialFetchData) {
      job.log(logWithTimestamp('Optomistic fetch failed. Refteching VFR'));

      const ajaxRequestPromise = page.waitForRequest(
        (req) => req.url().includes('/ajax/read/'),
        { timeout: 10_000 } // fail fast if not triggered
      );

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => null);

      const ajaxRequest = await ajaxRequestPromise.catch(() => null);
      if (!ajaxRequest) throw new Error('Manga: No ajax/read/ request detected!');

      const chapterApiUrl = new URL(ajaxRequest.url());
      const vrf = chapterApiUrl.searchParams.get('vrf');
      job.log(logWithTimestamp(`Found vrf: ${vrf}`));

      specialFetchData = vrf;

      await page.setContent('', { waitUntil: 'domcontentloaded' }).catch(() => null);

      if (!specialFetchData) throw new Error('Manga: Unable to get VFR!');
      job.log(logWithTimestamp('Loading Chapter Data'));
      chapterResp = await fetch(
        `https://mangafire.to/ajax/read/${mangaId}/chapter/en?vrf=${specialFetchData}`,
        {
          signal: AbortSignal.timeout(2000),
        }
      );
    }

    if (!chapterResp.ok) throw new Error('Manga: Unable to fetch Chapter List!');

    chapterData = await chapterResp.json();

    if (config.debug.verboseLogging) console.log(chapterData);

    await job.log(logWithTimestamp('Finished Fetching Chapter Data. Proccessing!'));
    await job.updateProgress(20);

    const mangaName = chapterData.result.title_format.split('TYPE_NUM')[0].trim();
    const chapterDataHTML = chapterData.result.html;

    // console.log(mangaName);

    await page.setContent(chapterDataHTML, { waitUntil: 'domcontentloaded' });

    const chapterNumbers = (
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('ul > li > a'));
        return links.map((link) => link.getAttribute('data-number'));
      })
    ).reverse();

    if (config.debug.verboseLogging) console.log(chapterNumbers);

    if (chapterNumbers.length <= 0)
      throw new Error('Manga: Issue fetching chapters! Please Contact and Admin!');

    job.log(logWithTimestamp('Chapter Data Fetched'));
    await job.updateProgress(40);

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

      const volumeResp = await fetch(`https://mangafire.to/ajax/manga/${mangaId}/volume/en`, {
        signal: AbortSignal.timeout(2000),
      });

      if (volumeResp.ok) {
        const volumeData = await volumeResp.json();
        if (config.debug.verboseLogging) console.log(volumeData);
        await page.setContent(volumeData.result, { waitUntil: 'domcontentloaded' });

        let photoUrls =
          (await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.poster img'))
              .map((img) => img.getAttribute('src'))
              .filter((src) => src && !src.includes('no-image')); //Prevents Thier Fallback Image From showing up
          })) ?? [];

        if (photoUrls?.length <= 0) {
          job.log(logWithTimestamp('Using Alternate Cover Image Fetch'));
          let overviewResp = await page.goto(urlBase.replace('read', 'manga'));

          const overviewStatus = overviewResp.status();
          if (overviewStatus === 1015 || overviewStatus === 429 || overviewStatus === 403) {
            page.removeAllListeners();
            await page.close();

            console.warn(
              'MangaFire Rate Limit Hit on Cover Response, consider adjusting base delay if this appears frequently! Skipping Cover Image Fetch'
            );
          } else {
            const imgElement = await page.waitForSelector('div.poster > div > img');

            const imgSrc = await imgElement.evaluate((el) => el.getAttribute('src'));
            if (imgSrc) {
              photoUrls.push(imgSrc);
            }
          }
        }

        photoUrls.reverse();

        if (config.debug.verboseLogging) console.log(photoUrls);

        let startingPoint =
          config.updateSettings.refetchImgs || icon ? 0 : Math.max(0, coverIndexes?.length - 1);
        job.log(
          logWithTimestamp(
            `Image List Fetched. fetching ${
              photoUrls.length - startingPoint
            } Images starting at ${startingPoint}!`
          )
        );
        for (let i = startingPoint; i < photoUrls.length; i++) {
          try {
            job.log(
              logWithTimestamp(`Fetching image ${i + 1}/${photoUrls.length} [${photoUrls[i]}]`)
            );
            const res = await fetch(photoUrls[i], { signal: AbortSignal.timeout(2000) });

            if (!res.ok) {
              job.log(logWithTimestamp(`Failed to fetch image ${i} (status ${res.status})`));
              continue;
            }

            const iconBuffer = await res.arrayBuffer();
            job.log(logWithTimestamp(`Fetched image ${i}, resizing...`));

            const resizedImage: Buffer<ArrayBufferLike> = await sharp(iconBuffer)
              .resize(480, 720)
              .toBuffer();

            images.push({ image: resizedImage, index: i });
            job.log(logWithTimestamp(`Image ${i} processed successfully`));
          } catch (err) {
            job.log(logWithTimestamp(`Error processing image ${i}: ${(err as Error).message}`));
          }
        }
        job.log(
          logWithTimestamp(
            `Finshed Fetching Images. ${images.length} / ${photoUrls.length - startingPoint}`
          )
        );
      }
    }
    await job.updateProgress(90);
    job.log(logWithTimestamp('All Data Fetched processing now'));

    if (config.debug.verboseLogging) {
      console.log(url.split('chapter-').at(-1));
      console.log(chapterNumbers);
    }

    const currIndex = chapterNumbers.indexOf(url.split('chapter-').at(-1));

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: Unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('Done'));
    await job.updateProgress(100);
    return {
      mangaName: mangaName,
      urlBase: urlBase + '/en/chapter-',
      slugList: chapterNumbers.join(','),
      chapterTextList: chapterNumbers.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: specialFetchData,
      sourceId: mangaId
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
