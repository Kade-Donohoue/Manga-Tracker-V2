import { getAdapter } from '../sites';
import { logger } from '../shared/logger';
import type { Message } from '../shared/messaging';
import type { SiteAdapter } from '../core/types';

logger.info('Content script loaded', location.href);

function sendMessageToBackground<T extends Message>(message: T): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

async function isTrackingManga(
  sourceId: string,
  siteName: string
): Promise<{
  isTracking: boolean;
  mangaData: {
    mangaId: string;
    currentIndex: number;
    currentChap: string;
    slugList: string[];
  };
}> {
  const response = await sendMessageToBackground({
    type: 'CHECK_TRACKING',
    payload: { sourceId, siteName },
  });

  return { isTracking: response?.isTracking, mangaData: response?.mangaData };
}

async function addTracking(
  sourceId: string,
  siteName: string,
  url: string,
  currentPage: number,
  totalPages: number,
  title?: string,
  userCat = 'reading'
): Promise<boolean> {
  const response = await sendMessageToBackground({
    type: 'ADD_TRACKING',
    payload: { sourceId, siteName, url, currentPage, totalPages, title, userCat },
  });

  return response?.success === true;
}

async function sendChapterReached(
  sourceId: string,
  siteName: string,
  url: string,
  timeSpent: number,
  mangaData: {
    mangaId: string;
    currentIndex: number;
    currentChap: string;
    slugList: string[];
  },
  newIndex: number
): Promise<boolean> {
  const response = await sendMessageToBackground({
    type: 'CHAPTER_REACHED',
    payload: { url, timeSpent, mangaData, newIndex },
  });

  return response?.success === true;
}

function createTrackingPrompt(title: string, sourceId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });

    host.style.position = 'fixed';
    host.style.top = '12px';
    host.style.right = '12px';
    host.style.zIndex = '2147483648';
    host.style.pointerEvents = 'auto';

    const style = document.createElement('style');
    style.textContent = `
      .banner {
        position: fixed;
        top: 0;
        right: 0;
        margin: 12px;
        max-width: min(360px, calc(100vw - 24px));
        background: rgba(15, 23, 42, 0.96);
        color: #f8fafc;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        padding: 14px 16px;
        font-family: ui-sans-serif, system-ui, sans-serif;
        display: grid;
        gap: 10px;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }
      .title {
        font-size: 14px;
        font-weight: 700;
        margin: 0;
      }
      .description {
        font-size: 13px;
        line-height: 1.45;
        margin: 0;
        color: #cbd5e1;
      }
      .buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      button {
        border: none;
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 12px;
        cursor: pointer;
      }
      .cancel {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
      }
      .confirm {
        background: #3b82f6;
        color: white;
      }
      button:hover {
        filter: brightness(1.08);
      }
    `;

    const banner = document.createElement('div');
    banner.className = 'banner';

    const heading = document.createElement('div');
    heading.className = 'title';
    heading.textContent = 'Track this manga?';

    const description = document.createElement('div');
    description.className = 'description';
    description.textContent = `Would you like to start tracking “${title || sourceId}”?`;

    const buttons = document.createElement('div');
    buttons.className = 'buttons';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel';
    cancelButton.textContent = 'No, thanks';

    const confirmButton = document.createElement('button');
    confirmButton.className = 'confirm';
    confirmButton.textContent = 'Start tracking';

    buttons.append(cancelButton, confirmButton);
    banner.append(heading, description, buttons);
    shadow.append(style, banner);
    document.documentElement.appendChild(host);

    const cleanup = () => {
      host.remove();
    };

    cancelButton.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    confirmButton.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
  });
}

async function askStartTracking(title: string, sourceId: string) {
  return createTrackingPrompt(title, sourceId);
}

function showNotification(message: string, isSuccess: boolean, durationMs = 3000) {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'closed' });

  host.style.position = 'fixed';
  host.style.bottom = '12px';
  host.style.right = '12px';
  host.style.zIndex = '2147483648';
  host.style.pointerEvents = 'none';

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 0;
      right: 0;
      margin: 12px;
      max-width: min(320px, calc(100vw - 24px));
      padding: 12px 16px;
      border-radius: 8px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 13px;
      font-weight: 500;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(148, 163, 184, 0.16);
      animation: slideIn 0.3s ease-out;
    }
    .success {
      background: rgba(34, 197, 94, 0.96);
      color: #dcfce7;
    }
    .error {
      background: rgba(239, 68, 68, 0.96);
      color: #fee2e2;
    }
    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;

  const toast = document.createElement('div');
  toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
  toast.textContent = message;

  shadow.append(style, toast);
  document.documentElement.appendChild(host);

  setTimeout(() => {
    host.remove();
  }, durationMs);
}

