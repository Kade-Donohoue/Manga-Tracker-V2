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

export const mangaFireQueue = new Queue('MangaFire Manga Queue', {
  connection,
});

export let mainGetWorker: Worker | null = null;
export let mangaFireGetWorker: Worker | null = null;

let mangaFireLimiter = config.updateSettings.intitalMangaFire
  ? { max: 1, duration: 2000 }
  : { max: config.rateLimits.mangaFireMax, duration: config.rateLimits.mangaFireDuration };

export function createWorkers() {
  mainGetWorker = new Worker('Get Manga Queue', mangaGetProc, {
    connection,
    concurrency: config.queue.instances,
    name: 'universal',
  });

  mangaFireGetWorker = new Worker('MangaFire Manga Queue', mangaGetProc, {
    connection,
    concurrency: config.queue.mangaFireInstances,
    name: 'mangafire',
    limiter: mangaFireLimiter,
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

    mangaFireGetWorker.on('ready', () => {
      console.log('Comick worker ready');
    });
    mangaFireGetWorker.on('error', (err) => {
      console.error('Comick worker error:', err);
    });
    mangaFireGetWorker.on('failed', (job, err) => {
      console.error(`Comick job ${job.id} failed:`, err);
    });
    mangaFireGetWorker.on('completed', (job) => {
      console.log(`Comick job ${job.id} completed`);
    });
  }

  return { mainGetWorker, mangaFireGetWorker };
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
    await mangaFireGetWorker.close();

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
