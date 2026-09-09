import { getAdapter } from '../sites';
import { logger } from '../shared/logger';
import type { Message } from '../shared/messaging';
import type { SiteAdapter } from '../core/types';

logger.info('Content script loaded', location.href);

function sendSessionMessage(): Promise<{ authenticated: boolean }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
      resolve({ authenticated: response?.authenticated === true });
    });
  });
}

function showLoginWarning() {
  if (document.getElementById('tomari-login-warning')) return;

  const host = document.createElement('div');
  host.id = 'tomari-login-warning';
  const shadow = host.attachShadow({ mode: 'closed' });
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';

  const style = document.createElement('style');
  style.textContent = `
    .warning { max-width: min(360px, calc(100vw - 32px)); padding: 16px; border: 1px solid rgba(148,163,184,.2); border-radius: 10px; background: #0f172a; color: #f8fafc; box-shadow: 0 8px 24px rgba(2,6,23,.6); font: 14px/1.4 system-ui,sans-serif; }
    .title { margin: 0 0 6px; font-weight: 700; }
    .message { margin: 0 0 12px; color: #cbd5e1; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
    button { border: 0; border-radius: 8px; padding: 7px 10px; cursor: pointer; font: inherit; }
    .dismiss { background: rgba(255,255,255,.06); color: #e2e8f0; }
    .never { background: transparent; color: #94a3b8; margin-right: auto; padding-left: 0; padding-right: 0; }
    .sign-in { background: #3b82f6; color: white; }
  `;

  const warning = document.createElement('section');
  warning.className = 'warning';
  warning.setAttribute('role', 'status');

  const title = document.createElement('p');
  title.className = 'title';
  title.textContent = 'Sign in to Tomari Manga Tracker';

  const message = document.createElement('p');
  message.className = 'message';
  message.textContent =
    'Sign in to Tomari to save your reading progress and track this manga across sites.';

  const actions = document.createElement('div');
  actions.className = 'actions';

  const dismiss = document.createElement('button');
  dismiss.className = 'dismiss';
  dismiss.textContent = 'Dismiss';
  dismiss.addEventListener('click', () => host.remove());

  const neverRemind = document.createElement('button');
  neverRemind.className = 'never';
  neverRemind.textContent = "Don't remind me";
  neverRemind.addEventListener('click', () => {
    chrome.storage.local.set({ loginReminderDisabled: true });
    host.remove();
  });

  const signIn = document.createElement('button');
  signIn.className = 'sign-in';
  signIn.textContent = 'Sign in';
  signIn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIGN_IN' });
    host.remove();
  });

  actions.append(neverRemind, dismiss, signIn);
  warning.append(title, message, actions);
  shadow.append(style, warning);
  document.documentElement.appendChild(host);
}

async function showLoginWarningIfNeeded() {
  try {
    const reminderSettings = await new Promise<any>((resolve) =>
      chrome.storage.local.get('loginReminderDisabled', (settings) => resolve(settings))
    );
    if (reminderSettings?.loginReminderDisabled === true) return;

    const session = await sendSessionMessage();
    if (!session.authenticated) showLoginWarning();
  } catch (error) {
    logger.warn('Unable to check login state', error);
  }
}

type TrackingIndicatorState = 'checking' | 'watching' | 'tracking' | 'read';

let trackingIndicatorHost: HTMLDivElement | null = null;
let trackingIndicatorPill: HTMLDivElement | null = null;
let trackingIndicatorCollapsed = false;
let trackingIndicatorDisabled = false;
let trackingIndicatorState: TrackingIndicatorState | null = null;

