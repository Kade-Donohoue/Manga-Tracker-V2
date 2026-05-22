import { SiteAdapter } from '../core/types';
import { logger } from '../shared/logger';
import { waitForElement } from '../core/waitForElement';

export const mangafireAdapter: SiteAdapter = {
  matches: (url) => url.hostname.includes('mangafire') && url.pathname.includes('/chapter-'),

  getSourceId: () => {
    const parts = location.pathname.split('/');
    const slugSegment = parts[2] ?? '';
    const match = slugSegment.match(/\.([^.\/]+)$/);
    if (match) {
      return match[1];
    }

    return parts[1].split('.')[1] ?? 'unknown';
  },
  getSiteName: () => 'mangafire',
  getChapterId: () => location.pathname.split('-').at(-1) ?? location.pathname,
  createTracker: async (onComplete) => {
    const currentSel = 'b.current-page';
    const totalSel = 'b.total-page';

    logger.info('mangafire: createTracker initialized', { currentSel, totalSel });

    const currentEl = await waitForElement(currentSel);
    const totalEl = await waitForElement(totalSel);

    if (!currentEl || !totalEl) {
      logger.warn('mangafire: failed to locate page elements');

      return {
        start() {},
        stop() {},
      };
    }

    let observer: MutationObserver | undefined;
    let triggered = false;
    let startTime = Date.now();
    let highestSeen = 0;

    const parseNum = (el: Element) => Number(el.textContent?.trim() ?? '0');

    const handler = () => {
      if (triggered) return;

      const current = parseNum(currentEl);
      const total = parseNum(totalEl);

      logger.debug('mangafire: page counters', { current, total });

      if (Number.isNaN(current) || Number.isNaN(total) || total <= 0) return;

      if (current > highestSeen) highestSeen = current;

      const reachedEnd = current >= total && highestSeen >= total - 1;

      if (!reachedEnd) return;

      const timeSpent = Date.now() - startTime;
      const minimumTimeMs = Math.max(total * 1500, 10000);

      if (timeSpent < minimumTimeMs) {
        logger.warn('mangafire: reached end too quickly', { timeSpent, minimumTimeMs });

        return;
      }

      triggered = true;

      onComplete({ timeSpent, currentPage: current, totalPages: total });

      observer?.disconnect();
    };

    return {
      start() {
        startTime = Date.now();

        observer = new MutationObserver(handler);

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        // run initial check
        handler();
      },

      stop() {
        observer?.disconnect();
      },
    };
  },
};
