import { logger } from '../shared/logger';

export async function waitForElement(selector: string, timeout = 15000): Promise<Element | null> {
  logger.info(`Waiting for element: ${selector}`);

  const existing = document.querySelector(selector);

  if (existing) {
    logger.info('Element already exists', existing);

    return existing;
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);

      if (el) {
        logger.info('Element appeared', el);

        observer.disconnect();

        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      logger.warn(`Timed out waiting for ${selector}`);

      observer.disconnect();

      resolve(null);
    }, timeout);
  });
}
