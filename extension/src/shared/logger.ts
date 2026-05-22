const PREFIX = '[MangaTracker]';

let popupEnabled = true;
let toastRoot: ShadowRoot | null = null;

function initToastRoot() {
  if (typeof document === 'undefined') return null;
  if (toastRoot) return toastRoot;

  const host = document.createElement('div');

  // Important: don't block page interactions
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';

  // Wait until body exists (prevents blocking initial load)
  if (!document.body) {
    const obs = new MutationObserver(() => {
      if (document.body) {
        document.body.appendChild(host);
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.body.appendChild(host);
  }

  toastRoot = host.attachShadow({ mode: 'open' });
  return toastRoot;
}

function showPopup(message: string, type: string) {
  const root = initToastRoot();
  if (!root) return;

  const el = document.createElement('div');

  const colors: Record<string, string> = {
    info: '#2b6cb0',
    warn: '#b7791f',
    error: '#c53030',
    debug: '#4a5568',
  };

  el.textContent = message;
  el.style.cssText = `
    background: ${colors[type] || '#333'};
    color: white;
    padding: 8px 10px;
    margin: 8px;
    border-radius: 6px;
    font-size: 12px;
    max-width: 260px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 0.95;
  `;

  root.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2000);
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }

  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  return String(arg);
}

function log(type: 'info' | 'warn' | 'error' | 'debug', message: string, args: unknown[]) {
  const full = `${PREFIX} ${message}`;
  const textArgs = args.map(formatArg).filter(Boolean).join(' ');
  const popupMessage = textArgs ? `${full} ${textArgs}` : full;

  console[type === 'debug' ? 'debug' : type](full, ...args);

  if (popupEnabled) {
    showPopup(popupMessage, type);
  }
}

export const logger = {
  setPopupEnabled(v: boolean) {
    popupEnabled = v;
  },

  info(msg: string, ...args: unknown[]) {
    log('info', msg, args);
  },
  warn(msg: string, ...args: unknown[]) {
    log('warn', msg, args);
  },
  error(msg: string, ...args: unknown[]) {
    log('error', msg, args);
  },
  debug(msg: string, ...args: unknown[]) {
    log('debug', msg, args);
  },
};
