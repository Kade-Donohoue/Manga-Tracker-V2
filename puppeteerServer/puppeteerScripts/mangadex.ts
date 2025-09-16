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
  if (config.logging.verboseLogging) console.log('mangaDex');

  const logWithTimestamp = createTimestampLogger();

  try {
    job.log(logWithTimestamp('Pulling Chapter Data!'));

    const chapterId = url.match(/\/chapter\/([\w-]+)/)[1];
    if (!chapterId)
      throw new Error('Manga: Unable to get Chapter ID. please unsure this url is valid!');

    const chapterRequest = (await fetch(`https://api.mangadex.org/chapter/${chapterId}`)) as any;

    if (!chapterRequest.ok) throw new Error('Manga: Unable to fetch Current Chapter!');

    const currChapData: {
      result: string;
      response: string;
      data: { id: string; type: string; relationships: { id: string; type: string }[] };
    } = await chapterRequest.json();

    let mangaId =
      currChapData.data.relationships.find((relation) => relation.type === 'manga').id || '';

    if (!mangaId) throw new Error('Manga: Unable to get Mangadex mangaId ensure url is valid!');

    const [feedRequest, mangaRequest] = await Promise.all([
      fetch(
        `https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&limit=500&order[chapter]=asc`
      ),
      fetch(`https://api.mangadex.org/manga/${mangaId}`),
    ]);

    if (!feedRequest.ok) throw new Error('Manga: Unable to fetch manga list!');
    if (!mangaRequest.ok) throw new Error('Manga: Unable to fetch manga Overview!');

    job.log(logWithTimestamp('Data fetched, Proccessing!'));

    const chapterData: mangaDexFeed = await feedRequest.json();
    const overViewData: overViewData = await mangaRequest.json();

    const title = getEnglishTitle(overViewData.data);

    if (!title) throw new Error('Manga: Unable to get title!');

    let slugList = [];
    let chapterTestList = [];
    chapterData.data.forEach((data) => {
      let chapCheckIndex = chapterTestList.indexOf(data.attributes.chapter);
      if (chapCheckIndex != -1) {
        let isOlder =
          new Date(data.attributes.publishAt) <
          new Date(chapterData.data[chapCheckIndex].attributes.publishAt);
        if (isOlder) slugList[chapCheckIndex] = data.id;
      }
      slugList.push(data.id);
      chapterTestList.push(data.attributes.chapter ?? 'Unknown');
    });

    if (slugList.length == 0 || slugList.length != chapterTestList.length)
      throw new Error('Manga: Issue fetching Chapters');

    job.log(logWithTimestamp('Data Proccessed'));

    // await page.goto(url, {waitUntil: 'networkidle0', timeout: 10*1000}

    await job.updateProgress(40);

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    var resizedImage: Buffer | null = null;
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Fetching Image'));

      let coverID =
        overViewData.data.relationships.find((relation) => relation.type === 'cover_art')?.id || '';

      if (!coverID) throw new Error('Manga: Unable to get cover ID!');

      const coverDataReq = await fetch(`https://api.mangadex.org/cover/${coverID}`);

      if (!coverDataReq.ok) throw new Error('Manga: unable to fetch cover data');

      let coverData: {
        result: string;
        response: string;
        data: { id: string; type: 'cover_art'; attributes: { fileName: string } };
      } = await coverDataReq.json();

      const coverReq = await fetch(
        `https://mangadex.org/covers/${mangaId}/${coverData.data.attributes.fileName}`
      );
      if (config.logging.verboseLogging)
        console.log(`https://mangadex.org/covers/${mangaId}/${coverID}.jpg`);

      const iconBuffer = await coverReq.arrayBuffer();
      resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();
    }
    job.log(logWithTimestamp('All Data fetch. processing data.'));
    await job.updateProgress(90);

    let urlParts = url.split('chapter/').at(-1).split('/');
    const currIndex = slugList.indexOf(chapterId);

    if (currIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: 'https://mangadex.org/chapter/',
      slugList: slugList.join(','),
      chapterTextList: chapterTestList.join(','),
      currentIndex: currIndex,
      images: [{ image: resizedImage, index: 0 }],
      specialFetchData: null,
    };
  } catch (err) {
    job.log(logWithTimestamp(`Error: ${err}`));
    console.warn(`Unable to fetch data for: ${url}`);
    if (config.logging.verboseLogging) console.warn(err);
    // if (!page.isClosed()) await page.close()

    //ensure only custom error messages gets sent to user
    if (err.message.startsWith('Manga:')) throw new Error(err.message);
    throw new Error('Unable to fetch Data! maybe invalid Url?');
  }

  function getEnglishTitle(data: MangaData): string {
    const { title, altTitles } = data.attributes;

    // Check if an English title exists in altTitles
    for (const altTitle of altTitles) {
      if (altTitle.en) {
        return altTitle.en;
      }
    }

    // Fallback to the main title in English
    if (title.en) {
      return title.en;
    }

    // Default to the first available title
    const firstTitle = Object.values(title)[0];
    return firstTitle || '';
  }
}

type mangaDexFeed = {
  result: 'ok';
  response: 'collection';
  data: [
    {
      id: string;
      type: 'chapter';
      attributes: {
        title: string;
        volume: string;
        chapter: string;
        pages: 0;
        translatedLanguage: string;
        uploader: string;
        externalUrl: string;
        version: 1;
        createdAt: string;
        updatedAt: string;
        publishAt: string;
        readableAt: string;
      };
      relationships: [
        {
          id: string;
          type: string;
          related: string;
          attributes: {};
        }
      ];
    }
  ];
  limit: number;
  offset: number;
  total: number;
};

type MangaAttributes = {
  title: Record<string, string>;
  altTitles: { [key: string]: string }[];
};

type MangaData = {
  attributes: MangaAttributes;
};

type overViewData = {
  result: 'ok';
  response: 'entity';
  data: {
    id: '497f6eca-6276-4993-bfeb-53cbbbba6f08';
    type: 'manga';
    attributes: {
      title: Record<string, string>;
      altTitles: { [key: string]: string }[];
      description: { [key: string]: string };
      isLocked: true;
      links: {
        property1: 'string';
        property2: 'string';
      };
      originalLanguage: string;
      lastVolume: string;
      lastChapter: string;
      publicationDemographic: string;
      status: string;
      year: number;
      contentRating: string;
      chapterNumbersResetOnNewVolume: boolean;
      availableTranslatedLanguages: string[];
      latestUploadedChapter: string;
      tags: [
        {
          id: string;
          type: string;
          attributes: {
            name: {
              property1: string;
              property2: string;
            };
            description: {
              property1: string;
              property2: string;
            };
            group: string;
            version: number;
          };
          relationships: [
            {
              id: string;
              type: string;
              related: string;
              attributes: {};
            }
          ];
        }
      ];
      state: string;
      version: 1;
      createdAt: string;
      updatedAt: string;
    };
    relationships: [
      {
        id: string;
        type: string;
        related: string;
        attributes: {};
      }
    ];
  };
};
