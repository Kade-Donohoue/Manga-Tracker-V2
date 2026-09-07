import { useEffect, useState } from 'react';
import { authClient } from './auth/auth-client';

function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0] ?? null));
  });
}

function sendToTab(tabId: number, message: unknown): Promise<any> {
  return new Promise((resolve) => chrome.tabs.sendMessage(tabId, message, resolve));
}

function storageBoolean(key: string): Promise<boolean> {
  return new Promise((resolve) =>
    chrome.storage.local.get(key, (data) => resolve(Boolean(data[key])))
  );
}

function setStorageBoolean(key: string, value: boolean): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
}

export default function Popup() {
  const session = authClient.useSession();
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [pageInfo, setPageInfo] = useState<any>(null);
  const [paused, setPaused] = useState(false);
  const [logging, setLogging] = useState(false);
  const [indicatorDisabled, setIndicatorDisabled] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    Promise.all([
      queryActiveTab(),
      storageBoolean('trackingPaused'),
      storageBoolean('loggingEnabled'),
      storageBoolean('trackingIndicatorDisabled'),
    ])
      .then(async ([activeTab, isPaused, isLogging, isIndicatorDisabled]) => {
        setTab(activeTab);
        setPaused(isPaused);
        setLogging(isLogging);
        setIndicatorDisabled(isIndicatorDisabled);
        if (activeTab?.id) setPageInfo(await sendToTab(activeTab.id, { type: 'GET_PAGE_INFO' }));
      })
      .finally(() => setBusy(false));
  }, []);

  if (session.isPending || busy) return <PopupShell>Loading...</PopupShell>;
  const toggleIndicator = async () => {
    const next = !indicatorDisabled;
    setIndicatorDisabled(next);
    await setStorageBoolean('trackingIndicatorDisabled', next);
  };
  const indicatorOption = (
    <button onClick={toggleIndicator}>
      {indicatorDisabled ? 'Enable tracking indicator' : 'Disable tracking indicator'}
    </button>
  );

  if (session.error)
    return (
      <PopupShell>
        <p>Unable to load your session.</p>
        {indicatorOption}
      </PopupShell>
    );
  if (!session.data) {
    return (
      <PopupShell>
        <p>Sign in to sync your manga tracking.</p>
        <button
          onClick={() =>
            chrome.tabs.create({
              url: `${process.env.PLASMO_PUBLIC_BACKEND_URL ?? 'https://manga.kdonohoue.com'}/sign-in`,
            })
          }
        >
          Open sign in
        </button>
        {indicatorOption}
      </PopupShell>
    );
  }

  const updatePaused = async () => {
    const next = !paused;
    setPaused(next);
    await setStorageBoolean('trackingPaused', next);
    if (tab?.id)
      await sendToTab(tab.id, { type: 'TRACKING_PAUSED_CHANGED', payload: { paused: next } });
  };

  const startTracking = async () => {
    if (!tab?.id) return;
    await sendToTab(tab.id, { type: 'OPEN_TRACK_PROMPT' });
  };

  return (
    <PopupShell>
      <div className="row">
        <strong>Tomari</strong>
        <span className={paused ? 'status off' : 'status on'}>{paused ? 'Paused' : 'Running'}</span>
      </div>
      <p className="muted">
        {pageInfo?.title
          ? `Currently watching ${pageInfo.title}`
          : 'Page not supported for tracking'}
      </p>
      <div className="actions">
        <button onClick={updatePaused}>{paused ? 'Resume tracking' : 'Pause tracking'}</button>
        <button
          onClick={async () => {
            const next = !logging;
            setLogging(next);
            await setStorageBoolean('loggingEnabled', next);
          }}
        >
          {logging ? 'Disable logging' : 'Enable logging'}
        </button>
        {pageInfo?.sourceId && !pageInfo.isTracking && (
          <button onClick={startTracking}>Start tracking</button>
        )}
        {indicatorOption}
      </div>
    </PopupShell>
  );
}

function PopupShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <style>{`body{margin:0;background:#0f172a;color:#f8fafc;font:14px system-ui,sans-serif}main{width:320px;padding:16px}.row{display:flex;justify-content:space-between;align-items:center}.muted{color:#cbd5e1}.status{padding:4px 8px;border-radius:8px}.on{background:#14532d}.off{background:#7f1d1d}.actions{display:flex;gap:8px;flex-wrap:wrap}button{border:0;border-radius:8px;padding:8px 10px;background:#2563eb;color:#fff;cursor:pointer}`}</style>
      {children}
    </main>
  );
}
