import { useEffect } from 'react';

import { onSocketEvent } from '../services/socketService';

// Subscribe to socket events and invoke `refetch` (debounced per
// event burst). Returns nothing; cleans up listeners on unmount.
export const useRealtimeRefresh = (events, refetch, deps = []) => {
  useEffect(() => {
    if (!refetch) return undefined;
    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(refetch, 150);
    };
    const offs = events.map((ev) => onSocketEvent(ev, schedule));
    // Recover missed events after reconnect.
    const offReconnect = onSocketEvent('socket:reconnected', schedule);
    return () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
      offReconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
