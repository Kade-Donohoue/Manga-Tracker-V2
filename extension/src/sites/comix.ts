import { SiteAdapter } from '../core/types';
import { waitForElement } from '../core/waitForElement';
import { logger } from '../shared/logger';

export const comixAdapter: SiteAdapter = {
  matches: (url) => url.hostname.includes('comix') && url.pathname.includes('-chapter-'),

  getSourceId: () => {
    const match = location.pathname.match(/^\/title\/([a-zA-Z0-9]+)-/);

    const id = match?.[1];

    return id ?? location.pathname;
  },
  getSiteName: () => 'comix',
  getChapterId: () => location.pathname.split('/').at(-1) ?? location.pathname,

  createTracker: async (onComplete) => {
    const selector = 'div.rpage-chap-ending';

    const el = await waitForElement(selector);

    if (!el) {
      logger.warn('comix: end marker not found');

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
                  logger.warn('comix: intersection reached too quickly', timeSpent);

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
};
