import { createTimestampLogger, match } from '../util';
import config from '../config.json';
import sharp from 'sharp';
import { getBrowser } from '../jobQueue';
import { CheckResult, fetchData, SiteQueue } from '../types';
import { Queue, Worker, Job } from 'bullmq';
import { connection } from '../connections';

const MangaDotNet = 'MangaDotNet-site';
const ENABLED = true;

export const mangaDotNetQueue = new Queue(MangaDotNet, {
  connection,
});

function check(url: string): CheckResult {
  let u: URL;

  try {
    u = new URL(url);
  } catch {
    return { ok: false, stage: 0, reason: 'Invalid URL' };
  }

  if (!u.hostname.includes('mangadot.net')) {
    return { ok: false, stage: 1, reason: 'Hostname does not match mangadot.net' };
  }

  const match = u.pathname.match(/\/chapter\/[0-9a-fA-F-]+(?:\/\d+)?/i);
  if (!match) {
    return {
      ok: false,
      stage: 2,
      reason: 'Path must match /chapter/{chapter-id}',
    };
  }

  return { ok: true, stage: 3 };
}

export const mangaDotNetSite: SiteQueue = {
  name: MangaDotNet,
  enabled: ENABLED,
  check,
  queue: mangaDotNetQueue,
  start: start,
};

