import sharp from 'sharp';
import util from 'util';
import config from '../../config.json';

async function convertMangaNato() {
  const resp = await fetch(`${config.serverUrl}/serverReq/data/getAllManga`, {
    method: 'GET',
    headers: {
      pass: config.serverPassWord,
    },
  });

  if (config.verboseLogging) console.log(resp);
  if (resp.status != 200) return console.log('issue fetching data');

  const returnData: updateData = (await resp.json()).data;

  let newManga: mangaData[] = [];
  for (let i = 0; i < returnData.length; i++) {
    let manga = returnData[i];
    // returnData.forEach(async (manga) => {

    if (!manga.urlBase.includes('manganato')) continue;
    await new Promise((r) => setTimeout(r, 1000));

    let comickSearchRes = await fetch(
      'https://api.comick.fun/v1.0/search/?' +
        new URLSearchParams({
          type: 'comic',
          page: '1',
          limit: '1',
          showall: 'false',
          q: manga.mangaName,
          t: 'true',
        }).toString()
    );

    const contentType = comickSearchRes.headers.get('content-type');
    if (config.verboseLogging) console.log(comickSearchRes + '\n' + contentType);

    if (!contentType?.includes('application/json')) {
      const textResponse = await comickSearchRes.text(); // Read response as text
      console.error('Invalid response (not JSON):', textResponse);
      console.log(manga.mangaName);

      await new Promise((r) => setTimeout(r, 20000));
      continue;
    }

    if (comickSearchRes.status != 200) return console.log('issue fetching data');

    const searchReturn: comickSearch = (await comickSearchRes.json())[0];

    console.log(searchReturn);
    if (!searchReturn || !searchReturn.slug) {
      console.log(manga.mangaId, manga.mangaName, 'Unable to find');
      continue;
    }

    const comicData: comicData = await (
      await fetch(`https://api.comick.fun/comic/${searchReturn.slug}`)
    ).json();

    const chapterData: chapterData = await (
      await fetch(
        `https://api.comick.fun/comic/${comicData.comic.hid}/chapters?lang=en&limit=${comicData.comic.chapter_count}`
      )
    ).json();

    const chapterMap: ChapterMap = {};
    let userChap = null;
    chapterData.chapters.forEach((item) => {
      const { hid, chap, up_count } = item;

      if (!chapterMap[chap] || chapterMap[chap].up_count < up_count) {
        chapterMap[chap] = {
          chapter: chap ? `Chapter ${chap}` : 'Chapter Unknown',
          url: hid,
          up_count,
        };
      }

      if (!hid) return;
      if (hid === hid) userChap = chapterMap[chap].chapter;
    });
    console.log('userChap: ', userChap);

    const chapters: string[] = [];
    const urls: string[] = [];
    Object.values(chapterMap)
      .sort((a, b) => {
        if (a.chapter === 'Chapter Unknown' && b.chapter !== 'Chapter Unknown') return -1;
        if (a.chapter !== 'Chapter Unknown' && b.chapter === 'Chapter Unknown') return 1;

        return a.chapter.localeCompare(b.chapter, undefined, { numeric: true });
      })
      .forEach(({ chapter, url }, i) => {
        chapters.push(chapter);
        urls.push(url);
      });

    // const iconBuffer = await (await fetch(`https://meo.comick.pictures/${comicData.comic.md_covers[0].b2key}`)).arrayBuffer()
    // const resizedImage = await sharp(iconBuffer)
    //     .resize(480, 720)
    //     .toBuffer()

    newManga.push({
      mangaName: getEnglishTitle(comicData.comic.md_titles, comicData.comic.title),
      urlBase: `https://comick.io/comic/${searchReturn.slug}/`,
      slugList: urls.join(','),
      chapterTextList: chapters.join(','),
      currentIndex: -1,
      iconBuffer: null,
      mangaId: manga.mangaId,
    });
  }
  // )

  console.log(util.inspect(newManga, { maxArrayLength: null }));
  //   console.log(newManga);

  const saveResp = await fetch(`${config.serverUrl}/serverReq/data/updateManga`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pass: config.serverPassWord,
    },
    body: JSON.stringify({
      newData: newManga,
      amountNewChapters: 0,
      expiresAt: Date.now() + 7200000 + 5000,
    }),
  });

  console.log(saveResp);

  let savedata = await saveResp.json();

  console.log(savedata);
}

function getEnglishTitle(
  titles: { title: string; lang: string }[],
  defaultTitle: string = 'unknown'
) {
  for (let i = 0; i < titles.length; i++) {
    if (!titles[i].lang) continue;
    if (titles[i].lang.toLowerCase() === 'en') return titles[i].title;
  }

  return defaultTitle;
}

type mangaData = {
  mangaName: string;
  urlBase: string;
  slugList: string;
  chapterTextList: string;
  currentIndex: number;
  iconBuffer: Buffer;
  mangaId: string;
};

type pulledData = {
  mangaId: string;
  urlList: string;
  mangaName: string;
};

type comickSearch = {
  id: number;
  hid: string;
  slug: string;
  title: string;
};

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
  chapter: string;
  url: string;
  up_count: number;
};

type ChapterMap = {
  [chap: string]: ChapterDetails;
};

type updateData = {
  mangaId: string;
  urlBase: string;
  slugList: string;
  mangaName: string;
}[];

convertMangaNato();
