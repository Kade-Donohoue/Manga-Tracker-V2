import { SiteAdapter } from '../core/types';
import { logger } from '../shared/logger';

export const mangadexAdapter: SiteAdapter = {
  matches: (url) => url.hostname.includes('mangadex.org') && url.pathname.includes('/chapter/'),

  getSourceId: () => {
    const anchor = document.querySelector<HTMLAnchorElement>('a.reader--header-manga');
    if (anchor?.href) {
      const match = anchor.href.match(/\/title\/([^\/]+)\//);
      if (match) {
        return match[1];
      }
    }

    const parts = location.pathname.split('/');
    return parts[2] ?? 'unknown';
  },

  getSiteName: () => 'mangadex',

  getChapterId: () => location.pathname.split('/').at(1) ?? location.pathname,

  createTracker: async (onComplete) => {
    const selector = 'div.reader--header-meta > div.reader--meta.page';

    logger.info('mangadex: createTracker initialized', selector);

    let observer: MutationObserver | undefined;
    let triggered = false;
    let startTime = Date.now();
    let highestPageSeen = 0;
    let currentChapter = location.pathname.split('/').at(1) ?? location.pathname;

    const getCurrentChapterId = () => location.pathname.split('/').at(1) ?? location.pathname;

    const parse = (text: string) => {
      const normalized = text.replace(/\s+/g, ' ').trim();

      const match = normalized.match(/(?:Pg\.?|Page)?\s*(\d+)\s*(?:\/|of)\s*(\d+)/i);
      if (match) {
        return { current: Number(match[1]), total: Number(match[2]) };
      }

      const numbers = Array.from(normalized.matchAll(/\d+/g), (m) => Number(m[0]));
      if (numbers.length >= 2) {
        return { current: numbers[0], total: numbers[1] };
      }

      return null;
    };

    const resetTracker = (newChapter: string) => {
      logger.info('mangadex: chapter changed, resetting tracker', {
        previousChapter: currentChapter,
        newChapter,
      });
      currentChapter = newChapter;
      triggered = false;
      startTime = Date.now();
      highestPageSeen = 0;
    };

    const waitForPageCounter = async (timeout = 15000): Promise<Element | null> => {
      const validate = (el: Element | null) => {
        if (!el) return false;
        const text = el.textContent?.trim() ?? '';
        return parse(text) !== null;
      };

      const existing = document.querySelector(selector);
      if (validate(existing)) {
        return existing;
      }

      return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
          observer?.disconnect();
          resolve(null);
        }, timeout);

        observer = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (validate(el)) {
            window.clearTimeout(timer);
            observer?.disconnect();
            resolve(el);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    };

    const element = await waitForPageCounter();
    if (!element) {
      logger.warn('mangadex: timed out waiting for valid page counter');
      return {
        start() {},
        stop() {},
      };
    }

    const handler = () => {
      const latestChapter = getCurrentChapterId();
      if (latestChapter !== currentChapter) {
        resetTracker(latestChapter);
      }

      if (triggered) return;

      const text = element.textContent?.trim() ?? '';
      const parsed = parse(text);
      if (!parsed) {
        logger.debug('mangadex: page text became invalid', text);
        return;
      }

      const { current, total } = parsed;
      logger.debug(`mangadex: page counter current/total: ${current}/${total}, raw: ${text}`);

      if (current > highestPageSeen) highestPageSeen = current;

      const reachedEnd = current >= total && highestPageSeen >= total - 1;
      if (!reachedEnd) return;

      const timeSpent = Date.now() - startTime;
      const minimumTimeMs = Math.max(total * 1500, 10000);
      if (timeSpent < minimumTimeMs) {
        logger.warn('mangadex: reached final page too quickly', { timeSpent, minimumTimeMs });
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
        observer.observe(element, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        handler();
      },

      stop() {
        observer?.disconnect();
      },
    };
  },
};
