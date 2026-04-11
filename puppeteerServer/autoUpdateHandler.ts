import { FlowProducer, Job, Queue, Worker } from 'bullmq';
import { resolveSiteForUrl, sites } from './puppeteerScripts/sites';
import { connection } from './connections';
import config from './config.json';
import { getJobByFullId, sendNotif } from './util';
import { oldMangaData, updateWebsiteJob } from './types';

const flowProducer = new FlowProducer({
  connection,
});

export const autoUpdateQueue = new Queue('bulk-parent', {
  connection,
});

export function startAutoUpdate() {
  console.log(sites.map((site) => site.name).join("','"));
  if (config.updateSettings.updateAtStart) updateAllManga();

  if (config.updateSettings.autoUpdateInfo)
    setInterval(updateAllManga, config.updateSettings.updateDelay);
}

async function updateAllManga() {
  let date = new Date();
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);

  const proccessingCount = await autoUpdateQueue.getWaitingChildrenCount();
  if (proccessingCount > 0) {
    console.warn(
      `New Auto Update Starting before old finished! currently ${proccessingCount} are running`
    );

    sendNotif(
      'New Auto Update Starting before old finished!',
      `${proccessingCount} auto update are still incomplete! Consider increasing updateDelay`
    );
  }

  console.log(`Updating all manga at ${formattedTime}`);
  try {
    const resp = await fetch(`${config.serverCom.serverUrl}/api/serverReq/data/getAllManga`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.serverCom.apiKey,
      },
    });
    if (config.debug.verboseLogging) console.log(resp);
    if (resp.status != 200) {
      if (config.notif.updateFetchFailureNotif) {
        await sendNotif(
          'Failed to get update Data!',
          `Encountered Error ${resp.status}:${resp.statusText}, Check Puppeteer Logs!`
        );
      }

      return console.log('issue fetching data to update all manga:');
    }

    const oldData: oldMangaData[] = (await resp.json()).data;
    console.log(`Parsing Old Data totaling ${oldData.length} Manga!`);

    const children = [];
    for (const oldManga of oldData) {
      console.log(oldManga);
      const firstSlug = oldManga.slugList.split(',')[0].trim();
      const firstChapUrl = oldManga.urlBase + firstSlug;
      const siteResults = resolveSiteForUrl(firstChapUrl);
      console.log(siteResults);
      if (siteResults.ok === false) {
        console.warn(`[SKIPPED] ${firstChapUrl} → ${siteResults.error.reason}`);
        continue;
      }
      const site = siteResults.site;

      children.push({
        name: `AutoUpdate: ${oldManga.mangaId}`,
        queueName: site.queue.name,
        data: {
          type: site.name, // maps to your webSite.value
          url: firstChapUrl, // firstChapUrl -> url
          mangaId: oldManga.mangaId,
          getIcon: config.updateSettings.refetchImgs,
          update: true,
          oldSlugList: oldManga.slugList,
          coverIndexes: oldManga.coverIndexes,
          maxSavedAt: oldManga.maxSavedAt,
          specialFetchData: oldManga.specialFetchData,
          mangaName: oldManga.mangaName,
        },
        opts: {
          priority: 10,
          removeOnComplete: false,
          removeOnFail: false,
          failParentOnFailure: false,
          removeDependencyOnFailure: true,
          attempts: 3,
        },
      });
    }
    console.log('Starting Manga!');
    flowProducer.add({
      name: `Auto Update at ${formattedTime}`,
      queueName: 'auto-update',
      data: {
        total: children.length,
      },
      opts: {
        removeOnComplete: false,
        removeOnFail: false,
      },
      children,
    });
    console.log('Stared Fetching Manga!');
  } catch (err) {
    console.error(err);
  }
}

