import { app } from './app';
import { checkOpts, fetchData, getOpts } from './types';
import './mangaGetProc';
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
    const childrenResults = (await job.getChildrenValues()) as Record<string, fetchData | Error>;

    type PendingSave = {
      fetchId: string;
      data: Omit<fetchData, 'images'>;
      images: fetchData['images'];
    };

    const pendingSaves: PendingSave[] = [];
    const failureRequests: Promise<Response>[] = [];

    for (const [childJobId, value] of Object.entries(childrenResults)) {
      if (value instanceof Error) {
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

      pendingSaves.push({
        fetchId: childJobId.split(':').at(-1)!,
        data: rest,
        images,
      });
    }

    const saveRequests = pendingSaves.map((manga) =>
      fetch(`${config.serverCom.serverUrl}/api/serverReq/data/saveManga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.serverCom.apiKey,
        },
        body: JSON.stringify({
          fetchId: manga.fetchId,
          newMangaData: manga.data,
        }),
      })
    );

    const [saveResults, failResults] = await Promise.all([
      Promise.allSettled(saveRequests),
      Promise.allSettled(failureRequests),
    ]);

    const imageRequests: Promise<Response>[] = [];

    for (let i = 0; i < saveResults.length; i++) {
      const res = saveResults[i];
      if (res.status !== 'fulfilled') {
        console.error('Save failed:', res.reason);
        continue;
      }

      const { mangaId } = await res.value.json();
      const manga = pendingSaves[i];

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

    const imageResults = await Promise.allSettled(imageRequests);

    const saved = saveResults.filter((r) => r.status === 'fulfilled').length;
    const failed = failResults.length;

    return {
      fetchId: job.id,
      saved,
      failed,
    };
  },
  { connection }
);
