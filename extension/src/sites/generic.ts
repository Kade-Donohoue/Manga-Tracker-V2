import { SiteAdapter } from '../core/types';
import { logger } from '../shared/logger';

export const genericReaderAdapter: SiteAdapter = {
  matches: (url) => url.pathname.includes('/chapter/'),

  getSourceId: () => location.pathname,
  getSiteName: () => 'generic',

  getChapterId: () => location.pathname.split('/').at(-1) ?? location.pathname,

  createTracker: async (onComplete) => {
    // Generic fallback: observe scrolling and detect when the page bottom
    // element becomes visible. Sites should prefer providing their own logic.
    let observer: IntersectionObserver | undefined;
    let triggered = false;
    let startTime = Date.now();

    // Use the documentElement as a proxy for container bottom.
    const el = document.documentElement;

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
                  logger.warn('generic: reached bottom too quickly', timeSpent);

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
