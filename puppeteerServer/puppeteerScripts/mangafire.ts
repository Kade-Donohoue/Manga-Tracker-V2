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
    const allowRequests = ['mangafire'];
    const forceAllow = ['ajax'];
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
      '/ajax/read/chapter',
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
    // await page.goto(url, { waitUntil: 'load', timeout: 10 * 1000 });
    await job.updateProgress(20);
    job.log(logWithTimestamp('Chapter Page Loaded. Fetching Data'));

    // const mangaName = (await page.title()).split(/\s*chapter\s+[\w\d\.\!]+(\s*(-|\|)\s*Read)?/i)[0];
    const urlBase = url.split(/\/[a-z]{2}\/chapter/i)[0];

    const mangaId = urlBase.split('.').at(-1);

    const chapterResp = await fetch(`https://mangafire.to/ajax/read/${mangaId}/chapter/en`);

    if (!chapterResp.ok) throw new Error('Manga: Unable to fetch Chapter List!');

    const chapterData = await chapterResp.json();

    const mangaName = chapterData.result.title_format.split('TYPE_NUM')[0].trim();

    console.log(mangaName);

    await page.setContent(chapterData.result.html, { waitUntil: 'domcontentloaded' });

    const chapterNumbers = (
      await page.evaluate(() => {
        // Select all <a> elements inside the <ul>
        const links = Array.from(document.querySelectorAll('ul > li > a'));
        // Return the data-number attribute for each
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

        const photoUrls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.poster img'))
            .map((img) => img.getAttribute('src'))
            .filter((src) => src && !src.includes('no-image')); //Prevents Thier Fallback Image From showing up
        });

        photoUrls.reverse();

        if (photoUrls.length <= 0) {
          job.log(logWithTimestamp('Using Alternate Cover Image Fetch'));
          await page.goto(urlBase.replace('read', 'manga'));

          const imgElement = await page.waitForSelector('div.poster > div > img');

          const imgSrc = await imgElement.evaluate((el) => el.getAttribute('src'));
          if (imgSrc) {
            photoUrls.push(imgSrc);
          }
        }

        console.log(photoUrls);

        let startingPoint = config.updateSettings.refetchImgs
          ? 0
          : Math.max(0, coverIndexes.length - 1);
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
      specialFetchData: null,
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
