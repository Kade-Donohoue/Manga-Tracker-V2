import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { Job } from 'bullmq';
import { fetchData } from '../types';

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
    const bypassAllowReqs = ['_next/static/chunks'];
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

    const chapterData: { chapterMapData: [{ label: string; value: number }] } = await page.evaluate(
      () => {
        let str: string = '';

        (window as any).__next_f.forEach((bigArray: any[]) => {
          if (bigArray[0] != 1) return false;
          str += bigArray[1] as any;
        });

        //finds beinging of chapter list from next_f and pulls chapter list returning as json
        let startIndex = str.indexOf('"chapterMapData":[');
        if (startIndex == -1) throw new Error('Manga: Unable to find start of chapter list');

        let endIndex = str.indexOf('}]', startIndex);
        if (endIndex == -1) throw new Error('Manga: Ubable to find end of chapter list');

        return JSON.parse(`{${str.slice(startIndex, endIndex + 2).trim()}}`);
      }
    );
    if (config.debug.verboseLogging) console.log(chapterData);
    await job.updateProgress(30);

    const overViewURL = url.split('/chapter/')[0];
    // const overViewURL = await page.evaluate(() => {
    //     let foundData = '';
    //     (window as any).__next_f.some((bigArray:any[]) => {
    //         if (bigArray[0] != 1) return false
    //         let str:string = bigArray[1] as any
    //         if (str.indexOf('"seriesSlug\":\"') >= 0) {
    //             foundData = `${(window as any).__ENV.NEXT_PUBLIC_FRONTEND_URL}/series/${str.slice(str.indexOf('"seriesSlug\":\"')+14, str.indexOf('\",\"seriesName\"'))}/`
    //         }
    //         return false
    //     })
    //     return foundData
    // })

    if (!overViewURL) throw new Error('Manga: Unable to get base URL!');

    // console.log(overViewURL)
    job.log(logWithTimestamp(overViewURL));
    await job.updateProgress(35);

    job.log(logWithTimestamp('Data Retried! processing Data'));
    // let dataRows = stringData.trim().split('\n')
    if (config.debug.verboseLogging) console.log(chapterData);

    let chapeterList = [];
    // let chapterLinks = []
    // let chapterText = []
    chapterData.chapterMapData.reverse().forEach((row: { label: string; value: number }) => {
      if (!row) return;
      chapeterList.push(row.value);
      // chapterText.push('Chapter ' + row.value)//row.label to use asura labels (if want to use some data cleaning needs done)
      // chapterLinks.push(overViewURL+'chapter/'+row.value)
    });
    job.log(logWithTimestamp('Chapter Data Processed'));

    // if (chapterLinks.length == 0 || chapterLinks.length != chapterText.length) throw new Error('Manga: Issue fetching Chapters, lists dont match or no data was found!')

    if (chapeterList.length == 0)
      throw new Error('Manga: Issue fetching Chapters, no data was found!');

    const title = await page.evaluate(
      () => document.querySelector('a.items-center:nth-child(2) > h3:nth-child(1)')?.innerHTML,
      { timeout: 500 }
    );

    if (config.debug.verboseLogging) {
      // console.log(chapterLinks)
      // console.log(chapterText)
      console.log(chapeterList);
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

    var resizedImage: Buffer | null = null;
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Starting Icon Fetch'));
      if (config.debug.verboseLogging) console.log(overViewURL);
      await page.goto(overViewURL, { timeout: 10000 });
      job.log(logWithTimestamp('Overview Page loaded'));

      const photoSelect = await page.waitForSelector('img.rounded', { timeout: 1000 });
      const photo = await photoSelect?.evaluate((el) => el.getAttribute('src'));

      // console.log(photo)
      job.log(logWithTimestamp('Going to Photo'));
      allowAllRequests = true;
      const icon = await page.goto(photo!, { timeout: 10000 });
      await job.updateProgress(60);

      let iconBuffer = await icon?.buffer();
      resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();
    }
    job.log(logWithTimestamp('Data fetched'));
    await job.updateProgress(80);

    //match index by chapter number as asura frequently changes id in url
    // let endChapUrls = chapterLinks.map((valUrl) => valUrl.split('/chapter/').at(-1))
    // const currIndex = endChapUrls.indexOf(url.split('/chapter/').at(-1))
    const currIndex = chapeterList.indexOf(Number.parseFloat(url.split('/chapter/').at(-1)));

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: overViewURL + '/chapter/',
      slugList: chapeterList.join(','),
      chapterTextList: chapeterList.join(','),
      currentIndex: currIndex,
      images: [{ image: resizedImage, index: 0 }],
      specialFetchData: null,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
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
