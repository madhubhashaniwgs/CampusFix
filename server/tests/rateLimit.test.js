import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { ipKeyGenerator } from 'express-rate-limit';

// NODE_ENV=test is set so the exported login/register limiters
// remain passthrough; these tests exercise createRateLimiter
// directly with a short window — the real middleware code path.
process.env.NODE_ENV = 'test';

const { createRateLimiter } = await import('../src/middleware/rateLimitMiddleware.js');
const { default: errorMiddleware } = await import('../src/middleware/errorMiddleware.js');

const WINDOW_MS = 400;
const MAX = 3;

let server;
let baseUrl;

const hit = async (path, ip = '1.1.1.1', method = 'POST') => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'x-test-ip': ip },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON
  }
  return { status: res.status, headers: res.headers, body };
};

before(async () => {
  const app = express();
  app.use(express.json());

  // keyGenerator reads a header so tests can simulate IPs;
  // ipKeyGenerator normalizes IPv6 per express-rate-limit rules.
  const keyByIp = (req) =>
    ipKeyGenerator(req.headers['x-test-ip'] || req.ip);

  const loginLimiter = createRateLimiter('Too many login attempts. Please try again later.', {
    windowMs: WINDOW_MS,
    max: MAX,
    keyGenerator: keyByIp,
  });
  const registerLimiter = createRateLimiter(
    'Too many registration attempts. Please try again later.',
    { windowMs: WINDOW_MS, max: MAX, keyGenerator: keyByIp }
  );

  app.post('/api/auth/login', loginLimiter, (req, res) => res.json({ success: true }));
  app.post('/api/auth/register', registerLimiter, (req, res) => res.json({ success: true }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use(errorMiddleware);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('requests within the limit succeed', async () => {
  for (let i = 0; i < MAX; i++) {
    const res = await hit('/api/auth/login', '10.0.0.1');
    assert.equal(res.status, 200);
  }
});

test('request exceeding the limit returns 429 with consistent format', async () => {
  const ip = '10.0.0.2';
  for (let i = 0; i < MAX; i++) await hit('/api/auth/login', ip);
  const res = await hit('/api/auth/login', ip);
  assert.equal(res.status, 429);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /too many login attempts/i);
});

test('rate-limit headers are present and correct', async () => {
  const ip = '10.0.0.3';
  await hit('/api/auth/login', ip);
  const res = await hit('/api/auth/login', ip);

  const limit = res.headers.get('ratelimit-limit');
  const remaining = res.headers.get('ratelimit-remaining');
  assert.ok(limit !== null, 'ratelimit-limit header missing');
  assert.ok(remaining !== null, 'ratelimit-remaining header missing');
  assert.equal(Number(limit), MAX);
});

test('login and register counters are independent', async () => {
  const ip = '10.0.0.4';
  // Exhaust login limiter.
  for (let i = 0; i < MAX; i++) await hit('/api/auth/login', ip);
  const blocked = await hit('/api/auth/login', ip);
  assert.equal(blocked.status, 429);

  // Register endpoint unaffected by login counter.
  const reg = await hit('/api/auth/register', ip);
  assert.equal(reg.status, 200);
});

test('different IPs have independent limits', async () => {
  const ipA = '10.0.0.5';
  const ipB = '10.0.0.6';

  for (let i = 0; i < MAX; i++) await hit('/api/auth/login', ipA);
  assert.equal((await hit('/api/auth/login', ipA)).status, 429);

  // ipB still has its full quota.
  const res = await hit('/api/auth/login', ipB);
  assert.equal(res.status, 200);
});

test('unrelated endpoints are not rate limited', async () => {
  for (let i = 0; i < MAX + 2; i++) {
    const res = await hit('/api/health', '10.0.0.7', 'GET');
    assert.equal(res.status, 200);
  }
});

test('limit resets after the window expires', async () => {
  const ip = '10.0.0.8';
  for (let i = 0; i < MAX; i++) await hit('/api/auth/login', ip);
  assert.equal((await hit('/api/auth/login', ip)).status, 429);

  await new Promise((r) => setTimeout(r, WINDOW_MS + 150));

  const res = await hit('/api/auth/login', ip);
  assert.equal(res.status, 200);
});

test('429 response contains no sensitive internals', async () => {
  const ip = '10.0.0.9';
  for (let i = 0; i < MAX + 1; i++) await hit('/api/auth/login', ip);

  const res = await hit('/api/auth/login', ip);
  assert.equal(res.status, 429);
  assert.equal(res.body.stack, undefined);
  assert.equal(res.body.errors.length, 0);
});
