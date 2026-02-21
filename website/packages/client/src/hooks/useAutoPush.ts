import { useEffect } from 'react';
import { ensurePushSubscription } from '../push';

export function useAutoPush(isAuthenticated: boolean) {
  console.log(isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) return;

    ensurePushSubscription().catch(console.error);
  }, [isAuthenticated]);
}
