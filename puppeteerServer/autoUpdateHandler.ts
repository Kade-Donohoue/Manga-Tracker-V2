import { FlowProducer, Job, Queue, Worker } from 'bullmq';
import { resolveSiteForUrl, sites } from './puppeteerScripts/sites';
import { connection } from './connections';
import config from './config.json';
import { getJobByFullId, sendNotif } from './util';
import { oldMangaData } from './types';

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
    const childrenResults = await job.getChildrenValues();

    const results = await Promise.all(
      Object.entries(childrenResults).map(async ([jobId, value]) => {
        const job = await getJobByFullId(jobId);
        return job;
      })
    );
    const totalFailedCount = job.data.total - results.length;

    if (totalFailedCount > 0) {
      const failures = await job.getIgnoredChildrenFailures();
      const title = `Jobs: ${totalFailedCount}/${results.length} failed`;

      const queueCounts: Record<string, number> = {};

      for (const childJobId of Object.keys(failures)) {
        const childJob = await getJobByFullId(childJobId);
        if (!childJob) continue;

        const queueName = childJob.queueName ?? 'unknown';

        queueCounts[queueName] = (queueCounts[queueName] ?? 0) + 1;
      }

      const body = Object.entries(queueCounts)
        .map(([queue, count]) => `${queue}: ${count}`)
        .join('\n');

      console.warn(title, queueCounts);
      await sendNotif(title, body);
    }

    let totalNewChapters = 0;

    let updateData = results.map(
      ({ returnvalue: { images, ...rest }, data: { oldSlugList, mangaId } }) => {
        // Split old and new slugs by comma and trim whitespace
        const oldSlugs = oldSlugList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const newSlugs = rest.slugList
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        // Find difference: slugs in newSlugs not in oldSlugs
        const newChapters = newSlugs.filter((slug) => !oldSlugs.includes(slug));
        totalNewChapters += newChapters.length;

        return {
          ...rest,
          mangaId,
          oldSlugList,
          newChapterCount: newChapters.length,
        };
      }
    );

    let imageData = results.map(({ returnvalue: { images, ...rest }, data: { mangaId } }) => {
      return {
        images,
        mangaId,
      };
    });

    // If you want only entries where there are actually new chapters
    const updatesWithNewChapters = updateData.filter((d) => d.newChapterCount > 0);

    // console.log(updateData);
    // return;
    const resp = await fetch(`${config.serverCom.serverUrl}/api/serverReq/data/updateManga`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.serverCom.apiKey,
      },
      body: JSON.stringify({
        newData: updatesWithNewChapters,
      }),
    });

    if (!resp.ok) {
      if (config.notif.batchFailureNotif) {
        await sendNotif(
          `Failed to send update Data!`,
          `Encountered Error ${resp.status}:${resp.statusText}, Check Puppeteer Logs!`
        );
      }
      console.warn(resp);
      const err = await resp.json();
      console.warn(err);
    } else {
      const successMessage = `${updatesWithNewChapters.length} / ${results.length} Manga Update Saved With ${totalNewChapters} New Chapters! ${totalFailedCount} Failed.`;
      if (config.notif.batchSuccessNotif) {
        await sendNotif(`Puppeteer: Successfully sent update Data!`, successMessage);
      }
      console.log(successMessage);
    }

    let savedImageCount = 0;
    let failedImageCount = 0;

    for (let i = 0; i < imageData.length; i++) {
      const manga = imageData[i];

      if (!manga.images.length) continue;
      console.log(`Saving ${manga.images.length} Images for mangaId: ${manga.mangaId}`);

      for (let j = 0; j < manga.images.length; j++) {
        const resp = await fetch(
          `${config.serverCom.serverUrl}/api/serverReq/data/saveCoverImage`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.serverCom.apiKey,
            },
            body: JSON.stringify({
              img: manga.images[j].image,
              index: manga.images[j].index,
              mangaId: manga.mangaId,
            }),
          }
        );

        if (config.debug.verboseLogging) {
          console.log(manga.images[j].image);
          console.log(resp);
          console.log(await resp.json());
        }
        if (!resp.ok) {
          console.warn(`Failed to save!; ${manga.mangaId}`);
          failedImageCount++;
          continue;
        }
        savedImageCount++;
      }
    }
    return {
      total: results.length,
      successfulCount: results.length,
      failedCount: totalFailedCount,
    };
  },
  { connection }
);
