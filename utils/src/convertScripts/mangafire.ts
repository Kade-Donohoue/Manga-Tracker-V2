import sharp from 'sharp';
import { Job } from 'bullmq';
import puppeteer from 'puppeteer';

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
  maxSavedAt: string
) {
  const browser = await puppeteer.launch();
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

    console.log('Loading Chapter Page');
    // await page.goto(url, { waitUntil: 'load', timeout: 10 * 1000 });

    console.log('Chapter Page Loaded. Fetching Data');

    // const mangaName = (await page.title()).split(/\s*chapter\s+[\w\d\.\!]+(\s*(-|\|)\s*Read)?/i)[0];
    const overviewUrl = url.split(/\/[a-z]{2}\/chapter/i)[0];

    const mangaId = overviewUrl.split('.').at(-1);

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

    console.log('Chapter Data Fetched');

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }
    const pullCoverImages = icon || inputDate < oneMonthAgo;

    let images: { image: Buffer; index: number }[] = [];
    if (pullCoverImages) {
      console.log('Loading Volume html');
      await page.setJavaScriptEnabled(false);

      const volumeResp = await fetch(`https://mangafire.to/ajax/manga/${mangaId}/volume/en`);

      if (volumeResp.ok) {
        const volumeData = await volumeResp.json();
        console.log(volumeData);
        await page.setContent(volumeData.result, { waitUntil: 'domcontentloaded' });

        const photoUrls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.poster img')).map((img) =>
            img.getAttribute('src')
          );
        });

        photoUrls.reverse();

        console.log(photoUrls);

        let startingPoint = 0;
        console.log(
          `Image List Fetched. fetching ${
            photoUrls.length - startingPoint
          } Images starting at ${startingPoint}!`
        );
        for (let i = startingPoint; i < photoUrls.length; i++) {
          try {
            console.log(`Fetching image ${i + 1}/${photoUrls.length} [${photoUrls[i]}]`);
            const res = await fetch(photoUrls[i]);

            if (!res.ok) {
              console.log(`Failed to fetch image ${i} (status ${res.status})`);
              continue;
            }

            const iconBuffer = await res.arrayBuffer();
            console.log(`Fetched image ${i}, resizing...`);

            const resizedImage: Buffer = await sharp(iconBuffer).resize(480, 720).toBuffer();

            images.push({ image: resizedImage, index: i });
            console.log(`Image ${i} processed successfully`);
          } catch (err) {
            console.log(`Error processing image ${i}: ${(err as Error).message}`);
          }
        }
        console.log(
          `Finshed Fetching Images. ${images.length} / ${photoUrls.length - startingPoint}`
        );
      }
    }
    await page.close();
    console.log('All Data Fetched processing now');

    if (true) {
      console.log(url.split('chapter-').at(-1));
      console.log(chapterNumbers);
    }

    const currIndex = chapterNumbers.indexOf(url.split('chapter-').at(-1));

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: Unable to find current chapter. Please retry or contact Admin!');
    }

    console.log('Done');
    await browser.close();
    return {
      mangaName: mangaName,
      urlBase: overviewUrl + '/en/chapter-',
      slugList: chapterNumbers.join(','),
      chapterTextList: chapterNumbers.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: null,
    };
  } catch (err) {
    console.log(`Error: ${err}`);
    console.warn('Unable to fetch data for: ' + url);
    if (true) console.warn(err);
    if (!page.isClosed()) await page.close();

    //ensure only custom error messages gets sent to user
    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  }
}
