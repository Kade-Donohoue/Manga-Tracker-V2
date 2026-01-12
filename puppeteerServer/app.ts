import { getBrowser } from './jobQueue';
// import './mangaGetProc';
import fastify from 'fastify';
import config from './config.json';
import { autoUpdateQueue, startAutoUpdate } from './autoUpdateHandler';
import { addMangaBatch, sites } from './puppeteerScripts/sites';
import { userQueue } from './user';
import { checkOpts, getOpts } from './types';

export const app = fastify();
const port = config.serverCom.localPort;
const host = '0.0.0.0'; //1.1.1.1 for local host only 0.0.0.0 for any interface
app.listen({ port: port, host: host }, async function (err, address) {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  if (config.queue.clearQueuesAtStart) {
    console.log(
      "Clearing Queue! If this isn't the behavior you want mangaFireQueuemangafirechange it in config.json"
    );
    await Promise.all([
      ...sites.map((site) => site.queue.obliterate({ force: true })),
      autoUpdateQueue.obliterate({ force: true }),
      // userQueue.obliterate({ force: true }),
    ]);
  }
  await getBrowser(); //called to initiate browser otherwise if multiple jobs run at same time multiple browsers can be opened

  await Promise.all(sites.map((site) => site.start()));

  startAutoUpdate();

  console.log(`Puppeteer server listening at: ${address}`);
});

//Starts manga fetch
app.get('/getManga', getOpts, async function (req, res) {
  let { pass, urls } = req.query as { pass: string; urls: string[] };

  if (pass != config.serverCom.serverPassWord)
    return res.status(401).send({ message: 'Unauthorized' });

  const queueResults = await addMangaBatch(urls, userQueue);
  res.send(queueResults);
});

// Checks manga status and returns data when done
app.get('/checkStatus/get', checkOpts, async function (req, res) {
  let { pass, batchId } = req.query as { pass: string; batchId: string };

  if (pass != config.serverCom.serverPassWord)
    return res.status(401).send({ message: 'Unauthorized' });

  let parentJob = await userQueue.getJob(batchId);

  if (!parentJob) return res.status(404).send({ message: 'Batch Not Found!' });

  if (await parentJob.isCompleted()) {
    return res.status(200).send({ batchId: parentJob.id, status: 'Completed' });
  } else if (await parentJob.isFailed()) return res.status(200).send({ batchId: parentJob.id, status: 'Failed' });
  return res.status(202).send({ batchId: parentJob.id, message: 'Still Processing' });
});
