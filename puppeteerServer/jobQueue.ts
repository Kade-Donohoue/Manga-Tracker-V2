import { Queue, Worker } from 'bullmq';
import config from './config.json';
import puppeteer from 'puppeteer-extra';
import { Browser } from 'puppeteer';
import mangaGetProc from './mangaGetProc';

//puppeteer plugins
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
puppeteer.use(stealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const connection = { host: config.queue.redisIp, port: 6379 };

export const getQueue = new Queue('Get Manga Queue', {
  connection,
});

export const comickQueue = new Queue('Comick Manga Queue', {
  connection,
});

export let mainGetWorker: Worker | null = null;
export let comickGetWorker: Worker | null = null;

export function createWorkers() {
  mainGetWorker = new Worker('Get Manga Queue', mangaGetProc, {
    connection,
    concurrency: config.queue.instances,
    name: 'universal',
  });

  comickGetWorker = new Worker('Comick Manga Queue', mangaGetProc, {
    connection,
    concurrency: config.queue.comickInstances,
    limiter: { max: 2, duration: 750 }, // comick has rate limit off 200/min. this will be 160 fetch attemts a min allowing some to do a full fetch(2 req) instead of just chapter data(1 req)
    name: 'comick',
  });

  if (config.logging.verboseLogging) {
    mainGetWorker.on('ready', () => {
      console.log('Main worker ready');
    });
    mainGetWorker.on('error', (err) => {
      console.error('Main worker error:', err);
    });
    mainGetWorker.on('failed', (job, err) => {
      console.error(`Main worker job ${job.id} failed:`, err);
    });
    mainGetWorker.on('completed', (job) => {
      console.log(`Main worker job ${job.id} completed`);
    });

    comickGetWorker.on('ready', () => {
      console.log('Comick worker ready');
    });
    comickGetWorker.on('error', (err) => {
      console.error('Comick worker error:', err);
    });
    comickGetWorker.on('failed', (job, err) => {
      console.error(`Comick job ${job.id} failed:`, err);
    });
    comickGetWorker.on('completed', (job) => {
      console.log(`Comick job ${job.id} completed`);
    });
  }

  return { mainGetWorker, comickGetWorker };
}

let browser: Browser | null = null;
export async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      devtools: false,
      acceptInsecureCerts: true,
      args: [
        '--disable-gpu, --enable-features=NetworkService',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--mute-audio',
      ],
    });
    if (config.logging.verboseLogging) console.log('Stated Puppeteer!');
  }
  return browser;
}

//cleanup on program termination
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

//shutdown on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, 'reason:', reason);
  shutdown().then(() => process.exit(1));
});

async function shutdown() {
  console.info('Shutting Down!');
  try {
    await mainGetWorker.close();
    await comickGetWorker.close();

    await getQueue.close();

    if (browser) await browser.close();
  } catch (error) {
    console.error(error);
    console.log('Unable to gracefully shutdown!');
    process.exit(1);
  }

  console.info('Shutdown Complete!');

  process.exit(0);
}
