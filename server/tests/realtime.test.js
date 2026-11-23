import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { io as ioClient } from 'socket.io-client';

import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = (process.env.MONGODB_URI || '').replace(
  /\/[^/?]+(\?|$)/,
  '/campusfix_test$1'
);

const baseUrl = process.env.API_URL || 'http://localhost:5000';
const VALID_PASSWORD = 'TestPass123';

let app,
  server,
  io,
  User,
  Notification,
  cookieJar = '';
const openSockets = [];

const api = async (method, path, { body, headers = {} } = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieJar,
      ...(body?.__csrf ? { 'X-CSRF-Token': csrfToken() } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookies = res.headers.getSetCookie?.() || [];
  if (setCookies.length) {
    cookieJar = setCookies.map((c) => c.split(';')[0]).join('; ');
  }
  return { status: res.status, body: await res.json().catch(() => null) };
};

let csrfTokenValue = '';
const csrfToken = () => csrfTokenValue;

const freshCsrf = async () => {
  const res = await fetch(`${baseUrl}/api/auth/csrf`);
  const cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
  const body = await res.json();
  csrfTokenValue = body?.data?.csrfToken || '';
  cookieJar = cookies;
};

const loginAs = async (email, password = VALID_PASSWORD) => {
  await freshCsrf();
  const res = await api('POST', '/api/auth/login', {
    body: { email, password },
  });
  assert.equal(res.status, 200, `login failed for ${email}`);
};

const createUser = async ({ email, role = 'student', password = VALID_PASSWORD }) =>
  User.create({
    fullName: 'RT User',
    email,
    password: await bcrypt.hash(password, 12),
    role,
    status: 'active',
    isActive: true,
  });

describe('Realtime sockets and notifications', () => {
  before(async () => {
    const { default: connectDB } = await import('../src/config/database.js');
    await connectDB();
    const { default: application } = await import('../src/app.js');
    const { initSocket, getIo } = await import('../src/socket/socketServer.js');
    app = application;
    User = (await import('../src/models/User.js')).default;
    Notification = (await import('../src/models/Notification.js')).default;

    server = app.listen(0);
    io = initSocket(server);
    await new Promise((r) => server.on('listening', r));
    const port = server.address().port;
    process.env.API_URL = `http://localhost:${port}`;
    // api() uses baseUrl; override per-test via global
    globalThis.__testPort = port;
  });

  // api() reads baseUrl const — patch: redefine base usage via env not
  // possible; simplest: tests use fetch directly with port.
  const P = () => globalThis.__testPort;
  const tapi = async (method, path, opts = {}) => {
    const res = await fetch(`http://localhost:${P()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieJar,
        ...(method !== 'GET' ? { 'X-CSRF-Token': csrfTokenValue } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const sc = res.headers.getSetCookie?.() || [];
    if (sc.length) cookieJar = sc.map((c) => c.split(';')[0]).join('; ');
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const tlogin = async (email) => {
    const r = await fetch(`http://localhost:${P()}/api/auth/csrf`);
    cookieJar = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ');
    csrfTokenValue = (await r.json())?.data?.csrfToken || '';
    const res = await fetch(`http://localhost:${P()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieJar,
        'X-CSRF-Token': csrfTokenValue,
      },
      body: JSON.stringify({ email, password: VALID_PASSWORD }),
    });
    const sc = res.headers.getSetCookie?.() || [];
    if (sc.length)
      cookieJar = [...cookieJar.split('; '), ...sc.map((c) => c.split(';')[0])].join('; ');
    assert.equal(res.status, 200);
  };

  after(async () => {
    openSockets.forEach((s) => s.close());
    io?.close();
    server?.closeAllConnections?.();
    server?.closeIdleConnections?.();
    await Notification.deleteMany({});
    await User.deleteMany({ email: /rt_/ });
    await mongoose.disconnect();
    server?.close();
  });

  test('socket rejects unauthenticated connections', async () => {
    const socket = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: false,
    });
    openSockets.push(socket);
    const err = await new Promise((resolve) => {
      socket.on('connect_error', resolve);
      setTimeout(() => resolve('timeout'), 5000);
    });
    socket.close();
    assert.notEqual(err, 'timeout');
  });

  test('socket connects with valid session and joins user room', async () => {
    await createUser({ email: 'rt_student@test.com' });
    await tlogin('rt_student@test.com');
    const socket = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      extraHeaders: { Cookie: cookieJar },
    });
    openSockets.push(socket);
    const ready = await new Promise((resolve, reject) => {
      socket.on('ready', resolve);
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    assert.equal(ready.role, 'student');
    socket.close();
  });

  test('notification API: create via issue, list, unread count, mark read', async () => {
    await Notification.deleteMany({});
    await tlogin('rt_student@test.com');

    const create = await tapi('POST', '/api/issues', {
      body: {
        title: 'RT issue',
        description: 'Socket test',
        category: 'other',
        location: 'Hall',
      },
    });
    assert.equal(create.status, 201);

    // Persistent notification was created for the reporter.
    const list = await tapi('GET', '/api/notifications');
    assert.equal(list.status, 200);
    assert.ok(list.body.data.length >= 1);
    const notif = list.body.data[0];
    assert.equal(notif.type, 'issue_created');

    const count = await tapi('GET', '/api/notifications/unread-count');
    assert.ok(count.body.data.count >= 1);

    const mark = await tapi('PATCH', `/api/notifications/${notif.id}/read`);
    assert.equal(mark.status, 200);

    const all = await tapi('PATCH', '/api/notifications/read-all');
    assert.equal(all.status, 200);
    const count2 = await tapi('GET', '/api/notifications/unread-count');
    assert.equal(count2.body.data.count, 0);
  });

  test('notifications are user-scoped — other users see none', async () => {
    await createUser({ email: 'rt_other@test.com' });
    await tlogin('rt_other@test.com');
    const list = await tapi('GET', '/api/notifications');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 0);
  });

  test('notification endpoints require auth', async () => {
    cookieJar = '';
    const res = await fetch(`http://localhost:${P()}/api/notifications`);
    assert.equal(res.status, 401);
  });

  test('issue:created reaches admin role room only', async () => {
    await createUser({ email: 'rt_admin@test.com', role: 'admin' });
    await createUser({ email: 'rt_student2@test.com' });
    await tlogin('rt_admin@test.com');

    const adminSocket = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      extraHeaders: { Cookie: cookieJar },
    });
    openSockets.push(adminSocket);
    await new Promise((res, rej) => {
      adminSocket.on('ready', res);
      adminSocket.on('connect_error', rej);
      setTimeout(rej, 5000);
    });

    // Student creates issue → admin should get issue:created.
    await tlogin('rt_student2@test.com');
    const studentSocket = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      extraHeaders: { Cookie: cookieJar },
    });
    openSockets.push(studentSocket);
    await new Promise((res) => studentSocket.on('ready', res));

    let studentLeak = false;
    studentSocket.on('issue:created', () => {
      studentLeak = true;
    });
    const adminGot = new Promise((res) => adminSocket.once('issue:created', res));

    await tapi('POST', '/api/issues', {
      body: {
        title: 'Room test',
        description: 'Admin only event',
        category: 'other',
        location: 'X',
      },
    });

    const adminPayload = await Promise.race([
      adminGot,
      new Promise((r) => setTimeout(() => r('timeout'), 5000)),
    ]);
    await new Promise((r) => setTimeout(r, 500));

    assert.notEqual(adminPayload, 'timeout');
    assert.equal(adminPayload.ticketId?.startsWith('CF-'), true);
    assert.equal(studentLeak, false); // students must NOT receive it

    adminSocket.close();
    studentSocket.close();
  });

  test('logout disconnects all sockets for that user immediately', async () => {
    await User.deleteOne({ email: 'rt_logout@test.com' });
    await createUser({ email: 'rt_logout@test.com' });
    await tlogin('rt_logout@test.com');

    const s1 = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      extraHeaders: { Cookie: cookieJar },
    });
    const s2 = ioClient(`http://localhost:${P()}`, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      extraHeaders: { Cookie: cookieJar },
    });
    openSockets.push(s1, s2);
    await Promise.all([
      new Promise((res) => s1.on('ready', res)),
      new Promise((res) => s2.on('ready', res)),
    ]);

    const disconnected = Promise.all([
      new Promise((res) => s1.on('disconnect', () => res(true))),
      new Promise((res) => s2.on('disconnect', () => res(true))),
    ]);

    // Logout via API -> tokenVersion bump -> server disconnects sockets.
    const out = await tapi('POST', '/api/auth/logout');
    assert.equal(out.status, 200);

    const result = await Promise.race([
      disconnected,
      new Promise((r) => setTimeout(() => r('timeout'), 5000)),
    ]);
    assert.deepEqual(result, [true, true]);
    s1.close();
    s2.close();
  });
});
