import config from './config.json';
import { mangaUrlCheck } from './types';

export function match(string: string, subStrings: string[]) {
  for (const subString of subStrings) {
    if (string.includes(subString)) return true;
  }
  return false;
}

export function validMangaCheck(url: string): mangaUrlCheck {
  if (!url.includes('http'))
    return { success: false, value: 'invalid URL Format!', statusCode: 422 };
  if (!checkChapterUrl(url))
    return {
      success: false,
      value:
        'link provided is for an overview page. Please provide a link to a specific chapter page!',
      statusCode: 422,
    };

  if (url.includes('manganato.gg') && config.sites.allowManganatoScans)
    return { success: true, value: 'manganato' };
  else if (url.includes('mangadex') && config.sites.allowMangaDex)
    return { success: true, value: 'mangadex' };
  else if (url.includes('asura') && config.sites.allowAsura)
    return { success: true, value: 'asura' };
  else if (url.includes('comick') && config.sites.allowComick)
    return { success: true, value: 'comick' };
  else return { success: false, value: 'Unsupported WebPage!', statusCode: 422 };
}

function checkChapterUrl(url: string): boolean {
  url = url.toLowerCase();
  if (url.includes('comick.io/comic/')) {
    url.replace('https://comick.io/comic/', '');
    if (url.includes('/')) return true;
  }
  return url.includes('chapter') || url.includes('ch-');
}

export async function sendNotif(title: string, message: string): Promise<void> {
  const results = await Promise.allSettled(
    config.notif.webhookUrls.map((url) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Puppeteer: ' + title,
          content: message,
        }),
      })
    )
  );
}
