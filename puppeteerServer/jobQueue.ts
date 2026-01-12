import config from './config.json';
import puppeteer from 'puppeteer-extra';
import { Browser } from 'puppeteer';

//puppeteer plugins
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { sites } from './puppeteerScripts/sites';
// import { connection } from './connections';

puppeteer.use(stealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

let browser: Browser | null = null;
export async function getBrowser() {
  if (!browser) {
    const launchArgs = [
      '--disable-gpu',
      '--enable-features=NetworkService',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--mute-audio',
    ];

    if (config.debug.remotePuppetDebug) {
      const port = config.debug.remotePuppetDebugPort ?? 9222;
      launchArgs.push(`--remote-debugging-port=${port}`);
      if (config.debug.verboseLogging) {
        console.log(`Puppeteer remote debugging enabled on port ${port}`);
      }
    }

    browser = await puppeteer.launch({
      executablePath: config.browserPath,
      headless: config.debug.headlessBrowser,
      devtools: false,
      acceptInsecureCerts: true,
      args: launchArgs,
    });
    if (config.debug.verboseLogging) console.log('Stated Puppeteer!');
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
    await Promise.all(sites.map((site) => site.queue.close()));

    if (browser) await browser.close();
  } catch (error) {
    console.error(error);
    console.log('Unable to gracefully shutdown!');
    process.exit(1);
  }

  console.info('Shutdown Complete!');

  process.exit(0);
}

if (config.debug.memoryLogging) {
  setInterval(async () => {
    const contexts = browser.browserContexts();
    let totalPages = 0;

    for (const ctx of contexts) {
      totalPages += (await ctx.pages()).length;
    }

    console.log({
      contexts: contexts.length,
      pages: totalPages,
      targets: browser.targets().length,
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    });
  }, 5000);
}
