import { io } from 'socket.io-client';

let socket = null;
const listeners = new Map(); // event -> Set<fn>
let connectedOnce = false;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ensureSocket = () => {
  if (socket) return socket;
  socket = io(API_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    // Reconnect recovery: notify subscribers so they can refetch.
    if (connectedOnce) {
      dispatch('socket:reconnected', {});
    }
    connectedOnce = true;
  });

  socket.on('disconnect', () => {});

  // Fan out server events to registered listeners.
  const knownEvents = [
    'issue:created',
    'issue:assigned',
    'issue:status_changed',
    'issue:updated',
    'dashboard:stats_updated',
    'staff:created',
    'staff:approved',
    'staff:rejected',
    'audit:new',
    'notification:new',
    'notification:read',
    'notification:read_all',
    'socket:reconnected',
  ];
  for (const ev of knownEvents) {
    socket.on(ev, (payload) => dispatch(ev, payload));
  }

  return socket;
};

const dispatch = (event, payload) => {
  const set = listeners.get(event);
  if (set) set.forEach((fn) => fn(payload));
};

export const connectSocket = () => {
  const s = ensureSocket();
  if (!s.connected) s.connect();
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectedOnce = false;
    listeners.clear();
  }
};

export const onSocketEvent = (event, fn) => {
  ensureSocket();
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => {
    listeners.get(event)?.delete(fn);
  };
};

export const isSocketConnected = () => Boolean(socket?.connected);
