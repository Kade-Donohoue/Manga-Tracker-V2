import config from '../../config.json';
import sharp from 'sharp';
import { Job } from 'bullmq';
import { fetchData } from '../../types';
import { createTimestampLogger, match } from '../../util';
import { getBrowser } from '../../jobQueue';

/**
 * Gets the chapter list from Comick
 * @param url: Chapter URL of a manga from Comick.
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
  specialFetchData: any,
  job: Job
): Promise<fetchData> {
  throw new Error('Deprecated!');
  if (config.debug.verboseLogging) console.log('comick');
  const logWithTimestamp = createTimestampLogger();

  try {
    const slug = await resolveSlug(url, job);
    if (config.debug.verboseLogging) console.log('slug: ', slug);
    job.log(logWithTimestamp('Fetching Comic Data with following slug: ' + slug));

    let comickHid: string | null = specialFetchData;
    let mangaTitle: string = job.data.mangaName;
    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    let newCoverIndex: number = 0;

    if (config.debug.verboseLogging) console.log(comickHid, mangaTitle);

    //Determine if refetching cover image
    const inputDate = maxSavedAt ? new Date(maxSavedAt.replace(' ', 'T') + 'Z') : new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const pullCoverImages = icon || config.updateSettings.refetchImgs || inputDate < oneMonthAgo;

    if (!specialFetchData || !job.data.update || pullCoverImages) {
      const comicResult = await fetch(
        `https://api.comick.fun/comic/${specialFetchData ? specialFetchData : slug}?tachiyomi=true`,
        {
          headers: {
            'User-Agent': 'ComickProxy/1.0',
          },
        }
      );
      if (config.debug.verboseLogging) console.log(comicResult);

      if (!comicResult.ok) throw new Error('Manga: Unable to fetch Comick Data!');

      const comicData: comicData = await comicResult.json();
      if (config.debug.verboseLogging) console.log('comic Data: ', comicData);

      await job.updateProgress(20);
      job.log(logWithTimestamp('comic Data Retrieved!'));

      comickHid = comicData.comic.hid;
      mangaTitle = getEnglishTitle(comicData.comic.md_titles, comicData.comic.title);

      //Logic to pull cover images
      if (pullCoverImages) {
        job.log(logWithTimestamp('Fetching image List!'));

        const coverImageUrls = await getCoverImageList(slug);

        let startingPoint = config.updateSettings.refetchImgs
          ? 0
          : Math.max(0, coverIndexes.length - 1);
        job.log(
          logWithTimestamp(
            `Image List Fetched. fetching ${
              coverImageUrls.length - startingPoint
            } Images starting at ${startingPoint}!`
          )
        );
        for (let i = startingPoint; i < coverImageUrls.length; i++) {
          try {
            job.log(
              logWithTimestamp(
                `Fetching image ${i + 1}/${coverImageUrls.length} [${coverImageUrls[i]}]`
              )
            );
            const res = await fetch(coverImageUrls[i]);

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
            `Finshed Fetching Images. ${images.length} / ${coverImageUrls.length - startingPoint}`
          )
        );
      }
    }

    job.log(logWithTimestamp('Fetching Chapter Data'));
    const chapterReq = await fetch(
      `https://api.comick.fun/comic/${comickHid}/chapters?tachiyomi=true&lang=en&limit=10000000000000&chap-order=1`,
      {
        headers: {
          'User-Agent': 'ComickProxy/1.0',
        },
      }
    );
    if (config.debug.verboseLogging) console.log(chapterReq);
    if (!chapterReq.ok) throw new Error('Manga: Unable to fetch chapter Data!');
    const chapterData: chapterData = await chapterReq.json();

    if (config.debug.verboseLogging) console.log('Chapter Data: ', chapterData);
    await job.updateProgress(40);
    job.log(logWithTimestamp('chapter Data Retrieved! Parsing Data Now.'));

    let userHid = url.split('/').at(-1).toLowerCase();
    userHid = userHid.replace(/-chapter-\d+.?\d*-[a-z]+/gi, '');
    if (config.debug.verboseLogging) console.log('userHid: ', userHid);

    const chapterMap: ChapterMap = {};
    let userChap = null;

    //find most liked version of chapter and puts it in map. and finds users chapter
    for (let i = 0; i < chapterData.chapters.length; i++) {
      const { hid, chap, up_count } = chapterData.chapters[i];
      const chapNum = parseFloat(chap);

      if (!chapterMap[chap] || chapterMap[chap].up_count < up_count) {
        chapterMap[chap] = {
          chapter: Number.isNaN(chapNum) ? i + 1 : chapNum,
          hid,
          up_count,
        };
      }

      if (hid?.toLowerCase() === userHid) {
        userChap = chapterMap[chap].chapter;
      }
    }

    if (config.debug.verboseLogging) console.log('userChap: ', userChap);

    const chapters: number[] = [];
    const hidList: string[] = [];
    Object.values(chapterMap)
      .sort((a, b) => {
        return a.chapter - b.chapter;
      })
      .forEach(({ chapter, hid }, i) => {
        chapters.push(chapter);
        hidList.push(hid);
      });
    job.updateProgress(70);
    job.log(logWithTimestamp('Chapter Data parsed getting final data!'));

    if (config.debug.verboseLogging) {
      console.log('url ends: ', hidList.join(','));
      console.log('chapters: ', chapters.join(','));
    }

    let currIndex = chapters.indexOf(userChap);
    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.updateProgress(100);
    job.log(logWithTimestamp('All data fetched!'));
    return {
      mangaName: mangaTitle,
      urlBase: `https://comick.io/comic/${slug}/`,
      slugList: hidList.join(','),
      chapterTextList: chapters.join(','),
      currentIndex: currIndex,
      images: images,
      specialFetchData: comickHid,
      sourceId: '',
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
    if (config.debug.verboseLogging) console.warn(err);

    //ensure only custom error messages gets sent to user
    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  }

  function extractSlug(url: string): string | null {
    const match = url.match(/comick\.io\/comic\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getEnglishTitle(
    titles: { title: string; lang: string }[],
    defaultTitle = 'unknown'
  ): string {
    const enTitle = titles.find((t) => t.lang?.toLowerCase() === 'en');
    return enTitle ? enTitle.title : defaultTitle;
  }

  async function resolveSlug(url: string, job: Job): Promise<string> {
    const res = await fetch(url + '?tachiyomi=true', {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'ComickProxy/1.0',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    job.log(logWithTimestamp('Slug Test Status: ' + res.status));

    if (
      (res.status === 301 || res.status === 302 || res.status === 308) &&
      res.headers.get('location')
    ) {
      const location = res.headers.get('location')!;
      const match = location.match(/\/comic\/([^/]+)/);
      if (match) {
        return match[1]; // return the updated slug
      }
    }

    return extractSlug(url);
  }

  async function getCoverImageList(slug: string) {
    const coverPageUrl = `https://comick.io/comic/${slug}/cover`;

    try {
      const browser = await getBrowser();
      const page = await browser.newPage();

      page.setDefaultNavigationTimeout(1000); // timeout nav after 1 sec
      page.setRequestInterception(true);
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
      );
      await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });

      let allowAllRequests: boolean = false;
      const allowRequests = [coverPageUrl];
      const forceAllow = [''];
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

      job.log(logWithTimestamp('Loading Cover Image List Page'));
      await page.goto(coverPageUrl, { waitUntil: 'load', timeout: 10 * 1000 });
      await job.updateProgress(20);
      job.log(logWithTimestamp('Cover Image List Page Loaded. Fetching Data'));

      const coverImageUrls = await page.$$eval('img.select-none', (imgs) =>
        imgs.map((img) => img.src)
      );

      return coverImageUrls.reverse();
    } catch {
      return [];
    }
  }
}

type comicData = {
  firstChap: {
    chap: string;
    hid: string;
    lang: string;
    group_names: string[];
    vol: null;
  };
  comic: {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: {
      mu: string;
    };
    lastChapter: number;
    chapter_count: number;
    demographic: number;
    user_follow_count: number;
    follow_rank: number;
    follow_count: number;
    desc: string;
    parsed: string;
    slug: string;
    mismatch: null;
    year: number;
    bayesian_rating: null;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    chapter_numbers_reset_on_new_volume_manual: boolean;
    final_chapter: null;
    final_volume: null;
    noindex: boolean;
    adsense: boolean;
    login_required: boolean;
    recommendations: [];
    relate_from: [];
    md_titles: { title: string; lang: string }[];
    md_comic_md_genres: { mdGenres: { name: string; type: string; slug: string; group: string } }[];
    md_covers: { vol: string; w: number; h: number; b2key: string }[];
    mu_comics: {
      mu_comic_publishers: {
        mu_publishers: { title: string; slug: string };
      }[];
      licensed_in_english: null;
      mu_comic_categories: {
        mu_categories: { title: string; slug: string };
        positive_vote: number;
        negative_vote: number;
      }[];
    };
    iso639_1: string;
    lang_name: string;
    lang_native: string;
  };
  artists: { name: string; slug: string }[];
  authors: { name: string; slug: string }[];
  langList: string[];
  recommendable: boolean;
  demographic: string;
  englishLink: null;
  matureContent: boolean;
};

type chapterData = {
  chapters: {
    id: number;
    chap: string;
    title: string;
    vol: string;
    lang: string;
    created_at: string;
    updated_at: string;
    up_count: number;
    down_count: number;
    is_the_last_chapter: boolean;
    publish_at: null;
    group_name: string[];
    hid: string;
    identities: null;
    md_chapters_groups: {
      md_groups: { title: string; slug: string };
    }[];
  }[];
  total: number;
  limit: number;
};

type ChapterDetails = {
  chapter: number;
  hid: string;
  up_count: number;
};

type ChapterMap = {
  [chap: string]: ChapterDetails;
};
