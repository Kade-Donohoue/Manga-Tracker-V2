import { Job } from 'bullmq';
import config from './config.json';
import { comickGetWorker, comickQueue, getQueue, mainGetWorker } from './jobQueue';
import { dataType, fetchData, updateCollector } from './types';
import { validMangaCheck, sendNotif } from './util';

export function startAutoUpdate() {
  comickGetWorker.on('completed', mangaCompleteFuction);
  mainGetWorker.on('completed', mangaCompleteFuction);
  comickGetWorker.on('failed', mangaFailedEvent);
  mainGetWorker.on('failed', mangaFailedEvent);

  if (config.updateSettings.updateAtStart) updateAllManga();

  if (config.updateSettings.autoUpdateInfo)
    setInterval(updateAllManga, config.updateSettings.updateDelay);
}

const dataCollector = new Map<number, updateCollector>();

// start manga fetch
async function updateAllManga() {
  let date = new Date();
  console.log(`Updating all manga at ${date.toLocaleString()}`);
  try {
    const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/getAllManga`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        pass: config.serverCom.serverPassWord,
      },
    });
    if (config.logging.verboseLogging) console.log(resp);
    if (resp.status != 200) {
      if (config.notif.updateFetchFailureNotif) {
        await sendNotif(
          'Failed to get update Data!',
          `Encountered Error ${resp.status}:${resp.statusText}, Check Puppeteer Logs!`
        );
      }

      return console.log('issue fetching data to update all manga:');
    }

    const returnData: {
      mangaId: string;
      urlBase: string;
      slugList: string;
      mangaName: string;
      maxCoverIndex: number;
      maxSavedAt: string;
      specialFetchData: any;
    }[] = (await resp.json()).data;
    console.log(`Starting to Fetch ${returnData.length} Manga!`);
    // console.log(returnData)
    let batchId = Date.now();

    dataCollector.set(batchId, {
      batchId: batchId,
      batchData: {
        completedCount: 0,
        newChapterCount: 0,
        failedCount: 0,
        batchLength: returnData.length,
        newData: [],
      },
    });

    // let batchedJobs:{data:any,name:string,opts:any}[] = []
    const universalJobs: { data: any; name: string; opts: any }[] = [];
    const comickJobs: { data: any; name: string; opts: any }[] = [];
    let invalidCount = 0;
    for (var i = 0; i < returnData.length; i++) {
      let firstChapUrl = '';
      if (returnData[i].slugList.indexOf(',') == -1) {
        if (returnData[i].slugList.length <= 0) {
          console.log('Unable to find first chap skipping: ' + returnData[i].mangaId);
          if (config.logging.verboseLogging) console.log(returnData[i].slugList);
          // invalidCount++;
          const batch = dataCollector.get(batchId);
          batch.batchData.batchLength -= 1;
          continue;
        } else {
          firstChapUrl =
            returnData[i].urlBase +
            returnData[i].slugList.substring(0, returnData[i].slugList.length);
        }
      } else {
        firstChapUrl =
          returnData[i].urlBase +
          returnData[i].slugList.substring(0, returnData[i].slugList.indexOf(','));
      }
      if (config.logging.verboseLogging) console.log(firstChapUrl);

      const webSite = validMangaCheck(firstChapUrl);
      if (webSite.success === false) {
        console.log(
          `Disabled or Invalid URL in database, ${webSite.value}! Check your config and the database Skipping for now. mangaId:${returnData[i].mangaId}`
        );
        const batch = dataCollector.get(batchId);
        batch.batchData.batchLength -= 1;
        // console.log(batch.batchData.completedCount)
        continue;
      }
      if (config.logging.verboseLogging) console.log(returnData[i]);

      const job = {
        name: webSite.value,
        data: {
          type: webSite.value,
          url: firstChapUrl,
          mangaId: returnData[i].mangaId,
          getIcon: config.updateSettings.refetchImgs,
          update: true,
          length: returnData.length - invalidCount,
          oldSlugList: returnData[i].slugList,
          maxCoverIndex: returnData[i].maxCoverIndex,
          maxSavedAt: returnData[i].maxSavedAt,
          batchId: batchId,
          specialFetchData: returnData[i].specialFetchData,
          mangaName: returnData[i].mangaName,
        },
        opts: {
          priority: 2,
          removeOnComplete: config.queue.removeCompleted,
          removeOnFail: config.queue.removeFailed,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60_000,
          },
          name: webSite.value,
        },
      };

      if (webSite.value === 'comick') {
        comickJobs.push(job);
      } else {
        universalJobs.push(job);
      }
    }
    await getQueue.addBulk(universalJobs);
    await comickQueue.addBulk(comickJobs);

    if (config.logging.verboseLogging) console.log('Jobs Added to Queue');
  } catch (err) {
    console.error(err);
  }
}

async function mangaCompleteFuction(job: Job<dataType, fetchData>, returnvalue: fetchData) {
  if (job.data.update) {
    try {
      let batch = dataCollector.get(job.data.batchId);

      // console.log(job)
      batch.batchData.completedCount++;
      if (
        config.updateSettings.forceUpdateManga ||
        returnvalue.iconBuffer ||
        (returnvalue.slugList && returnvalue.slugList != job.data.oldSlugList) ||
        job.data.specialFetchData != returnvalue.specialFetchData
      ) {
        const chapterTextList = returnvalue.chapterTextList?.split(',') || [];

        const oldSlugs = job.data.oldSlugList?.split(',') || [];
        const newSlugs = returnvalue.slugList?.split(',') || [];

        const newChapterCount =
          Math.floor(
            parseFloat(chapterTextList.at(-1)) - parseFloat(chapterTextList[oldSlugs.length - 1])
          ) || 0;
        // const newChapterCountFallback = newSlugs.length - oldSlugs.length; idk use case yet but leaving for future

        if (config.logging.verboseLogging) console.log(returnvalue.urlBase);
        if (config.logging.verboseLogging) logArrayDifferences(oldSlugs, newSlugs);

        if (newChapterCount != 0) batch.batchData.newChapterCount += newChapterCount;
        batch.batchData.newData.push({
          ...returnvalue,
          mangaId: job.data.mangaId,
          newChapterCount: newChapterCount,
        });
      }
      if (config.queue.instantClearJob) await job.remove();

      // console.log(batch.batchData.batchLength, batch.batchData.completedCount);
      if (batch.batchData.batchLength <= batch.batchData.completedCount) sendUpdate(batch);
    } catch (err) {
      console.log(err);
      console.log(job);
    }
  }
}

function logArrayDifferences(oldArr, newArr) {
  const maxLength = Math.max(oldArr.length, newArr.length);
  const diffs = {
    onlyInArr1: [],
    onlyInArr2: [],
    valueDifferences: [],
  };

  for (let i = 0; i < maxLength; i++) {
    const val1 = oldArr[i];
    const val2 = newArr[i];

    if (val1 !== undefined && val2 === undefined) {
      diffs.onlyInArr1.push({ index: i, value: val1 });
    } else if (val1 === undefined && val2 !== undefined) {
      diffs.onlyInArr2.push({ index: i, value: val2 });
    } else if (val1 !== val2) {
      diffs.valueDifferences.push({ index: i, arr1: val1, arr2: val2 });
    }
  }

  console.log('Only in oldArr:', diffs.onlyInArr1);
  console.log('Only in newArr:', diffs.onlyInArr2);
  console.log('Value differences:', diffs.valueDifferences);
}

async function mangaFailedEvent(job: Job) {
  if (!job.data.update) return;

  if (job.attemptsMade < (job.opts.attempts ?? 1)) {
    return;
  }

  if (config.notif.mangaFailureNotif) {
    await sendNotif(`${job.data.type} Failed!`, `A Job Has Failed!, jobId: ${job.id}`);
  }

  const batch = dataCollector.get(job.data.batchId);
  if (!batch) {
    console.warn(`Batch ${job.data.batchId} not found for failed job ${job.id}`);
    return;
  }

  console.log(`Adding Failed to complete Count`, batch.batchData.completedCount);
  batch.batchData.completedCount += 1;
  batch.batchData.failedCount += 1;

  if (config.queue.instantClearJob) await job.remove();

  if (batch.batchData.batchLength <= batch.batchData.completedCount) {
    sendUpdate(batch);
  }
}

async function sendUpdate(batch: updateCollector) {
  console.log('Sending Manga Update!');

  if (batch.batchData.newData.length > 0) {
    // returns all manga together if images not fetched
    const updateData = batch.batchData.newData.map(({ iconBuffer, ...rest }) => rest);
    const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/updateManga`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pass: config.serverCom.serverPassWord,
      },
      body: JSON.stringify({
        newData: updateData,
        amountNewChapters: 0, //batch.batchData.newChapterCount - some edge case causes this to become NaN.
        expiresAt: Date.now() + config.updateSettings.updateDelay + 50000, //50 extra seconds compared to what this pull took
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
    } else {
      const successMessage = `${batch.batchData.newData.length} / ${batch.batchData.completedCount} Manga Update Saved With ${batch.batchData.newChapterCount} New Chapters! ${batch.batchData.failedCount} Failed.`;
      if (config.notif.batchSuccessNotif) {
        await sendNotif(`Puppeteer: Successfully sent update Data!`, successMessage);
      }
      console.log(successMessage);
    }

    let savedImageCount = 0;
    let failedImageCount = 0;

    for (let i = 0; i < batch.batchData.newData.length; i++) {
      if (!batch.batchData.newData[i].iconBuffer) continue;
      console.log(`Saving Image for mangaId: ${batch.batchData.newData[i].mangaId}`);
      const resp = await fetch(`${config.serverCom.serverUrl}/serverReq/data/saveCoverImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pass: config.serverCom.serverPassWord,
        },
        body: JSON.stringify({
          img: batch.batchData.newData[i].iconBuffer,
          index: batch.batchData.newData[i].newCoverImageIndex,
          mangaId: batch.batchData.newData[i].mangaId,
        }),
      });

      if (config.logging.verboseLogging) console.log(resp);
      if (!resp.ok) {
        console.warn(`Failed to save!; ${batch.batchData.newData[i].mangaId}`);
        failedImageCount++;
        continue;
      }
      savedImageCount++;
    }

    const successMessage = `${savedImageCount} / ${
      savedImageCount + failedImageCount
    } Cover Images Saved!`;
    if (config.notif.batchSuccessNotif) {
      await sendNotif(`Puppeteer: Cover Images Saved!`, successMessage);
    }
    console.log(successMessage);
    // console.log('done, Its recomended to turn of auto update images now!');
  } else if (config.updateSettings.autoUpdateInfo)
    console.log('Update Complete! No New Chapters Found!');
  dataCollector.delete(batch.batchId);
}