new Worker(
  'auto-update',
  async (job: Job) => {
    const startTime = Date.now();

    const updateProgress = async (data: any) => {
      await job.updateProgress({
        ...data,
        timestamp: Date.now(), // manual timestamp
        elapsedMs: Date.now() - startTime,
      });
    };

    const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 15000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    await updateProgress({ stage: 'fetching_children', progress: 0 });

    const childrenResults = await job.getChildrenValues();

    const results = (
      await Promise.all(
        Object.entries(childrenResults).map(async ([jobId]) => {
          return await getJobByFullId(jobId);
        })
      )
    ).filter((job): job is updateWebsiteJob => job !== undefined);
    const totalFailedCount = job.data.total - results.length;

    await updateProgress({ stage: 'processing_results', progress: 15 });

    // summarize failuress
    if (totalFailedCount > 0) {
      const failures = await job.getIgnoredChildrenFailures();

      const queueCounts: Record<string, number> = {};

      for (const childJobId of Object.keys(failures)) {
        const childJob = await getJobByFullId(childJobId);
        if (!childJob) continue;

        const queueName = childJob.queueName ?? 'unknown';
        queueCounts[queueName] = (queueCounts[queueName] ?? 0) + 1;
      }

      const title = `Jobs: ${totalFailedCount}/${job.data.total} failed`;
      const body = Object.entries(queueCounts)
        .map(([queue, count]) => `${queue}: ${count}`)
        .join('\n');

      console.warn(title, queueCounts);
      await sendNotif(title, body);
    }

    let totalNewChapters = 0;

    const updateData = results.map(
      ({ returnvalue: { images, ...rest }, data: { oldSlugList, mangaId } }) => {
        const oldSlugs = oldSlugList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const newSlugs = rest.slugList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const newChapters = newSlugs.filter((slug: string) => !oldSlugs.includes(slug));
        totalNewChapters += newChapters.length;

        return {
          ...rest,
          mangaId,
          oldSlugList,
          newChapterCount: newChapters.length,
        };
      }
    );

    const imageData = results.map(({ returnvalue: { images }, data: { mangaId } }) => ({
      images,
      mangaId,
    }));

    const updatesWithNewChapters = updateData.filter(
      (d) => config.updateSettings.forceUpdateManga || d.newChapterCount > 0
    );

    await updateProgress({ stage: 'sending_updates', progress: 30 });

    // Send update data
    const resp = await fetchWithTimeout(
      `${config.serverCom.serverUrl}/api/serverReq/data/updateManga`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.serverCom.apiKey,
        },
        body: JSON.stringify({
          newData: updatesWithNewChapters,
        }),
      }
    );

    if (!resp.ok) {
      if (config.notif.batchFailureNotif) {
        await sendNotif(`Failed to send update Data!`, `Error ${resp.status}:${resp.statusText}`);
      }
      console.warn(await resp.text());
    } else {
      const msg = `${updatesWithNewChapters.length}/${job.data.total} updated, ${totalNewChapters} new chapters, ${totalFailedCount} failed`;
      if (config.notif.batchSuccessNotif) {
        await sendNotif(`Update Success`, msg);
      }
      console.log(msg);
    }

    await updateProgress({ stage: 'saving_images', progress: 50 });

    const BATCH_SIZE = 5;

    let totalImages = imageData.reduce((acc, m) => acc + m.images.length, 0);
    let processedImages = 0;
    let savedImageCount = 0;
    let failedImageCount = 0;

    const imageJobs = imageData.flatMap((manga) =>
      manga.images.map((img) => ({
        mangaId: manga.mangaId,
        img,
      }))
    );

    for (let i = 0; i < imageJobs.length; i += BATCH_SIZE) {
      if (totalImages === 0) {
        await job.updateProgress({
          stage: 'done',
          progress: 100,
          timestamp: Date.now(),
        });
        return;
      }

      const batch = imageJobs.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ mangaId, img }) => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const resp = await fetch(
              `${config.serverCom.serverUrl}/api/serverReq/data/saveCoverImage`,
              {
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
                signal: controller.signal,
              }
            );

            clearTimeout(timeout);

            if (!resp.ok) {
              failedImageCount++;
            } else {
              savedImageCount++;
            }
          } catch (err) {
            failedImageCount++;
            console.warn(`Image upload failed`);
          }

          processedImages++;
        })
      );

      // Update progress after each batch
      await job.updateProgress({
        stage: 'saving_images',
        progress: 50 + Math.floor((processedImages / totalImages) * 50),
        processedImages,
        totalImages,
        timestamp: Date.now(),
      });
    }

    await updateProgress({ stage: 'done', progress: 100 });

    return {
      total: results.length,
      successfulCount: results.length,
      failedCount: totalFailedCount,
      savedImageCount,
      failedImageCount,
    };
  },
  { connection }
);
