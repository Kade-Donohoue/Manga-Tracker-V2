import { useEffect } from 'react';

export function useServiceWorkerUpdate() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SKIP_WAITING_CONFIRMED') {
        console.log('[App] Service worker update available');
        // Auto-reload after 2 seconds to pick up new version
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);
}