async function handleChapterCompletion(adapter: SiteAdapter, data: any) {
  const sourceId = adapter.getSourceId();
  const siteName = adapter.getSiteName();
  const chapterId = adapter.getChapterId();

  if (!sourceId) {
    logger.warn('Could not determine source ID');
    return;
  }

  const title = document.title;
  const url = location.href;
  const currentPage = data.currentPage ?? 0;
  const totalPages = data.totalPages ?? 0;
  const timeSpent = data.timeSpent ?? 0;

  try {
    const { isTracking, mangaData } = await isTrackingManga(sourceId, siteName);

    if (isTracking) {
      logger.info('User is tracking manga, sending chapter completion event', {
        sourceId,
        siteName,
        currentPage,
        totalPages,
      });

      const newIndex = mangaData.slugList.findIndex((slug) => slug === chapterId);

      if (newIndex === -1) {
        logger.warn('Current chapter ID not found in manga data slug list', {
          chapterId,
          slugList: mangaData.slugList,
        });
        return;
      } else {
        const success = await sendChapterReached(
          sourceId,
          siteName,
          url,
          timeSpent,
          mangaData,
          newIndex
        );
        if (!success) {
          logger.warn('Failed to send chapter completion event');
        }
        return;
      }
    }

    const shouldTrack = await askStartTracking(title, sourceId);
    if (!shouldTrack) {
      logger.info('User declined to start tracking manga', sourceId);
      return;
    }

    logger.info('Starting tracking for manga', { sourceId, siteName, title });
    const added = await addTracking(sourceId, siteName, url, currentPage, totalPages, title);
    if (added) {
      showNotification(`📚 "${title || sourceId}" added to your list!`, true);
    } else {
      showNotification(`❌ Failed to add "${title || sourceId}"`, false);
    }
  } catch (error) {
    logger.error('Tracking server communication failed', error);
  }
}

async function main() {
  const adapter = getAdapter();

  if (!adapter) {
    logger.warn('No adapter');
    return;
  }

  try {
    let tracker: any = null;

    async function startTracker() {
      if (tracker || !adapter) return;
      try {
        tracker = await adapter.createTracker((data) => {
          logger.info('Chapter completed', data);
          handleChapterCompletion(adapter, data);
        });
        tracker.start();
        logger.info('Tracker started');
      } catch (err) {
        logger.warn('Failed to create/start tracker', err);
      }
    }

    function stopTracker() {
      try {
        tracker?.stop?.();
      } catch (err) {
        // ignore
      }
      tracker = null;
      logger.info('Tracker stopped');
    }

    // Respect a global pause flag stored in chrome.storage.local
    const storage = await new Promise<any>((resolve) =>
      chrome.storage.local.get('trackingPaused', (res) => resolve(res))
    );

    const paused = storage?.trackingPaused === true;
    if (!paused) {
      await startTracker();
    } else {
      logger.info('Tracking is paused, not starting tracker');
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.trackingPaused) {
        const newVal = changes.trackingPaused.newValue === true;
        if (newVal) stopTracker();
        else startTracker();
      }
    });
  } catch (err) {
    logger.warn('Adapter did not provide a tracker or failed to create one', err);
  }
}

// Listen for messages from the popup (menu)
chrome.runtime.onMessage.addListener((msg: any, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === 'GET_PAGE_INFO') {
        const adapter = getAdapter();
        const sourceId = adapter?.getSourceId?.() ?? null;
        const siteName = adapter?.getSiteName?.() ?? null;
        const title = document.title;
        const url = location.href;

        if (!sourceId) {
          sendResponse({});
          return;
        }

        const { isTracking, mangaData } = await isTrackingManga(sourceId, siteName || 'unknown');
        sendResponse({ sourceId, siteName, title, url, isTracking, mangaData });
        return;
      }

      if (msg.type === 'OPEN_TRACK_PROMPT') {
        const adapter = getAdapter();
        const sourceId = adapter?.getSourceId?.() ?? null;
        const title = document.title;
        if (!sourceId) {
          sendResponse({ started: false });
          return;
        }

        const should = await askStartTracking(title, sourceId);
        if (!should) {
          sendResponse({ started: false });
          return;
        }

        // attempt to add tracking via background
        const added = await addTracking(
          sourceId,
          adapter?.getSiteName?.() ?? '',
          location.href,
          0,
          0,
          title
        );
        sendResponse({ started: !!added });
        return;
      }

      if (msg.type === 'TRACKING_PAUSED_CHANGED') {
        const paused = Boolean(msg.payload?.paused);
        chrome.storage.local.set({ trackingPaused: paused });
        sendResponse({ success: true });
        return;
      }
    } catch (err) {
      console.error(err);
      sendResponse({ error: String(err) });
    }
  })();
  return true;
});

main();
