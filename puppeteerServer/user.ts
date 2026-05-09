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

        failureRequests.push(
          fetch(`${config.serverCom.serverUrl}/api/serverReq/data/userMangaFailed/${childJobId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.serverCom.apiKey,
            },
          })
        );

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

    const saveRequests = pendingSaves.map(async (manga) => {
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

      if (!res.ok) {
        throw new Error(
          `saveManga failed ${res.status}, Response: ${JSON.stringify(await res.json())}`
        );
      }

      return res;
    });

    const [saveResults, failResults] = await Promise.all([
      Promise.allSettled(saveRequests),
      Promise.allSettled(failureRequests),
    ]);

    const successfulSaves = saveResults.filter((r) => r.status === 'fulfilled').length;

    const failedSaves = saveResults.filter((r) => r.status === 'rejected').length;

    await log(`Save requests completed. Successful=${successfulSaves}, Failed=${failedSaves}`);

    await log(`Failure notifications completed. Count=${failResults.length}`);

    const imageRequests: Promise<Response>[] = [];

    for (let i = 0; i < saveResults.length; i++) {
      const res = saveResults[i];

      if (res.status !== 'fulfilled') {
        console.error('[user-bulk] Save failed:', res.reason);

        await log(
          `Save request failed: ${
            res.reason instanceof Error ? res.reason.message : String(res.reason)
          }`
        );

        continue;
      }

      const response = res.value;
      const text = await response.text();

      await log(`saveManga raw response: ${text}`);

      if (!response.ok) {
        await log(`saveManga failed HTTP ${response.status}`);
        continue;
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (e) {
        await log(`saveManga invalid JSON response`);
        continue;
      }

      const mangaId = json.mangaId ?? json.result?.mangaId ?? json.id;

      if (!mangaId) {
        await log(`saveManga missing mangaId in response: ${text}`);
        continue;
      }

      const manga = pendingSaves[i];

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

    const imageResults = await Promise.allSettled(imageRequests);

    const successfulImages = imageResults.filter((r) => r.status === 'fulfilled').length;

    const failedImages = imageResults.filter((r) => r.status === 'rejected').length;

    await log(`Image uploads completed. Successful=${successfulImages}, Failed=${failedImages}`);

    const saved = successfulSaves;
    const failed = failResults.length;

    await log(`Parent job ${job.id} completed. Saved=${saved}, Failed=${failed}`);

    return {
      fetchId: job.id,
      saved,
      failed,
    };
  },
  { connection }
);
