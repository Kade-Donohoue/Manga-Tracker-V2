import config from '../config.json';
import { createTimestampLogger, match } from '../util';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { Job } from 'bullmq';
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

    // await page.evaluateOnNewDocument(() => {
    //   // Freeze the current URL
    //   const current = window.location.href;

    //   // Redefine window.location so scripts can't redirect
    //   Object.defineProperty(window, 'location', {
    //     configurable: false,
    //     enumerable: true,
    //     value: Object.freeze({
    //       ...window.location,
    //       assign: () => {},
    //       replace: () => {},
    //       reload: () => {},
    //       get href() {
    //         return current;
    //       },
    //       set href(_) {
    //         // ignore attempts to navigate
    //       },
    //     }),
    //   });

    //   // Prevent history-based navigation
    //   history.pushState = () => {};
    //   history.replaceState = () => {};
    //   history.back = () => {};
    //   history.forward = () => {};
    //   history.go = () => {};
    // });

    const urlBase = url.split(/\/[a-z]{2}\/chapter/i)[0];
    const mangaId = urlBase.split('.').at(-1);

    let chapterData: any;
    if (!specialFetchData) {
      // await new Promise((r) => setTimeout(r, 60_000));
      const [response] = await Promise.all([
        page.waitForRequest((req) => req.url().includes('/ajax/read/'), { timeout: 12_000 }),
        page.goto(url, { waitUntil: 'networkidle2', timeout: 12_000 }),
      ]);

      const chapterApiUrl = new URL(response.url());
      const vrf = chapterApiUrl.searchParams.get('vrf');
      job.log(logWithTimestamp(`Found vrf: ${vrf}`));

      specialFetchData = vrf;

      await page.goto('about:blank');
    }

    if (!specialFetchData) throw new Error('Manga: Unable to get VFR!');
    job.log(logWithTimestamp('Loading Chapter Data'));
    const chapterResp = await fetch(
      `https://mangafire.to/ajax/read/${mangaId}/chapter/en?vrf=${specialFetchData}`
    );

    if (!chapterResp.ok) throw new Error('Manga: Unable to fetch Chapter List!');

    chapterData = await chapterResp.json();

    console.log(chapterData);

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

    console.log(chapterNumbers);

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

      const volumeResp = await fetch(`https://mangafire.to/ajax/manga/${mangaId}/volume/en`);

      if (volumeResp.ok) {
        const volumeData = await volumeResp.json();
        console.log(volumeData);
        await page.setContent(volumeData.result, { waitUntil: 'domcontentloaded' });

        let photoUrls =
          (await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.poster img'))
              .map((img) => img.getAttribute('src'))
              .filter((src) => src && !src.includes('no-image')); //Prevents Thier Fallback Image From showing up
          })) ?? [];

        if (photoUrls?.length <= 0) {
          job.log(logWithTimestamp('Using Alternate Cover Image Fetch'));
          await page.goto(urlBase.replace('read', 'manga'));

          const imgElement = await page.waitForSelector('div.poster > div > img');

          const imgSrc = await imgElement.evaluate((el) => el.getAttribute('src'));
          if (imgSrc) {
            photoUrls.push(imgSrc);
          }
        }

        photoUrls.reverse();

        console.log(photoUrls);

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
            const res = await fetch(photoUrls[i]);

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
    await page.close();
    job.log(logWithTimestamp('All Data Fetched processing now'));

    if (config.logging.verboseLogging) {
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
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn('Unable to fetch data for: ' + url);
    if (config.logging.verboseLogging) console.warn(err);
    if (!page.isClosed()) await page.close();

    //ensure only custom error messages gets sent to user
    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  }
}
