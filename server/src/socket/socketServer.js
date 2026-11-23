import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

import userRepository from '../repositories/userRepository.js';
import { AUTH_COOKIE_NAME } from '../utils/cookieConfig.js';

let io = null;
const userSockets = new Map(); // userId -> Set<socket.id>
const socketsById = new Map(); // socket.id -> userId

const authenticateSocket = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies[AUTH_COOKIE_NAME];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userRepository.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error('Invalid or inactive user'));
    }

    if ((decoded.ver ?? 0) !== (user.tokenVersion ?? 0)) {
      return next(new Error('Session invalidated'));
    }

    // Server-authoritative identity — never trust client data.
    socket.data.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    next();
  } catch {
    next(new Error('Authentication failed'));
  }
};

export const initSocket = (httpServer) => {
  const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    // No arbitrary room joins — rooms are assigned server-side only.
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const { id, role } = socket.data.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
    socket.emit('ready', { userId: id, role });

    if (!userSockets.has(id)) userSockets.set(id, new Set());
    userSockets.get(id).add(socket.id);
    socketsById.set(socket.id, id);

    socket.on('disconnect', () => {
      userSockets.get(id)?.delete(socket.id);
      socketsById.delete(socket.id);
    });
  });

  return io;
};

export const getIo = () => io;

// Safe publish — never throws, never fails a business operation.
export const emitTo = (rooms, event, payload) => {
  try {
    if (!io) return;
    const roomList = Array.isArray(rooms) ? rooms : [rooms];
    for (const room of roomList) {
      io.to(room).emit(event, payload);
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Socket emit failed for ${event}: ${error.message}`
    );
  }
};

// Disconnect every live socket belonging to a user — used when
// their tokenVersion is bumped (logout, password change) or the
// account is deactivated, so other tabs lose access immediately.
export const disconnectUserSockets = (userId) => {
  try {
    if (!io) return;
    const id = userId?.toString();
    const ids = userSockets.get(id);
    if (!ids) return;
    for (const socketId of ids) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
    userSockets.delete(id);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Socket disconnect failed: ${error.message}`);
  }
};

export const emitToUser = (userId, event, payload) => emitTo(`user:${userId}`, event, payload);

export const emitToRole = (role, event, payload) => emitTo(`role:${role}`, event, payload);

export const emitToRoles = (roles, event, payload) =>
  emitTo(
    roles.map((r) => `role:${r}`),
    event,
    payload
  );
