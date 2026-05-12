import { app } from './app';
import { checkOpts, fetchData, getOpts } from './types';
// import './mangaGetProc';
import config from './config.json';
import { addMangaBatch, sites } from './puppeteerScripts/sites';
import { connection } from './connections';
import { Queue, Worker, Job } from 'bullmq';

export const userQueue = new Queue('user-bulk', {
  connection,
});

async function notifyMangaFailed(fetchId: string) {
  return fetch(`${config.serverCom.serverUrl}/api/serverReq/data/userMangaFailed/${fetchId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.serverCom.apiKey,
    },
  });
}

new Worker(
  userQueue.name,
  async (job: Job) => {
    const log = (msg: string) => job.log(`[user-bulk] ${msg}`);

    await log(`Started parent job ${job.id}`);

    const childrenResults = (await job.getChildrenValues()) as Record<string, fetchData | Error>;

    await log(`Received ${Object.keys(childrenResults).length} child results`);

    type PendingSave = {
      fetchId: string;
      data: Omit<fetchData, 'images'>;
      images: fetchData['images'];
    };

    const pendingSaves: PendingSave[] = [];
    const failureRequests: Promise<Response>[] = [];

    for (const [childJobId, value] of Object.entries(childrenResults)) {
      await log(`Processing child job ${childJobId}`);

      if (value instanceof Error) {
        await log(`Child job ${childJobId} failed: ${value.message}`);

        console.error(`[user-bulk] Child job ${childJobId} failed:`, value);

        failureRequests.push(notifyMangaFailed(childJobId));

        continue;
      }

      const { images, ...rest } = value;

      await log(`Child job ${childJobId} succeeded with ${images.length} images`);

      pendingSaves.push({
        fetchId: childJobId.split(':').at(-1)!,
        data: rest,
        images,
      });
    }

    await log(`Sending ${pendingSaves.length} manga save requests`);

    const saveResults = await Promise.allSettled(
      pendingSaves.map(async (manga) => {
        try {
          const res = await fetch(`${config.serverCom.serverUrl}/api/serverReq/data/saveManga`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.serverCom.apiKey,
            },
            body: JSON.stringify({
              fetchId: manga.fetchId,
              newMangaData: manga.data,
            }),
          });

          const text = await res.text();

          if (!res.ok) {
            throw new Error(`saveManga failed ${res.status}, Response: ${text}`);
          }

          let json: any;

          try {
            json = JSON.parse(text);
          } catch {
            throw new Error(`saveManga invalid JSON response: ${text}`);
          }

          const mangaId = json.mangaId;

          if (!mangaId) {
            throw new Error(`saveManga missing mangaId in response: ${text}`);
          }

          return {
            manga,
            mangaId,
            rawResponse: text,
          };
        } catch (error) {
          throw {
            manga,
            error,
          };
        }
      })
    );

    const imageRequests: Promise<Response>[] = [];

    for (const result of saveResults) {
      if (result.status === 'rejected') {
        const { manga, error } = result.reason;

        console.error('[user-bulk] Save failed:', error);

        await log(
          `Save request failed for ${manga.fetchId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );

        failureRequests.push(notifyMangaFailed(manga.fetchId));

        continue;
      }

      const { manga, mangaId, rawResponse } = result.value;

      await log(`saveManga raw response: ${rawResponse}`);

      await log(`Saved manga ${manga.fetchId} -> mangaId=${mangaId}`);

      await log(`Queueing ${manga.images.length} image uploads for mangaId=${mangaId}`);

      for (const img of manga.images) {
        imageRequests.push(
          fetch(`${config.serverCom.serverUrl}/api/serverReq/data/saveCoverImage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.serverCom.apiKey,
            },
            body: JSON.stringify({
              img: img.image,
              index: img.index,
              mangaId,
            }),
          })
        );
      }
    }

    await log(`Sending ${imageRequests.length} image upload requests`);

    const [imageResults, failResults] = await Promise.all([
      Promise.allSettled(imageRequests),
      Promise.allSettled(failureRequests),
    ]);

    const successfulSaves = saveResults.filter((r) => r.status === 'fulfilled').length;

    const failedSaves = saveResults.filter((r) => r.status === 'rejected').length;

    const successfulImages = imageResults.filter((r) => r.status === 'fulfilled').length;

    const failedImages = imageResults.filter((r) => r.status === 'rejected').length;

    await log(`Save requests completed. Successful=${successfulSaves}, Failed=${failedSaves}`);

    await log(`Failure notifications completed. Count=${failResults.length}`);

    await log(`Image uploads completed. Successful=${successfulImages}, Failed=${failedImages}`);

    await log(`Parent job ${job.id} completed. Saved=${successfulSaves}, Failed=${failedSaves}`);

    return {
      fetchId: job.id,
      saved: successfulSaves,
      failed: failedSaves,
    };
  },
  { connection }
);
