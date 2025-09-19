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
  else if (url.includes('mangafire') && config.sites.allowMangafire)
    return { success: true, value: 'mangafire' };
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

export function createTimestampLogger() {
  let lastTimestamp = Date.now();

  return (message: string): string => {
    const currentTimestamp = Date.now();
    const diff = currentTimestamp - lastTimestamp;
    lastTimestamp = currentTimestamp;

    const timestamp = new Date(currentTimestamp).toISOString();
    return `[${timestamp}] ${message}${formatTimeDifference(diff)}`;
  };
}

function formatTimeDifference(diff: number): string {
  if (diff >= 60000) return ` (Took ${(diff / 60000).toFixed(2)} min)`;
  if (diff >= 1000) return ` (Took ${(diff / 1000).toFixed(2)} sec)`;
  return ` (Took ${diff} ms)`;
}
