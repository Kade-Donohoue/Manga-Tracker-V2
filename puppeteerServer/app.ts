import { getQueue, mangaFireQueue, getBrowser, createWorkers } from './jobQueue';
import { checkOpts, getOpts } from './types';
import { validMangaCheck } from './util';
import './mangaGetProc';
import fastify from 'fastify';
import config from './config.json';
import { startAutoUpdate } from './autoUpdateHandler';

const app = fastify();
const port = config.serverCom.localPort;
const host = '0.0.0.0'; //1.1.1.1 for local host only 0.0.0.0 for any interface
app.listen({ port: port, host: host }, async function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  if (config.queue.clearQueuesAtStart) {
    console.log("Clearing Queue! If this isn't the behavior you want mangaFireQueuemangafirechange it in config.json");
    await getQueue.obliterate({ force: true });
    await mangaFireQueue.obliterate({ force: true });
  }
  await getBrowser(); //called to initiate browser otherwise if multiple jobs run at same time multiple browsers can be opened

  createWorkers();

  startAutoUpdate();

  console.log(`Puppeteer server listening at: ${address}`);
});

//Starts manga fetch
app.get('/getManga', getOpts, async function (req, res) {
  let { pass, urls } = req.query as { pass: string; urls: string[] };

  // console.log(urls)

  if (pass != config.serverCom.serverPassWord)
    return res.status(401).send({ message: 'Unauthorized' });

  let errors: { message: string; url: string }[] = [];
  const universalJobs: { data: any; name: string; opts: any }[] = [];
  const mangafireJobs: { data: any; name: string; opts: any }[] = [];
  for (const url of urls) {
    const webSite = validMangaCheck(url);
    if (webSite.success === false) {
      errors.push({ message: webSite.value, url: url });
      continue;
    }

    const job = {
      name: webSite.value,
      data: {
        type: webSite.value,
        url: url.trim(),
        getIcon: true,
        update: false,
        maxCoverIndex: -1,
        maxSavedAt: 0,
      },
      opts: {
        priority: 1,
        removeOnComplete: config.queue.removeCompleted,
        removeOnFail: config.queue.removeFailed,
        name: webSite.value,
        timeout: 30_000,
      },
    };

    if (webSite.value === 'mangafire') {
      mangafireJobs.push(job);
    } else {
      universalJobs.push(job);
    }
  }

  const [universalAdded, mangafireAdded] = await Promise.all([
    getQueue.addBulk(universalJobs),
    mangaFireQueue.addBulk(mangafireJobs),
  ]);

  const jobs = [...universalAdded, ...mangafireAdded];

  const response = {
    addedManga: jobs.map((job) => {
      return { fetchId: job.id, url: job.data.url };
    }),
    errors: errors,
  };
  res.send(response);
});

// Checks manga status and returns data when done
app.get('/checkStatus/get', checkOpts, async function (req, res) {
  let { pass, fetchIds } = req.query as { pass: string; fetchIds: string[] };
  // console.log(fetchIds)

  if (pass != config.serverCom.serverPassWord)
    return res.status(401).send({ message: 'Unauthorized' });

  let data: { fetchId: string; status: string; statusCode: number; data: any }[] = [];
  for (const fetchId of fetchIds) {
    let job = await getQueue.getJob(fetchId);

    if (!job) {
      job = await mangaFireQueue.getJob(fetchId);
    }

    if (config.logging.verboseLogging) {
      console.log('status check current job: ');
      console.log(job);
    }

    if (!job) {
      console.log('Job Not Found!');
      data.push({ fetchId: fetchId, status: 'Not Found', statusCode: 404, data: null });
      continue;
    }

    if (await job.isCompleted()) {
      data.push({ fetchId: fetchId, status: 'Completed', statusCode: 200, data: job.returnvalue });
    } else if (await job.isFailed())
      data.push({ fetchId: fetchId, status: 'Failed', statusCode: 500, data: job.failedReason });
    else {
      data.push({ fetchId: fetchId, status: 'Still Processing', statusCode: 202, data: null });
      continue;
    }

    //if job is completed or failed and client requests status check remove job from queue to clean it up
    if (config.queue.instantClearJob) await job.remove();
  }

  res.status(200).send({ currentStatus: data });
});