let worker: Worker | null = null;
async function start() {
  if (worker) return;

  worker = new Worker(
    MangaDotNet,
    async (job) => {
      const { url } = job.data;
      console.log('[MangaDotNet] processing:', url);

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
  if (config.debug.verboseLogging) console.log('mangaDex');

  const logWithTimestamp = createTimestampLogger();

  try {
    job.log(logWithTimestamp('Pulling Chapter Data!'));

    const chapterId = (url.match(/\/chapter\/([^/?#]+)/) || [, 'unknown'])[1];
    if (!chapterId)
      throw new Error('Manga: Unable to get Chapter ID. please unsure this url is valid!');

    job.log(logWithTimestamp(`Chapter ID: ${chapterId}`));

    const chapterRequest = (await fetch(
      `https://mangadot.net/api/${url.includes('user') ? 'uploads' : 'chapters'}/${chapterId}/images`
    )) as any;
    job.log(logWithTimestamp('Chapter Data Fetched!'));

    if (!chapterRequest.ok) {
      console.error(`Failed to fetch chapter data for ${url}: ${chapterRequest.statusText}`);
      console.error(`Response status: ${chapterRequest.status}`);
      console.error(`Response body: ${await chapterRequest.text()}`);
      throw new Error('Manga: Unable to fetch Current Chapter!');
    }
    const currChapData: ChapterResponse = await chapterRequest.json();

    let mangaId = currChapData.manga?.id.toString();

    let language = currChapData.chapter?.language || 'en';

    const mangaOverviewRequest = await fetch(`https://mangadot.net/api/manga/${mangaId}`);
    if (!mangaOverviewRequest.ok) throw new Error('Manga: Unable to fetch Manga Overview!');

    const mangaOverviewData: MangaOverviewResponse = await mangaOverviewRequest.json();

    job.log(logWithTimestamp(`Manga ID: ${mangaId}, Language: ${language}`));

    if (!mangaId) throw new Error('Manga: Unable to get Mangadex mangaId ensure url is valid!');

    const chapterListRequest = await fetch(
      `https://mangadot.net/api/manga/${mangaId}/chapters/list?lang=${language}`
    );

    if (!chapterListRequest.ok) throw new Error('Manga: Unable to fetch chapter list!');

    job.log(logWithTimestamp('Data fetched, Proccessing!'));

    const chapterData: ChapterListItem[] = await chapterListRequest.json();

    let title = mangaOverviewData.manga?.title;
    let author = mangaOverviewData.manga?.authors || job.data.author || 'Unknown Author';
    let description = mangaOverviewData.manga?.description || job.data.description || '';

    if (language !== 'en') {
      job.log(logWithTimestamp('Not English Appending language'));
      title = ` (${language}) ${title}`;
    }

    if (!title) throw new Error('Manga: Unable to get title!');

    const { slugList, chapterTextList, currentIndex } = dedupeChapters(
      chapterData,
      currChapData.chapter.id
    );

    if (slugList.length == 0 || slugList.length != chapterTextList.length)
      throw new Error('Manga: Issue fetching Chapters');

    job.log(logWithTimestamp('Data Proccessed'));

    await job.updateProgress(40);

    let inputDate = new Date();
    const oneMonthAgo = new Date();
    if (maxSavedAt) {
      inputDate = new Date(maxSavedAt.replace(' ', 'T') + 'Z');
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    }

    let images: { image: Buffer<ArrayBufferLike>; index: number }[] = [];
    if (icon || inputDate < oneMonthAgo) {
      job.log(logWithTimestamp('Fetching Image'));

      const coverReq = await fetch(`https://mangadot.net${mangaOverviewData.manga?.photo}`);
      if (config.debug.verboseLogging) console.log(currChapData.manga?.photo);

      const iconBuffer = await coverReq.arrayBuffer();
      let resizedImage = await sharp(iconBuffer).resize(480, 720).toBuffer();

      images.push({ image: resizedImage, index: 0 });
    }
    job.log(logWithTimestamp('All Data fetch. processing data.'));
    await job.updateProgress(90);

    if (currentIndex == -1 && !ignoreIndex) {
      throw new Error('Manga: unable to find current chapter. Please retry or contact Admin!');
    }

    job.log(logWithTimestamp('done'));
    await job.updateProgress(100);
    return {
      mangaName: title,
      urlBase: 'https://mangadot.net/chapter/',
      slugList: slugList.join(','),
      chapterTextList: chapterTextList.join(','),
      currentIndex: currentIndex,
      images: images,
      specialFetchData: mangaId + `(${language})`,
      sourceId: mangaId + `(${language})`,
      author: author,
      description: description,
      source: 'mangaDotNet',
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
    // if (page && !page.isClosed()) {
    //   page.removeAllListeners();
    //   await page.close().catch(() => {});
    // }
  }

  function dedupeChapters(
    chapters: ChapterListItem[],
    currentChapterId: number
  ): {
    slugList: string[];
    chapterTextList: number[];
    currentIndex: number;
  } {
    const deduped = new Map<string, ChapterListItem>();

    for (const chapter of chapters) {
      const key = `${chapter.volume_number ?? ''}:${chapter.chapter_number}`;
      const existing = deduped.get(key);

      if (!existing || new Date(chapter.date_added) > new Date(existing.date_added)) {
        deduped.set(key, chapter);
      }
    }

    const result = [...deduped.values()];
    const currentIndex = result.findIndex((chapter) => chapter.id === currentChapterId);

    return {
      slugList: result.map(
        (chapter) => `${chapter.id}${chapter.source.toLowerCase() === 'user' ? '?source=user' : ''}`
      ),
      chapterTextList: result.map((chapter) => chapter.chapter_number),
      currentIndex,
    };
  }
}

type ChapterResponse = {
  chapter: {
    id: number;
    manga_id: number;
    chapter_number: string;
    volume_number: number | null;
    chapter_title: string;
    language: string;
    group_id: number;
    status: string;
    rejection_reason: string | null;
    page_count: number;
    date_added: string;
    type: string;
    scanlator_name: string;
    torrent_job_id: number | null;
    uploader_id: string;
    country_of_origin: string;
    is_longstrip: boolean;
    groups: {
      id: number;
      name: string;
      slug: string;
      is_scanlator: boolean;
    }[];
  };

  manga: {
    id: number;
    title: string;
    photo: string;
    country_of_origin: string;
    is_longstrip: boolean;
  };

  images: {
    url: string;
    w: number;
    h: number;
    filename: string;
  }[];

  prev_chapter_id: number | null;
  next_chapter_id: number | null;
  prev_source: string | null;
  next_source: string | null;
  prev_volume_id: number | null;
  next_volume_id: number | null;
  type: string;
  volume_number: number | null;
  source: string;
};

type ChapterListItem = {
  id: number;
  chapter_number: number;
  volume_number: number | null;
  chapter_title: string;
  language: string;
  group_id: number;
  group_name: string;
  group_slug: string;
  group_is_scanlator: boolean;
  uploader_id: string;
  uploader_username: string;
  uploader_upload_status: string;
  date_added: string;
  page_count: number;
  source: string;
  scanlator_name: string;
  comment_count: number;
  groups: {
    id: number;
    name: string;
    slug: string;
    is_scanlator: boolean;
  }[];
};

type MangaOverviewResponse = {
  manga: {
    id: number;
    title: string;
    genres: string[];
    status: string;
    photo: string;
    date_added: string;
    description: string;
    hiatus: string;
    source_url: string;
    banner_image: string | null;
    is_adult: boolean;
    scanlation_group: string;
    is_blurworthy: boolean;
    mangaupdates_id: string;
    anilist_id: number;
    mangadex_id: string;
    mal_id: number;
    kitsu_id: number;
    mangabaka_id: number;
    anime_planet_id: string;
    shikimori_id: number;
    ann_id: number;
    chapter_count: number;
    latest_chapter_number: string;
    last_chapter_date: string;
    country_of_origin: string;
    tracked_count: number;
    authors: string;
    artists: string;
    year: number;
    content_rating: string;
    rating: string;
    is_hot: boolean;
    is_popular: boolean;
    view_count: number;
    avg_rating: number;
    rating_count: number;
    comment_count: number;
    alt_titles: string[];
    update_day: string | null;
    is_longstrip: boolean | null;
    tags: {
      category: string;
      is_adult: boolean;
      tags: {
        name: string;
        weight: string;
        is_adult: boolean;
      }[];
    }[];
    review_count: number;
  };

  total_chapters: number;
  latest_chapter_number: number;
  first_chapter_id: number;
  first_chapter_source: string;
  status_text: string;
  date_added_formatted: string;
};
