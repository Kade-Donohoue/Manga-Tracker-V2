import { logger } from '../shared/logger';
import type { Message } from '../shared/messaging';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://your-backend.com';

function extensionApiPath(path: string) {
  return `${BACKEND_URL}${path}`;
}

async function sendPost(path: string, body: unknown) {
  const response = await fetch(extensionApiPath(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data: json };
}

async function fetchUserCategories() {
  return sendPost('/api/data/pull/pullUserCategories', {});
}

async function addManga(url: string, userCat: string) {
  return sendPost('/api/data/add/addManga', { urls: [url], userCat });
}

async function checkAddStatus(batchId: string, fetchIds: string[]) {
  return sendPost('/api/data/add/checkStatus', { batchId, fetchIds });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAddStatus(batchId: string, fetchIds: string[]) {
  const maxAttempts = 20;
  const intervalMs = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await checkAddStatus(batchId, fetchIds);
    if (!result.ok) {
      throw new Error(result.data?.message || `Status request failed: ${result.status}`);
    }

    const status = result.data?.status;
    if (Array.isArray(status) && status.every((item: any) => item.status !== 'processing')) {
      return status;
    }

    await delay(intervalMs);
  }

  return null;
}

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  const handle = async () => {
    try {
      // msg.mangaData =  {mangaId: string, currentIndex: number, currentChap:string, slugList: string[]}
      if (msg.type === 'CHAPTER_REACHED') {
        await sendPost('/api/data/update/updateCurrentIndex', {
          mangaId: msg.payload.mangaData.mangaId,
          newIndex: msg.payload.newIndex,
        });
        sendResponse({ success: true });
        return;
      }

      if (msg.type === 'CHECK_TRACKING') {
        const response = await sendPost('/api/data/pull/isTracking', {
          sourceId: msg.payload.sourceId,
        });

        sendResponse({
          isTracking: response.ok && response.data?.tracking === true,
          mangaData: response.data?.tracked,
        });
        return;
      }

      if (msg.type === 'FETCH_CATEGORIES') {
        const response = await fetchUserCategories();
        if (!response.ok) {
          sendResponse({
            success: false,
            error: response.data?.message || `HTTP ${response.status}`,
          });
          return;
        }

        sendResponse({ success: true, cats: response.data?.cats ?? [] });
        return;
      }

      if (msg.type === 'ADD_TRACKING') {
        const userCat = msg.payload.userCat ?? 'reading';
        const addResponse = await addManga(msg.payload.url, userCat);

        if (!addResponse.ok) {
          sendResponse({
            success: false,
            error: addResponse.data?.message || `HTTP ${addResponse.status}`,
          });
          return;
        }

        const batchId = addResponse.data?.batchId;
        const fetchIds = Array.isArray(addResponse.data?.enqueued)
          ? addResponse.data.enqueued.map((item: any) => item.fetchId)
          : [];

        const status =
          batchId && fetchIds.length > 0 ? await waitForAddStatus(batchId, fetchIds) : null;

        sendResponse({
          success: true,
          batchId,
          fetchIds,
          status,
          errors: addResponse.data?.errors ?? [],
        });
        return;
      }
    } catch (error) {
      console.error(error);
      sendResponse({ success: false, error: String(error) });
    }
  };

  handle();
  return true;
});
