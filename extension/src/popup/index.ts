function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0] ? tabs[0] : null);
    });
  });
}

async function getPageInfo(tabId: number) {
  return new Promise<any>((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_INFO' }, (response) => {
      resolve(response);
    });
  });
}

async function sendToTab(tabId: number, msg: any) {
  return new Promise<any>((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (res) => resolve(res));
  });
}

async function getPaused() {
  return new Promise<boolean>((resolve) => {
    chrome.storage.local.get('trackingPaused', (data) => {
      resolve(Boolean(data.trackingPaused));
    });
  });
}

async function setPaused(v: boolean) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ trackingPaused: v }, () => resolve());
  });
}

async function getLogging() {
  return new Promise<boolean>((resolve) => {
    chrome.storage.local.get('loggingEnabled', (data) => {
      resolve(Boolean(data.loggingEnabled));
    });
  });
}

async function setLogging(v: boolean) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ loggingEnabled: v }, () => resolve());
  });
}

async function init() {
  const pauseBtn = document.getElementById('togglePause') as HTMLButtonElement;
  const actionBtn = document.getElementById('actionButton') as HTMLButtonElement;
  const loggerBtn = document.getElementById('toggleLogging') as HTMLButtonElement;
  const pageInfoEl = document.getElementById('pageInfo')!;
  const pausedStatus = document.getElementById('pausedStatus')!;

  let tab = await queryActiveTab();
  const paused = await getPaused();
  updatePausedUI(paused, pausedStatus, pauseBtn);
  const logging = await getLogging();
  updateLoggingUI(logging, loggerBtn);

  if (!tab || !tab.id) {
    pageInfoEl.textContent = 'No active tab';
    actionBtn.disabled = true;
    return;
  }

  const info = await getPageInfo(tab.id);
  if (!info || !info.sourceId) {
    pageInfoEl.textContent = 'Page not supported for tracking';
    actionBtn.textContent = 'Open App';
    actionBtn.onclick = () => window.open('https://manga.kdonohoue.com', '_blank');
    return;
  }

  pageInfoEl.textContent = `Currently Watching ${info.title || info.sourceId}`;

  if (info.isTracking) {
    actionBtn.textContent = 'Already tracking';
    actionBtn.onclick = () => {
      // Could open server page for manga - for now just notify
      window.open('https://manga.kdonohoue.com', '_blank');
    };
  } else {
    actionBtn.textContent = 'Start tracking';
    actionBtn.onclick = async () => {
      actionBtn.disabled = true;
      const res = await sendToTab(tab!.id!, { type: 'OPEN_TRACK_PROMPT' });
      actionBtn.disabled = false;
      if (res && res.started) {
        actionBtn.textContent = 'Started';
      } else {
        actionBtn.textContent = 'Failed';
      }
    };
  }

  pauseBtn.onclick = async () => {
    const newVal = !(await getPaused());
    await setPaused(newVal);
    updatePausedUI(newVal, pausedStatus, pauseBtn);
    // notify content script to start/stop trackers
    await sendToTab(tab!.id!, { type: 'TRACKING_PAUSED_CHANGED', payload: { paused: newVal } });
  };

  loggerBtn.onclick = async () => {
    console.log(await getLogging());
    const newVal = !(await getLogging());
    console.log('Setting logging to', newVal);
    await setLogging(newVal);

    updateLoggingUI(newVal, loggerBtn);
  };
}

function updatePausedUI(paused: boolean, el: HTMLElement, btn: HTMLButtonElement) {
  if (paused) {
    el.className = 'status on';
    el.textContent = 'Paused';
    btn.textContent = 'Resume tracking';
  } else {
    el.className = 'status off';
    el.textContent = 'Running';
    btn.textContent = 'Pause tracking';
  }
}

function updateLoggingUI(logging: boolean, btn: HTMLButtonElement) {
  if (logging) {
    btn.textContent = 'Disable Logging';
  } else {
    btn.textContent = 'Enable Logging';
  }
}

init().catch(console.error);