function updateTrackingIndicator(state: TrackingIndicatorState) {
  trackingIndicatorState = state;
  if (trackingIndicatorDisabled) return;

  if (!trackingIndicatorHost) {
    trackingIndicatorHost = document.createElement('div');
    trackingIndicatorHost.id = 'tomari-tracking-indicator';
    trackingIndicatorHost.style.cssText =
      'position:fixed;left:16px;bottom:16px;z-index:2147483647;pointer-events:auto;';

    const shadow = trackingIndicatorHost.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      .pill { display:flex; align-items:center; gap:7px; padding:7px 10px; border:1px solid rgba(148,163,184,.2); border-radius:999px; background:#0f172a; color:#cbd5e1; box-shadow:0 8px 24px rgba(2,6,23,.45); font:12px/1 system-ui,sans-serif; cursor:pointer; }
      .pill.collapsed { padding:7px; }
      .pill.collapsed span:last-child { display:none; }
      .dot { display:inline-flex; align-items:center; justify-content:center; width:7px; height:7px; border-radius:50%; background:#60a5fa; box-shadow:0 0 0 3px rgba(96,165,250,.16); font-size:7px; line-height:1; color:#eff6ff; }
      .checking { color:#fef3c7; }
      .checking .dot { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.18); }
      .tracking { color:#dcfce7; }
      .tracking .dot { background:#4ade80; box-shadow:0 0 0 3px rgba(74,222,128,.16); }
      .read { color:#dcfce7; }
      .read .dot { background:#15803d; color:#f0fdf4; box-shadow:0 0 0 3px rgba(21,128,61,.2); }
      .read .dot { width:10px; height:10px; font-size:8px; font-weight:800; }
    `;

    trackingIndicatorPill = document.createElement('div');
    trackingIndicatorPill.className = 'pill';
    trackingIndicatorPill.setAttribute('role', 'button');
    trackingIndicatorPill.setAttribute('aria-label', 'Toggle tracking status label');
    trackingIndicatorPill.addEventListener('click', () => {
      trackingIndicatorCollapsed = !trackingIndicatorCollapsed;
      chrome.storage.local.set({ trackingIndicatorCollapsed });
      trackingIndicatorPill?.classList.toggle('collapsed', trackingIndicatorCollapsed);
    });
    const dot = document.createElement('span');
    dot.className = 'dot';
    const label = document.createElement('span');
    trackingIndicatorPill.append(dot, label);
    shadow.append(style, trackingIndicatorPill);
    document.documentElement.appendChild(trackingIndicatorHost);
  }

  const pill = trackingIndicatorPill;
  if (!pill) return;

  const isChecking = state === 'checking';
  const isTracking = state === 'tracking';
  const isRead = state === 'read';
  const dot = pill.firstElementChild as HTMLElement | null;

  pill.className = `${isChecking ? 'pill checking' : isRead ? 'pill read' : isTracking ? 'pill tracking' : 'pill'}${trackingIndicatorCollapsed ? ' collapsed' : ''}`;
  if (dot) {
    dot.textContent = isRead ? '✓' : '';
    dot.style.width = isRead ? '10px' : '7px';
    dot.style.height = isRead ? '10px' : '7px';
    dot.style.fontSize = isRead ? '8px' : '7px';
    dot.style.fontWeight = isRead ? '800' : '400';
    dot.style.color = isRead ? '#f0fdf4' : '#eff6ff';
    dot.style.background = isRead ? '#15803d' : isTracking ? '#4ade80' : '#60a5fa';
    dot.style.boxShadow = isRead
      ? '0 0 0 3px rgba(21,128,61,.2)'
      : isTracking
        ? '0 0 0 3px rgba(74,222,128,.16)'
        : '0 0 0 3px rgba(96,165,250,.16)';
  }
  pill.lastElementChild!.textContent = isChecking
    ? 'Checking if tracking…'
    : isRead
      ? 'Marked read'
      : isTracking
        ? 'Tracking · synced'
        : 'Watching · not saved';
}

function hideTrackingIndicator() {
  trackingIndicatorHost?.remove();
  trackingIndicatorHost = null;
  trackingIndicatorPill = null;
}

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
      updateTrackingIndicator('checking');
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
        updateTrackingIndicator('watching');
        return;
      }

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
        updateTrackingIndicator('watching');
        return;
      }

      updateTrackingIndicator('read');
      return;
    }

    const shouldTrack = await askStartTracking(title, sourceId);
    if (!shouldTrack) {
      logger.info('User declined to start tracking manga', sourceId);
      return;
    }

    logger.info('Starting tracking for manga', { sourceId, siteName, title });
    const added = await addTracking(sourceId, siteName, url, currentPage, totalPages, title);
    if (added) {
      updateTrackingIndicator('tracking');
      showNotification(`📚 "${title || sourceId}" added to your list!`, true);
    } else {
      showNotification(`❌ Failed to add "${title || sourceId}"`, false);
    }
  } catch (error) {
    logger.error('Tracking server communication failed', error);
  }
}

function getNavigationPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);

  if (
    location.hostname.includes('mangadex.org') &&
    segments[0] === 'chapter' &&
    segments.length > 2
  ) {
    segments.pop();
  }

  return `/${segments.join('/')}`;
}

async function main() {
  let adapter = getAdapter();

  try {
    const indicatorSettings = await new Promise<any>((resolve) =>
      chrome.storage.local.get(
        ['trackingIndicatorCollapsed', 'trackingIndicatorDisabled'],
        (settings) => resolve(settings)
      )
    );
    trackingIndicatorCollapsed = indicatorSettings?.trackingIndicatorCollapsed === true;
    trackingIndicatorDisabled = indicatorSettings?.trackingIndicatorDisabled === true;

    let tracker: any = null;
    let trackerGeneration = 0;

    async function startTracker() {
      if (tracker || !adapter) return;
      const trackerAdapter = adapter;
      const generation = trackerGeneration;
      try {
        const nextTracker = await trackerAdapter.createTracker((data) => {
          logger.info('Chapter completed', data);
          handleChapterCompletion(trackerAdapter, data);
        });

        if (generation !== trackerGeneration || trackerAdapter !== adapter) {
          nextTracker.stop();
          return;
        }

        tracker = nextTracker;
        tracker.start();
        updateTrackingIndicator('checking');
        void isTrackingManga(trackerAdapter.getSourceId(), trackerAdapter.getSiteName()).then(
          ({ isTracking }) => {
            if (tracker === nextTracker) {
              updateTrackingIndicator(isTracking ? 'tracking' : 'watching');
            }
          }
        );
        logger.info('Tracker started');
      } catch (err) {
        logger.warn('Failed to create/start tracker', err);
      }
    }

    function stopTracker() {
      trackerGeneration += 1;
      try {
        tracker?.stop?.();
      } catch (err) {
        // ignore
      }
      tracker = null;
      hideTrackingIndicator();
      logger.info('Tracker stopped');
    }

    async function isTrackingPaused() {
      const storage = await new Promise<any>((resolve) =>
        chrome.storage.local.get('trackingPaused', (res) => resolve(res))
      );
      return storage?.trackingPaused === true;
    }

    async function restartTrackerForNavigation() {
      stopTracker();
      adapter = getAdapter();

      if (!adapter) {
        logger.info('No adapter for new path');
        return;
      }

      void showLoginWarningIfNeeded();
      if (!(await isTrackingPaused())) await startTracker();
    }

    let previousPath = getNavigationPath(location.pathname);
    const navigationEvent = 'tomari:navigation';
    const notifyNavigation = () => window.dispatchEvent(new Event(navigationEvent));
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      notifyNavigation();
      return result;
    };
    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      notifyNavigation();
      return result;
    };

    const handleNavigation = () => {
      const nextPath = getNavigationPath(location.pathname);
      if (nextPath === previousPath) return;
      previousPath = nextPath;
      void restartTrackerForNavigation();
    };

    window.addEventListener(navigationEvent, handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    window.setInterval(() => {
      if (getNavigationPath(location.pathname) !== previousPath) handleNavigation();
    }, 500);

    if (!adapter) {
      logger.warn('No adapter');
    } else {
      void showLoginWarningIfNeeded();
    }

    // Respect a global pause flag stored in chrome.storage.local
    if (adapter && !(await isTrackingPaused())) {
      await startTracker();
    } else if (adapter) {
      logger.info('Tracking is paused, not starting tracker');
    }

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.trackingIndicatorDisabled) {
        trackingIndicatorDisabled = changes.trackingIndicatorDisabled.newValue === true;
        if (trackingIndicatorDisabled) hideTrackingIndicator();
        else if (trackingIndicatorState) updateTrackingIndicator(trackingIndicatorState);
      }
      if (changes.trackingPaused) {
        const newVal = changes.trackingPaused.newValue === true;
        if (newVal) stopTracker();
        else if (adapter) startTracker();
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
