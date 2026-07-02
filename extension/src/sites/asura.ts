import { SiteAdapter } from '../core/types';
import { waitForElement } from '../core/waitForElement';
import { logger } from '../shared/logger';

export const asuraAdapter: SiteAdapter = {
  matches: (url) => url.hostname.includes('asurascans.com') && url.pathname.includes('/chapter/'),
  getSourceId: () => location.pathname.split('/')[2] ?? location.pathname,
  getSiteName: () => 'asura',
  getChapterId: () => location.pathname.split('/').at(-1) ?? location.pathname,

  createTracker: async (onComplete) => {
    const selector = 'a[href*="/chapter/"] > span.leading-none';

    const el = await waitForElement(selector);
    const anchor = el?.closest('a');

    if (!anchor) {
      logger.warn('asurascans.com: next chapter button not found');

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
                  logger.warn('asurascans.com: intersection reached too quickly', timeSpent);

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

        observer.observe(anchor);
      },

      stop() {
        observer?.disconnect();
      },
    };
  },
};
