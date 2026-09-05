import config from './config.json';
import { BrowserContext, chromium } from 'patchright';

import { sites } from './puppeteerScripts/sites';
// import { connection } from './connections';

let browserContext: BrowserContext | null = null;
export async function getBrowser() {
  if (!browserContext) {
    // const launchArgs = [
    //   '--disable-gpu',
    //   '--enable-features=NetworkService',
    //   '--no-sandbox',
    //   '--disable-setuid-sandbox',
    //   '--mute-audio',
    // ];

    // if (config.debug.remotePuppetDebug) {
    //   const port = config.debug.remotePuppetDebugPort ?? 9222;
    //   launchArgs.push(`--remote-debugging-port=${port}`);
    //   if (config.debug.verboseLogging) {
    //     console.log(`Puppeteer remote debugging enabled on port ${port}`);
    //   }
    // }

    let browser = await chromium.launch({
      headless: config.debug.headlessBrowser,
      channel: 'chrome',
      // args: launchArgs,
    });
    if (config.debug.verboseLogging) console.log('Stated Puppeteer!');

    browserContext = await browser.newContext();

    await browserContext.newPage();
  }

  // browser.on('targetcreated', async (target) => {
  //   if (target.type() !== 'page') return;

  //   const page = await target.page();
  //   if (!page) return;

  //   await page.evaluateOnNewDocument(() => {
  //     window.open = () => null;
  //   });
  // });

  return browserContext;
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

    if (browserContext) await browserContext.close();
  } catch (error) {
    console.error(error);
    console.log('Unable to gracefully shutdown!');
    process.exit(1);
  }

  console.info('Shutdown Complete!');

  process.exit(0);
}

// if (config.debug.memoryLogging) {
//   setInterval(async () => {
//     if (!browser) return;
//     const contexts = browser.browserContexts();
//     let totalPages = 0;

//     for (const ctx of contexts) {
//       totalPages += (await ctx.pages()).length;
//     }

//     console.log({
//       contexts: contexts.length,
//       pages: totalPages,
//       targets: browser.targets().length,
//       heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
//     });
//   }, 5000);
// }
