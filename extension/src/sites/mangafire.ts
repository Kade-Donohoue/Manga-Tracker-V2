import { SiteAdapter } from '../core/types';
import { logger } from '../shared/logger';
import { waitForElement } from '../core/waitForElement';

export const mangafireAdapter: SiteAdapter = {
  matches: (url) => url.hostname.includes('mangafire') && url.pathname.includes('/chapter'),

  getSourceId: () => {
    const syncData = document.getElementById('syncData');
    const rawData = syncData?.textContent || syncData?.innerHTML;
    if (rawData) {
      try {
        const data: unknown = JSON.parse(rawData);
        const mangaId = findMangaId(data);
        if (mangaId !== undefined) return String(mangaId);
      } catch (error) {
        logger.warn('mangafire: failed to parse syncData', error);
      }
    }

    logger.warn('mangafire: canonical manga_id not found in syncData');
    return 'Unknown';
  },
  getSiteName: () => 'mangafire',
  getChapterId: () => location.pathname.split('-').at(-1) ?? location.pathname,

  createTracker: async (onComplete) => {
    const mangaId = await waitForMangaId();
    if (mangaId === undefined) {
      logger.warn('mangafire: syncData manga_id not found');

      return {
        start() {},
        stop() {},
      };
    }

    const selector = '.reader__end-btn';

    const el = await waitForElement(selector);

    if (!el) {
      logger.warn('mangafire: end marker not found');

      return {
        start() {},
        stop() {},
      };
    }

    let observer: IntersectionObserver | undefined;
    let triggered = false;
    let startTime = Date.now();

    return {
      start() {
        startTime = Date.now();

        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (triggered) return;

              if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
                const timeSpent = Date.now() - startTime;

                if (timeSpent < 10000) {
                  logger.warn('mangafire: intersection reached too quickly', timeSpent);

                  return;
                }

                triggered = true;

                onComplete({ timeSpent });

                observer?.disconnect();
              }
            }
          },
          { threshold: 0.75 }
        );

        observer.observe(el);
      },

      stop() {
        observer?.disconnect();
      },
    };
  },

  // createTracker: async (onComplete) => {
  //   const currentSel = 'b.current-page';
  //   const totalSel = 'b.total-page';
  //   const chapterSel = 'b.current-number';

  //   logger.info('mangafire: createTracker initialized', { currentSel, totalSel, chapterSel });

  //   const currentEl = await waitForElement(currentSel);
  //   const totalEl = await waitForElement(totalSel);
  //   const chapterEl = await waitForElement(chapterSel);

  //   if (!currentEl || !totalEl || !chapterEl) {
  //     logger.warn('mangafire: failed to locate page elements');

  //     return {
  //       start() {},
  //       stop() {},
  //     };
  //   }

  //   let observer: MutationObserver | undefined;
  //   let triggered = false;
  //   let startTime = Date.now();
  //   let highestSeen = 0;
  //   let currentChapter = chapterEl.textContent?.trim() ?? '';

  //   const parseNum = (el: Element) => Number(el.textContent?.trim() ?? '0');

  //   const resetTracker = (newChapter: string) => {
  //     logger.info('mangafire: chapter changed, resetting tracker state', {
  //       previousChapter: currentChapter,
  //       newChapter,
  //     });
  //     currentChapter = newChapter;
  //     triggered = false;
  //     startTime = Date.now();
  //     highestSeen = 0;
  //   };

  //   const handler = () => {
  //     const chapterText = chapterEl.textContent?.trim() ?? '';
  //     if (!chapterText) return;

  //     if (chapterText !== currentChapter) {
  //       resetTracker(chapterText);
  //     }

  //     if (triggered) return;

  //     const current = parseNum(currentEl);
  //     const total = parseNum(totalEl);

  //     logger.debug('mangafire: page counters', { currentChapter, current, total });

  //     if (Number.isNaN(current) || Number.isNaN(total) || total <= 0) return;

  //     if (current > highestSeen) highestSeen = current;

  //     const reachedEnd = current >= total && highestSeen >= total - 1;
  //     if (!reachedEnd) return;

  //     const timeSpent = Date.now() - startTime;
  //     const minimumTimeMs = Math.max(total * 1500, 10000);

  //     if (timeSpent < minimumTimeMs) {
  //       logger.warn('mangafire: reached end too quickly', { timeSpent, minimumTimeMs });
  //       return;
  //     }

  //     triggered = true;

  //     onComplete({ timeSpent, currentPage: current, totalPages: total });
  //   };

  //   return {
  //     start() {
  //       startTime = Date.now();

  //       observer = new MutationObserver(handler);

  //       observer.observe(document.body, {
  //         childList: true,
  //         subtree: true,
  //         characterData: true,
  //       });

  //       handler();
  //     },

  //     stop() {
  //       observer?.disconnect();
  //     },
  //   };
  // },
};

async function waitForMangaId(timeout = 15000): Promise<string | number | undefined> {
  const readMangaId = () => {
    const syncData = document.getElementById('syncData');
    const rawData = syncData?.textContent || syncData?.innerHTML;
    if (!rawData) return undefined;

    try {
      return findMangaId(JSON.parse(rawData));
    } catch {
      return undefined;
    }
  };

  const existingMangaId = readMangaId();
  if (existingMangaId !== undefined) return existingMangaId;

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const mangaId = readMangaId();
      if (mangaId === undefined) return;

      window.clearTimeout(timeoutId);
      observer.disconnect();
      resolve(mangaId);
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(undefined);
    }, timeout);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
}

function findMangaId(value: unknown): string | number | undefined {
  if (!value || typeof value !== 'object') return undefined;

  if ('manga_id' in value) {
    const mangaId = value.manga_id;
    if (typeof mangaId === 'string' || typeof mangaId === 'number') return mangaId;
  }

  for (const child of Object.values(value)) {
    const mangaId = findMangaId(child);
    if (mangaId !== undefined) return mangaId;
  }

  return undefined;
}
