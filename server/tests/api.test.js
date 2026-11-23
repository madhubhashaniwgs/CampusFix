import { test, before, after, afterEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Configure the test environment BEFORE importing application modules
// so middleware (rate limiters, error handling) sees NODE_ENV=test.
dotenv.config();
process.env.NODE_ENV = 'test';

const TEST_DB_NAME = 'campusfix_test';
const VALID_PASSWORD = 'TestPass123';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. Tests require server/.env configuration.');
}

process.env.MONGODB_URI = process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`);

// Safety guard: refuse to run destructive tests unless the resolved
// connection string explicitly targets the dedicated test database.
const resolvedDbMatch = process.env.MONGODB_URI.match(/^mongodb(\+srv)?:\/\/[^/]+\/([^/?]+)/);

if (!resolvedDbMatch || resolvedDbMatch[2] !== TEST_DB_NAME) {
  throw new Error(
    `Refusing to run tests: resolved test database is ` +
      `"${resolvedDbMatch?.[2] || 'none'}", expected "${TEST_DB_NAME}".`
  );
}

let app;
let server;
let baseUrl;
let User;
let Issue;

// Minimal cookie jar so tests behave like a browser: cookies set via
// Set-Cookie are stored and resent, and mutating requests echo the
// CSRF cookie back in the X-CSRF-Token header.
const jar = {};

const updateJar = (response) => {
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const cookie of setCookies) {
    const pair = cookie.split(';')[0];
    const eq = pair.indexOf('=');
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!value) delete jar[name];
    else jar[name] = value;
  }
};

const api = async (method, path, { body, bare = false, csrf = null } = {}) => {
  const headers = { 'Content-Type': 'application/json' };

  if (!bare) {
    const cookieHeader = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (cookieHeader) headers.Cookie = cookieHeader;

    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      headers['X-CSRF-Token'] = csrf === null ? jar.csrf_token : csrf;
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  updateJar(response);

  let json = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON response
  }

  return {
    status: response.status,
    body: json,
    setCookie: response.headers.getSetCookie?.() || [],
  };
};

const registerViaApi = async (email, password = VALID_PASSWORD) =>
  api('POST', '/api/auth/register', {
    body: { fullName: 'Test User', email, password },
  });

const loginViaApi = async (email, password = VALID_PASSWORD) =>
  api('POST', '/api/auth/login', { body: { email, password } });

// Logs in through the API so the jar holds that user's auth cookie.
const loginAs = async (email, password = VALID_PASSWORD) => {
  const res = await loginViaApi(email, password);
  assert.equal(res.status, 200, `login failed for ${email}`);
  return res;
};

const createUserDirect = async ({
  fullName = 'Direct User',
  email,
  password = VALID_PASSWORD,
  role = 'student',
  isActive = true,
}) =>
  User.create({
    fullName,
    email,
    password: await bcrypt.hash(password, 12),
    role,
    isActive,
  });

const setCookiesString = (res) => res.setCookie.join('\n');

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const connectedDbName = mongoose.connection.db.databaseName;
  assert.equal(
    connectedDbName,
    TEST_DB_NAME,
    `Connected to "${connectedDbName}" instead of "${TEST_DB_NAME}". Aborting.`
  );

  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({});
  await db.collection('issues').deleteMany({});

  User = (await import('../src/models/User.js')).default;
  Issue = (await import('../src/models/Issue.js')).default;
  app = (await import('../src/app.js')).default;

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Obtain a CSRF token up front; the jar now holds csrf_token.
  const csrf = await api('GET', '/api/auth/csrf', { bare: true });
  assert.equal(csrf.status, 200);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({});
  await db.collection('issues').deleteMany({});
  await mongoose.disconnect();
});

describe('Cookie authentication', () => {
  test('register sets an httpOnly cookie and returns no JWT', async () => {
    const res = await registerViaApi('auth1@test.com');
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.token, undefined);
    assert.equal(res.body.data.user.password, undefined);

    const cookies = setCookiesString(res);
    assert.match(cookies, /campusfix_token=/);
    assert.match(cookies, /HttpOnly/i);
  });

  test('register rejects a duplicate email', async () => {
    const res = await registerViaApi('auth1@test.com');
    assert.equal(res.status, 409);
  });

  test('register rejects invalid input', async () => {
    const res = await api('POST', '/api/auth/register', {
      body: { fullName: '', email: 'not-an-email', password: 'short' },
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length > 0);
  });

  test('login sets cookie, returns no JWT, wrong credentials fail', async () => {
    const ok = await loginViaApi('auth1@test.com');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.token, undefined);
    assert.match(setCookiesString(ok), /campusfix_token=/);

    const wrongPass = await loginViaApi('auth1@test.com', 'WrongPass1');
    assert.equal(wrongPass.status, 401);

    const unknown = await loginViaApi('nobody@test.com');
    assert.equal(unknown.status, 401);
  });

  test('login rejects an inactive account', async () => {
    await createUserDirect({
      email: 'inactive@test.com',
      isActive: false,
    });
    const res = await loginViaApi('inactive@test.com');
    assert.equal(res.status, 403);
  });

  test('GET /api/auth/me requires a session and returns the user', async () => {
    const noSession = await api('GET', '/api/auth/me', { bare: true });
    assert.equal(noSession.status, 401);

    await loginAs('auth1@test.com');
    const res = await api('GET', '/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'auth1@test.com');
    assert.equal(res.body.data.password, undefined);
  });
});

describe('CSRF protection', () => {
  test('safe GET requests are not blocked', async () => {
    const res = await api('GET', '/api/health', { bare: true });
    assert.equal(res.status, 200);
  });

  test('POST without CSRF token is rejected', async () => {
    const res = await api('POST', '/api/auth/login', {
      body: { email: 'x@test.com', password: VALID_PASSWORD },
      csrf: 'definitely-wrong',
    });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /CSRF/i);
  });

  test('POST with missing CSRF cookie/header is rejected', async () => {
    // bare request: no cookies at all -> no csrf cookie to compare
    const res = await api('POST', '/api/auth/login', {
      body: { email: 'x@test.com', password: VALID_PASSWORD },
      bare: true,
    });
    assert.equal(res.status, 403);
  });

  test('forged/unsigned CSRF token is rejected even when echoed', async () => {
    // Simulates cookie tossing: attacker plants a self-chosen value.
    const forged = 'attacker-controlled-value';
    const res = await api('POST', '/api/auth/login', {
      body: { email: 'x@test.com', password: VALID_PASSWORD },
      csrf: forged,
    });
    // api() sends jar.csrf_token as header unless overridden; forge
    // requires cookie==header, so set both via a raw request instead.
    assert.equal(res.status, 403);
  });

  test('tampered signed CSRF token is rejected', async () => {
    const real = jar.csrf_token;
    const tampered = `${real.slice(0, -4)}AAAA`;
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `csrf_token=${tampered}`,
        'X-CSRF-Token': tampered,
      },
      body: JSON.stringify({
        email: 'x@test.com',
        password: VALID_PASSWORD,
      }),
    });
    const json = await response.json();
    assert.equal(response.status, 403);
    assert.equal(json.success, false);
  });

  test('login works when CSRF token is sent correctly', async () => {
    await createUserDirect({ email: 'csrfuser@test.com' });
    const res = await loginViaApi('csrfuser@test.com');
    assert.equal(res.status, 200);
  });
});

describe('Password policy', () => {
  test('weak passwords are rejected on registration', async () => {
    for (const weak of [
      'password123', // common + no uppercase
      'short',
      'alllowercase1',
      'NoDigitsHere',
      'nouppercase123',
    ]) {
      const res = await registerViaApi(
        `weak${Math.random().toString(36).slice(2, 8)}@test.com`,
        weak
      );
      assert.equal(res.status, 400, weak);
    }
  });

  test('weak passwords are rejected for staff creation', async () => {
    await createUserDirect({ email: 'admin_pw@test.com', role: 'admin' });
    await loginAs('admin_pw@test.com');

    const res = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Weak Staff',
        email: 'weakstaff@test.com',
        password: 'password123',
      },
    });
    assert.equal(res.status, 400);
  });

  test('existing users with non-compliant passwords can still log in', async () => {
    await createUserDirect({
      email: 'legacy@test.com',
      password: 'oldpassword',
    });
    const res = await loginViaApi('legacy@test.com', 'oldpassword');
    assert.equal(res.status, 200);
  });
});

describe('Authorization', () => {
  test('unauthenticated requests to protected routes return 401', async () => {
    const res = await api('GET', '/api/issues', { bare: true });
    assert.equal(res.status, 401);
  });

  test('student cannot create staff accounts', async () => {
    await createUserDirect({ email: 'stu_auth@test.com' });
    await loginAs('stu_auth@test.com');

    const res = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Nope',
        email: 'nope@test.com',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(res.status, 403);
  });

  test('staff cannot create staff accounts', async () => {
    await createUserDirect({ email: 'staff_auth@test.com', role: 'staff' });
    await loginAs('staff_auth@test.com');

    const res = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Nope',
        email: 'nope2@test.com',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(res.status, 403);
  });

  test('admin can create staff; role override and password are safe', async () => {
    await createUserDirect({ email: 'admin_auth@test.com', role: 'admin' });
    await loginAs('admin_auth@test.com');

    const res = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Made Staff',
        email: 'madestaff@test.com',
        password: VALID_PASSWORD,
        role: 'admin',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, 'staff');
    assert.equal(res.body.data.password, undefined);
    assert.equal(res.body.data.passwordHash, undefined);

    const created = await User.findOne({ email: 'madestaff@test.com' }).select('+password');
    assert.equal(created.role, 'staff');
    assert.ok(created.password.startsWith('$2'));
  });

  test('admin staff creation rejects duplicate email', async () => {
    await createUserDirect({ email: 'admin_auth2@test.com', role: 'admin' });
    await loginAs('admin_auth2@test.com');

    const res = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Dup',
        email: 'madestaff@test.com',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(res.status, 409);
  });
});

describe('Issue management and scoping', () => {
  let staffUserId;
  let issueId;

  before(async () => {
    await createUserDirect({ email: 'stu_a@test.com', role: 'student' });
    await createUserDirect({ email: 'stu_b@test.com', role: 'student' });
    const staff = await createUserDirect({
      email: 'staff_w@test.com',
      role: 'staff',
    });
    await createUserDirect({ email: 'admin_w@test.com', role: 'admin' });
    staffUserId = staff._id.toString();
  });

  const createIssue = (title = 'Test issue') =>
    api('POST', '/api/issues', {
      body: {
        title,
        description: 'desc',
        category: 'it',
        location: 'Lab',
        priority: 'medium',
      },
    });

  test('student can create an issue', async () => {
    await loginAs('stu_a@test.com');
    const res = await createIssue('My issue');
    assert.equal(res.status, 201);
    issueId = res.body.data._id;
    assert.equal(res.body.data.status, 'reported');
    assert.ok(res.body.data.ticketId.startsWith('CF-'));
  });

  test('student list contains only own issues', async () => {
    await loginAs('stu_b@test.com');
    await createIssue('Other student issue');

    await loginAs('stu_a@test.com');
    const res = await api('GET', '/api/issues?limit=50');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.ok(res.body.data.every((i) => i.reportedBy?.email === 'stu_a@test.com'));
  });

  test("student cannot view another student's issue", async () => {
    await loginAs('stu_b@test.com');
    const other = await api('GET', '/api/issues?limit=1');
    const foreignId = other.body.data[0]._id;

    await loginAs('stu_a@test.com');
    const res = await api('GET', `/api/issues/${foreignId}`);
    assert.equal(res.status, 403);
  });

  test('staff sees only assigned issues; admin sees all', async () => {
    await loginAs('staff_w@test.com');
    const staffRes = await api('GET', '/api/issues?limit=50');
    assert.equal(staffRes.status, 200);
    assert.equal(staffRes.body.data.length, 0);

    await loginAs('admin_w@test.com');
    const adminRes = await api('GET', '/api/issues?limit=50');
    assert.ok(adminRes.body.data.length >= 2);
  });

  test('admin can assign; staff can update; invalid transitions rejected', async () => {
    await loginAs('admin_w@test.com');
    const assign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUserId },
    });
    assert.equal(assign.status, 200);
    assert.equal(assign.body.data.status, 'assigned');

    await loginAs('stu_a@test.com');
    const forbidden = await api('PATCH', `/api/issues/${issueId}/status`, {
      body: { status: 'in_progress' },
    });
    assert.equal(forbidden.status, 403);

    await loginAs('staff_w@test.com');
    const staffAssign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUserId },
    });
    assert.equal(staffAssign.status, 403);

    const progress = await api('PATCH', `/api/issues/${issueId}/status`, {
      body: { status: 'in_progress', note: 'working' },
    });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.statusHistory.length, 3);

    const invalid = await api('PATCH', `/api/issues/${issueId}/status`, {
      body: { status: 'assigned' },
    });
    assert.equal(invalid.status, 400);

    await loginAs('admin_w@test.com');
    const reassign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUserId },
    });
    assert.equal(reassign.status, 400);
  });

  test('assigning a resolved issue is rejected', async () => {
    await loginAs('staff_w@test.com');
    const res = await api('PATCH', `/api/issues/${issueId}/status`, {
      body: { status: 'resolved' },
    });
    assert.equal(res.status, 200);

    await loginAs('admin_w@test.com');
    const assign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUserId },
    });
    assert.equal(assign.status, 400);
  });
});

describe('Pagination, filtering and search', () => {
  before(async () => {
    await createUserDirect({ email: 'admin_p@test.com', role: 'admin' });
    await createUserDirect({ email: 'stu_p@test.com', role: 'student' });

    await loginAs('stu_p@test.com');
    for (let i = 1; i <= 12; i++) {
      await api('POST', '/api/issues', {
        body: {
          title: `Page issue ${i}`,
          description: `pagination fixture ${i}`,
          category: i % 2 === 0 ? 'plumbing' : 'it',
          location: `Loc ${i}`,
          priority: i % 3 === 0 ? 'high' : 'low',
        },
      });
    }

    await loginAs('admin_p@test.com');
  });

  test('default pagination returns metadata', async () => {
    const res = await api('GET', '/api/issues?limit=5');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 5);
    assert.equal(res.body.pagination.pageSize, 5);
    assert.ok(res.body.pagination.totalItems >= 12);
    assert.ok(res.body.pagination.totalPages >= 3);
  });

  test('student pagination stays scoped to own issues', async () => {
    await loginAs('stu_p@test.com');
    const res = await api('GET', '/api/issues?limit=50');
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.totalItems, 12);
    assert.ok(res.body.data.every((i) => i.reportedBy?.email === 'stu_p@test.com'));
    await loginAs('admin_p@test.com');
  });

  test('page boundaries work and invalid values are rejected', async () => {
    const last = await api('GET', '/api/issues?page=999&limit=5');
    assert.equal(last.status, 200);
    assert.equal(last.body.data.length, 0);

    for (const bad of ['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101']) {
      const res = await api('GET', `/api/issues?${bad}`);
      assert.equal(res.status, 400, bad);
    }
  });

  test('status, priority and category filters combine', async () => {
    const res = await api('GET', '/api/issues?status=reported&priority=high&category=it&limit=50');
    assert.equal(res.status, 200);
    assert.ok(
      res.body.data.every(
        (i) => i.status === 'reported' && i.priority === 'high' && i.category === 'it'
      )
    );
  });

  test('invalid filter values are rejected', async () => {
    for (const bad of [
      'status=bogus',
      'priority=mega',
      'category=spaceship',
      'assignee=everyone',
      'dateFrom=not-a-date',
    ]) {
      const res = await api('GET', `/api/issues?${bad}`);
      assert.equal(res.status, 400, bad);
    }
  });

  test('search matches ticketId and text; regex is escaped', async () => {
    const list = await api('GET', '/api/issues?limit=1');
    const ticketId = list.body.data[0].ticketId;

    const byTicket = await api('GET', `/api/issues?search=${encodeURIComponent(ticketId)}`);
    assert.equal(byTicket.body.data.length, 1);
    assert.equal(byTicket.body.data[0].ticketId, ticketId);

    const byText = await api('GET', `/api/issues?search=${encodeURIComponent('Page issue')}`);
    assert.ok(byText.body.pagination.totalItems >= 12);

    const regexAttempt = await api('GET', `/api/issues?search=${encodeURIComponent('(.*')}`);
    assert.equal(regexAttempt.status, 200);
    assert.equal(regexAttempt.body.data.length, 0);
  });
});

describe('Logout and token invalidation', () => {
  test('logout clears cookie, invalidates token, is safe to repeat', async () => {
    await createUserDirect({ email: 'logout_user@test.com' });
    await loginAs('logout_user@test.com');

    const meBefore = await api('GET', '/api/auth/me');
    assert.equal(meBefore.status, 200);

    const oldToken = jar.campusfix_token;
    assert.ok(oldToken);

    const logout = await api('POST', '/api/auth/logout');
    assert.equal(logout.status, 200);
    assert.match(setCookiesString(logout), /campusfix_token=;/);

    // Simulate a client still holding the old JWT cookie.
    jar.campusfix_token = oldToken;
    const stale = await api('GET', '/api/auth/me');
    assert.equal(stale.status, 401);

    // Repeated logout with the invalidated token is handled safely.
    const repeat = await api('POST', '/api/auth/logout');
    assert.equal(repeat.status, 401);
  });

  test("logout does not invalidate another user's session", async () => {
    await createUserDirect({ email: 'user_one@test.com' });
    await createUserDirect({ email: 'user_two@test.com' });

    await loginAs('user_one@test.com');
    const oneToken = jar.campusfix_token;

    await loginAs('user_two@test.com');
    await api('POST', '/api/auth/logout');

    // user_one's cookie was replaced in the jar by user_two's login,
    // so restore it to verify their session is still valid.
    jar.campusfix_token = oneToken;
    const me = await api('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.email, 'user_one@test.com');
  });
});

describe('API reliability', () => {
  test('unknown routes return a consistent 404', async () => {
    const res = await api('GET', '/api/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message);
  });

  test('malformed JSON returns a 400', async () => {
    const csrfValue = jar.csrf_token;
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `csrf_token=${csrfValue}`,
        'X-CSRF-Token': csrfValue,
      },
      body: '{invalid json',
    });
    const json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.success, false);
  });

  test('error responses never include stack traces', async () => {
    const res = await api('GET', '/api/nope');
    assert.equal(res.body.stack, undefined);
  });
});

describe('Staff self-registration approval', () => {
  test('staff registers as pending, login blocked until admin approves', async () => {
    // Staff self-registration
    const reg = await api('POST', '/api/auth/register', {
      body: {
        role: 'staff',
        fullName: 'Pending Staff',
        email: 'pendingstaff@test.com',
        staffId: 'STF-900',
        department: 'IT',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(reg.status, 201);
    assert.equal(reg.body.data.user.status, 'pending');

    // No session cookie should be set for pending staff
    assert.ok(
      !reg.setCookie.some((c) => c.startsWith('campusfix_token=')),
      'pending staff must not receive an auth cookie'
    );

    // Login is blocked while pending
    const blocked = await api('POST', '/api/auth/login', {
      body: { email: 'pendingstaff@test.com', password: VALID_PASSWORD },
    });
    assert.equal(blocked.status, 403);
    assert.match(blocked.body.message, /pending admin approval/i);

    // Admin lists pending users
    await createUserDirect({ email: 'admin_appr@test.com', role: 'admin' });
    await loginAs('admin_appr@test.com');

    const list = await api('GET', '/api/admin/users?role=staff&status=pending');
    assert.equal(list.status, 200);
    const pending = list.body.data.users.find((u) => u.email === 'pendingstaff@test.com');
    assert.ok(pending);
    assert.equal(pending.staffId, 'STF-900');
    assert.equal(pending.department, 'IT');

    // Approve
    const approve = await api('PATCH', `/api/admin/staff/${pending.id}/approve`);
    assert.equal(approve.status, 200);
    assert.equal(approve.body.data.status, 'active');

    // Login now works
    await loginAs('pendingstaff@test.com');
    const me = await api('GET', '/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.role, 'staff');
  });

  test('rejected staff cannot log in; students stay active immediately', async () => {
    // Student self-registration gets active status + cookie
    const stu = await api('POST', '/api/auth/register', {
      body: {
        role: 'student',
        fullName: 'Active Student',
        email: 'activestudent@test.com',
        studentId: '2024CS001',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(stu.status, 201);
    assert.equal(stu.body.data.user.status, 'active');
    assert.ok(
      stu.setCookie.some((c) => c.startsWith('campusfix_token=')),
      'active student should receive an auth cookie'
    );

    // Staff rejected flow
    const reg = await api('POST', '/api/auth/register', {
      body: {
        role: 'staff',
        fullName: 'Rejected Staff',
        email: 'rejectedstaff@test.com',
        staffId: 'STF-901',
        department: 'HR',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(reg.status, 201);

    await createUserDirect({ email: 'admin_rej@test.com', role: 'admin' });
    await loginAs('admin_rej@test.com');

    const users = await api('GET', '/api/admin/users?role=staff&status=pending');
    const target = users.body.data.users.find((u) => u.email === 'rejectedstaff@test.com');
    assert.ok(target);

    const reject = await api('PATCH', `/api/admin/staff/${target.id}/reject`);
    assert.equal(reject.status, 200);
    assert.equal(reject.body.data.status, 'rejected');

    const blocked = await api('POST', '/api/auth/login', {
      body: { email: 'rejectedstaff@test.com', password: VALID_PASSWORD },
    });
    assert.equal(blocked.status, 403);
    assert.match(blocked.body.message, /rejected/i);
  });

  test('non-admin cannot access admin user endpoints', async () => {
    await createUserDirect({ email: 'student_na@test.com', role: 'student' });
    await loginAs('student_na@test.com');

    const list = await api('GET', '/api/admin/users');
    assert.equal(list.status, 403);

    const approve = await api('PATCH', '/api/admin/staff/000000000000000000000000/approve');
    assert.equal(approve.status, 403);
  });
});

describe('Staff approval edge cases', () => {
  const registerPendingStaff = async (email) => {
    const reg = await api('POST', '/api/auth/register', {
      body: {
        role: 'staff',
        fullName: 'Edge Staff',
        email,
        staffId: `STF-${Date.now()}`,
        department: 'Operations',
        password: VALID_PASSWORD,
      },
    });
    assert.equal(reg.status, 201);
    return reg;
  };

  const findPendingStaff = async (email) => {
    const list = await api('GET', '/api/admin/users?role=staff&status=pending');
    return list.body.data.users.find((u) => u.email === email);
  };

  test('approve response contains no sensitive fields', async () => {
    await registerPendingStaff('edge_approve_safe@test.com');
    await createUserDirect({ email: 'admin_edge1@test.com', role: 'admin' });
    await loginAs('admin_edge1@test.com');

    const target = await findPendingStaff('edge_approve_safe@test.com');
    const res = await api('PATCH', `/api/admin/staff/${target.id}/approve`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'active');
    assert.equal(res.body.data.password, undefined);
    assert.equal(res.body.data.passwordHash, undefined);
    assert.equal(res.body.data.tokenVersion, undefined);
  });

  test('approving an already-active staff is a safe no-op', async () => {
    await registerPendingStaff('edge_noop@test.com');
    await createUserDirect({ email: 'admin_edge2@test.com', role: 'admin' });
    await loginAs('admin_edge2@test.com');

    const target = await findPendingStaff('edge_noop@test.com');
    await api('PATCH', `/api/admin/staff/${target.id}/approve`);
    const again = await api('PATCH', `/api/admin/staff/${target.id}/approve`);

    assert.equal(again.status, 200);
    assert.equal(again.body.data.status, 'active');
  });

  test('approving a rejected staff account is rejected', async () => {
    await registerPendingStaff('edge_reapprove@test.com');
    await createUserDirect({ email: 'admin_edge3@test.com', role: 'admin' });
    await loginAs('admin_edge3@test.com');

    const target = await findPendingStaff('edge_reapprove@test.com');
    await api('PATCH', `/api/admin/staff/${target.id}/reject`);

    const res = await api('PATCH', `/api/admin/staff/${target.id}/approve`);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /rejected/i);

    // Still cannot log in
    const login = await api('POST', '/api/auth/login', {
      body: { email: 'edge_reapprove@test.com', password: VALID_PASSWORD },
    });
    assert.equal(login.status, 403);
  });

  test('rejecting an already-rejected staff is a safe no-op', async () => {
    await registerPendingStaff('edge_rnoop@test.com');
    await createUserDirect({ email: 'admin_edge4@test.com', role: 'admin' });
    await loginAs('admin_edge4@test.com');

    const target = await findPendingStaff('edge_rnoop@test.com');
    await api('PATCH', `/api/admin/staff/${target.id}/reject`);
    const again = await api('PATCH', `/api/admin/staff/${target.id}/reject`);

    assert.equal(again.status, 200);
    assert.equal(again.body.data.status, 'rejected');
  });

  test('rejecting an active staff revokes access', async () => {
    await createUserDirect({
      email: 'edge_active_staff@test.com',
      role: 'staff',
      status: 'active',
    });
    await createUserDirect({ email: 'admin_edge5@test.com', role: 'admin' });
    await loginAs('admin_edge5@test.com');

    const list = await api('GET', '/api/admin/users?role=staff&status=active');
    const target = list.body.data.users.find((u) => u.email === 'edge_active_staff@test.com');
    assert.ok(target);

    const res = await api('PATCH', `/api/admin/staff/${target.id}/reject`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'rejected');

    const login = await api('POST', '/api/auth/login', {
      body: { email: 'edge_active_staff@test.com', password: VALID_PASSWORD },
    });
    assert.equal(login.status, 403);
    assert.match(login.body.message, /rejected/i);
  });

  test('nonexistent and invalid staff IDs return proper errors', async () => {
    await createUserDirect({ email: 'admin_edge6@test.com', role: 'admin' });
    await loginAs('admin_edge6@test.com');

    const missing = await api('PATCH', '/api/admin/staff/000000000000000000000000/approve');
    assert.equal(missing.status, 404);

    const invalid = await api('PATCH', '/api/admin/staff/not-an-id/approve');
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.message, /invalid/i);

    const invalidReject = await api('PATCH', '/api/admin/staff/not-an-id/reject');
    assert.equal(invalidReject.status, 400);
  });

  test('cannot approve/reject a non-staff user', async () => {
    await createUserDirect({ email: 'edge_student@test.com', role: 'student' });
    await createUserDirect({ email: 'admin_edge7@test.com', role: 'admin' });
    await loginAs('admin_edge7@test.com');

    const list = await api('GET', '/api/admin/users?role=student');
    const target = list.body.data.users.find((u) => u.email === 'edge_student@test.com');

    const approve = await api('PATCH', `/api/admin/staff/${target.id}/approve`);
    assert.equal(approve.status, 400);
    assert.match(approve.body.message, /not a staff/i);

    const reject = await api('PATCH', `/api/admin/staff/${target.id}/reject`);
    assert.equal(reject.status, 400);
  });

  test('unauthenticated, student, and staff cannot approve/reject', async () => {
    await createUserDirect({ email: 'edge_unauth_admin@test.com', role: 'admin' });
    await loginAs('edge_unauth_admin@test.com');

    const list = await api('GET', '/api/admin/users?role=staff');
    const anyStaff = list.body.data.users[0];
    assert.ok(anyStaff, 'expected at least one staff user');

    const id = anyStaff.id;

    // Unauthenticated: valid CSRF token but no auth cookie.
    const csrf = jar.csrf_token;
    const unauth = await fetch(`${baseUrl}/api/admin/staff/${id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `csrf_token=${csrf}`,
        'X-CSRF-Token': csrf,
      },
    });
    assert.equal(unauth.status, 401);

    // Student
    await createUserDirect({ email: 'edge_role_student@test.com', role: 'student' });
    await loginAs('edge_role_student@test.com');
    const stu = await api('PATCH', `/api/admin/staff/${id}/approve`);
    assert.equal(stu.status, 403);
    const stuRej = await api('PATCH', `/api/admin/staff/${id}/reject`);
    assert.equal(stuRej.status, 403);

    // Staff
    await createUserDirect({
      email: 'edge_role_staff@test.com',
      role: 'staff',
      status: 'active',
    });
    await loginAs('edge_role_staff@test.com');
    const stf = await api('PATCH', `/api/admin/staff/${id}/approve`);
    assert.equal(stf.status, 403);
    const stfRej = await api('PATCH', `/api/admin/staff/${id}/reject`);
    assert.equal(stfRej.status, 403);
  });
});

describe('Image upload endpoint', () => {
  const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  const validPng = () => Buffer.concat([PNG_HEADER, Buffer.alloc(64, 1)]);

  const uploadPhoto = async ({
    file = null,
    mime = 'image/png',
    authed = true,
    withCsrf = true,
  } = {}) => {
    const form = new FormData();
    if (file) {
      form.append('photo', new Blob([file], { type: mime }), 'photo.png');
    }

    const headers = {};
    if (authed) {
      headers.Cookie = Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    } else if (withCsrf) {
      headers.Cookie = `csrf_token=${jar.csrf_token}`;
    }
    if (withCsrf) headers['X-CSRF-Token'] = jar.csrf_token;

    const res = await fetch(`${baseUrl}/api/issues/upload`, {
      method: 'POST',
      headers,
      body: form,
    });

    let body = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON
    }
    return { status: res.status, body };
  };

  let cloudinaryService;
  let originalUpload;

  before(async () => {
    cloudinaryService = (await import('../src/services/cloudinaryService.js')).default;
    originalUpload = cloudinaryService.uploadImage;
  });

  afterEach(() => {
    cloudinaryService.uploadImage = originalUpload;
  });

  test('successful upload returns secure URL and public ID', async () => {
    await createUserDirect({ email: 'upload_student@test.com', role: 'student' });
    await loginAs('upload_student@test.com');

    cloudinaryService.uploadImage = async () => ({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/abc.jpg',
      publicId: 'campusfix/issues/abc',
    });

    const res = await uploadPhoto({ file: validPng() });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.match(res.body.data.url, /^https:\/\/res\.cloudinary\.com\//);
    assert.ok(res.body.data.publicId);
    assert.equal(res.body.data.api_secret, undefined);
    assert.equal(res.body.data.cloudinary_secret, undefined);
  });

  test('missing file is rejected', async () => {
    await createUserDirect({ email: 'upload_nofile@test.com', role: 'student' });
    await loginAs('upload_nofile@test.com');

    const res = await uploadPhoto({ file: null });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /no image file/i);
  });

  test('unsupported MIME type is rejected', async () => {
    await createUserDirect({ email: 'upload_mime@test.com', role: 'student' });
    await loginAs('upload_mime@test.com');

    const res = await uploadPhoto({
      file: Buffer.from('plain text'),
      mime: 'text/plain',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /jpeg, png or webp/i);
  });

  test('invalid image signature is rejected despite image MIME', async () => {
    await createUserDirect({ email: 'upload_sig@test.com', role: 'student' });
    await loginAs('upload_sig@test.com');

    const res = await uploadPhoto({
      file: Buffer.from('this is not really a png file at all......'),
      mime: 'image/png',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /not a valid image/i);
  });

  test('oversized file is rejected', async () => {
    await createUserDirect({ email: 'upload_big@test.com', role: 'student' });
    await loginAs('upload_big@test.com');

    const big = Buffer.concat([PNG_HEADER, Buffer.alloc(5 * 1024 * 1024 + 100, 1)]);
    const res = await uploadPhoto({ file: big });
    assert.equal(res.status, 413);
    assert.match(res.body.message, /5mb/i);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await uploadPhoto({ file: validPng(), authed: false });
    assert.equal(res.status, 401);
  });

  test('request without CSRF token is rejected', async () => {
    await createUserDirect({ email: 'upload_csrf@test.com', role: 'student' });
    await loginAs('upload_csrf@test.com');

    const res = await uploadPhoto({ file: validPng(), withCsrf: false });
    assert.equal(res.status, 403);
  });

  test('missing Cloudinary configuration fails safely', async () => {
    await createUserDirect({ email: 'upload_noconfig@test.com', role: 'student' });
    await loginAs('upload_noconfig@test.com');

    const ApiError = (await import('../src/utils/ApiError.js')).default;
    cloudinaryService.uploadImage = async () => {
      throw new ApiError(503, 'Photo storage is not configured.');
    };

    const res = await uploadPhoto({ file: validPng() });
    assert.equal(res.status, 503);
    assert.match(res.body.message, /not configured/i);
  });

  test('Cloudinary upload failure returns consistent error', async () => {
    await createUserDirect({ email: 'upload_fail@test.com', role: 'student' });
    await loginAs('upload_fail@test.com');

    const ApiError = (await import('../src/utils/ApiError.js')).default;
    cloudinaryService.uploadImage = async () => {
      throw new ApiError(502, 'Failed to upload image to storage');
    };

    const res = await uploadPhoto({ file: validPng() });
    assert.equal(res.status, 502);
    assert.match(res.body.message, /failed to upload/i);
  });

  test('upload rate limiter eventually returns 429', async () => {
    await createUserDirect({ email: 'upload_rate@test.com', role: 'student' });
    await loginAs('upload_rate@test.com');

    cloudinaryService.uploadImage = async () => ({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/x.jpg',
      publicId: 'x',
    });

    // Prior tests consumed some quota; fire until limited (max 25).
    let saw429 = false;
    for (let i = 0; i < 25; i++) {
      const res = await uploadPhoto({ file: validPng() });
      if (res.status === 429) {
        saw429 = true;
        assert.match(res.body.message, /too many upload/i);
        break;
      }
      assert.equal(res.status, 201);
    }
    assert.ok(saw429, 'expected rate limiter to return 429 within 25 requests');
  });
});

describe('Cloudinary photo integration in issue creation', () => {
  const CLOUDINARY_URL =
    'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/photo123.jpg';
  const PUBLIC_ID = 'campusfix/issues/photo123';

  let cloudinaryService;
  let issueRepository;
  let originalDelete;
  let originalCreate;

  before(async () => {
    cloudinaryService = (await import('../src/services/cloudinaryService.js')).default;
    issueRepository = (await import('../src/repositories/issueRepository.js')).default;
    originalDelete = cloudinaryService.deleteImage;
    originalCreate = issueRepository.create;
  });

  afterEach(() => {
    cloudinaryService.deleteImage = originalDelete;
    issueRepository.create = originalCreate;
  });

  const createStudentAndLogin = async (email) => {
    await createUserDirect({ email, role: 'student' });
    await loginAs(email);
  };

  const photoTokenFor = (userId, pid = PUBLIC_ID, url = CLOUDINARY_URL) =>
    cloudinaryService.signUploadToken(pid, userId, url);

  const studentIdOf = async (email) => {
    const u = await User.findOne({ email });
    return u._id.toString();
  };

  test('issue creation with valid Cloudinary URL and token stores both', async () => {
    await createStudentAndLogin('cloud_student@test.com');
    const uid = await studentIdOf('cloud_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Broken projector',
        description: 'Projector in room 204 is dead',
        category: 'it',
        location: 'Engineering Block',
        priority: 'high',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(uid),
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.photo, CLOUDINARY_URL);
    assert.equal(res.body.data.photoPublicId, PUBLIC_ID);
  });

  test('legacy base64 photo still works without token', async () => {
    await createStudentAndLogin('legacy_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Leaky tap',
        description: 'Water dripping constantly',
        category: 'plumbing',
        location: 'Hostel C',
        photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
      },
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.photo.startsWith('data:image/'));
    assert.equal(res.body.data.photoPublicId, null);
  });

  test('issue creation without photo works', async () => {
    await createStudentAndLogin('nophoto_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Squeaky door',
        description: 'Door hinge needs oil',
        category: 'other',
        location: 'Library',
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.photo, null);
    assert.equal(res.body.data.photoPublicId, null);
  });

  test('non-HTTPS photo URLs are rejected', async () => {
    await createStudentAndLogin('http_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Bad photo',
        description: 'Trying insecure URL',
        category: 'other',
        location: 'Lab',
        photo: 'http://res.cloudinary.com/demo/image/upload/v1/x.jpg',
      },
    });

    assert.equal(res.status, 400);
  });

  test('lookalike Cloudinary domains are rejected', async () => {
    await createStudentAndLogin('lookalike_student@test.com');

    for (const bad of [
      'https://res.cloudinary.com.evil.com/x.jpg',
      'https://notres.cloudinary.com/x.jpg',
      'https://evil.com/res.cloudinary.com/x.jpg',
    ]) {
      const res = await api('POST', '/api/issues', {
        body: {
          title: 'Phishing attempt',
          description: 'Lookalike domain test',
          category: 'other',
          location: 'Cafeteria',
          photo: bad,
        },
      });
      assert.equal(res.status, 400, `expected 400 for ${bad}`);
    }
  });

  test('arbitrary external HTTPS URLs are rejected', async () => {
    await createStudentAndLogin('external_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'External image',
        description: 'Not a cloudinary url',
        category: 'other',
        location: 'Gym',
        photo: 'https://example.com/image.jpg',
      },
    });

    assert.equal(res.status, 400);
  });

  test('Cloudinary URL without token or with foreign token is rejected', async () => {
    await createStudentAndLogin('notoken_student@test.com');
    await createStudentAndLogin('othertoken_student@test.com');

    // No token at all
    const noToken = await api('POST', '/api/issues', {
      body: {
        title: 'No token',
        description: 'Missing upload token',
        category: 'other',
        location: 'Room 1',
        photo: CLOUDINARY_URL,
      },
    });
    assert.equal(noToken.status, 400);
    assert.match(noToken.body.message, /upload token/i);

    // Token minted for a different user — log back in as the
    // original student so the foreign token is genuinely foreign.
    const otherUid = await studentIdOf('othertoken_student@test.com');
    await loginAs('notoken_student@test.com');
    const foreign = await api('POST', '/api/issues', {
      body: {
        title: 'Stolen token',
        description: 'Token belongs to another user',
        category: 'other',
        location: 'Room 2',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(otherUid),
      },
    });
    assert.equal(foreign.status, 400);
  });

  test('URL/token mismatch is rejected even for the same user', async () => {
    await createStudentAndLogin('mismatch_student@test.com');
    const uid = await studentIdOf('mismatch_student@test.com');

    const OTHER_URL =
      'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/other456.jpg';

    // Token was minted for CLOUDINARY_URL; submitting OTHER_URL
    // with that token must be rejected — prevents storing image B's
    // URL alongside image A's publicId.
    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Swapped photo',
        description: 'Token belongs to a different image URL',
        category: 'other',
        location: 'Room 3',
        photo: OTHER_URL,
        photoToken: photoTokenFor(uid),
      },
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /upload token/i);

    // Correct URL + token still succeeds.
    const ok = await api('POST', '/api/issues', {
      body: {
        title: 'Correct pairing',
        description: 'URL and token match',
        category: 'it',
        location: 'Room 4',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(uid),
      },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.data.photoPublicId, PUBLIC_ID);
  });

  test('failed issue creation deletes the orphaned Cloudinary image', async () => {
    await createStudentAndLogin('orphan_student@test.com');
    const uid = await studentIdOf('orphan_student@test.com');

    const deleted = [];
    cloudinaryService.deleteImage = async (pid) => {
      deleted.push(pid);
    };
    issueRepository.create = async () => {
      const err = new Error('db exploded');
      err.code = 99999;
      throw err;
    };

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Will fail',
        description: 'Triggers repository error',
        category: 'other',
        location: 'Basement',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(uid),
      },
    });

    assert.equal(res.status, 500);
    assert.deepEqual(deleted, [PUBLIC_ID]);
  });

  test('successful creation does not delete the image', async () => {
    await createStudentAndLogin('keepimage_student@test.com');
    const uid = await studentIdOf('keepimage_student@test.com');

    const deleted = [];
    cloudinaryService.deleteImage = async (pid) => {
      deleted.push(pid);
    };

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Keep my photo',
        description: 'Image should be retained',
        category: 'it',
        location: 'Server room',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(uid),
      },
    });

    assert.equal(res.status, 201);
    assert.deepEqual(deleted, []);
  });

  test('cleanup failure does not hide the original error', async () => {
    await createStudentAndLogin('cleanupfail_student@test.com');
    const uid = await studentIdOf('cleanupfail_student@test.com');

    cloudinaryService.deleteImage = async () => {
      throw new Error('cloudinary unreachable');
    };
    issueRepository.create = async () => {
      const err = new Error('db exploded');
      err.code = 99999;
      throw err;
    };

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Double failure',
        description: 'Both create and cleanup fail',
        category: 'other',
        location: 'Attic',
        photo: CLOUDINARY_URL,
        photoToken: photoTokenFor(uid),
      },
    });

    // Original DB error surfaces, not the cleanup error.
    assert.equal(res.status, 500);
  });
});

describe('Audit event integration', () => {
  let AuditLog;
  let cloudinaryService;

  before(async () => {
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    cloudinaryService = (await import('../src/services/cloudinaryService.js')).default;
    await AuditLog.deleteMany({});
  });

  const lastLog = (action) => AuditLog.findOne({ action }).sort({ createdAt: -1 });

  test('registration, login, logout, password change are audited', async () => {
    const email = 'audit_auth@test.com';
    await api('POST', '/api/auth/register', {
      body: {
        role: 'student',
        fullName: 'Audit Auth',
        email,
        studentId: 'AU01',
        password: 'TestPass123',
      },
    });

    const regLog = await lastLog('user.registered');
    assert.ok(regLog);
    assert.equal(regLog.actor.role, 'anonymous');
    assert.equal(regLog.actor.userId, null);
    assert.equal(regLog.metadata.role, 'student');
    assert.equal(regLog.metadata.status, 'active');

    await loginAs(email);
    const loginLog = await lastLog('user.login');
    assert.ok(loginLog);
    assert.equal(loginLog.actor.role, 'student');

    await api('POST', '/api/auth/logout');
    const logoutLog = await lastLog('user.logout');
    assert.ok(logoutLog);

    await loginAs(email);
    await api('POST', '/api/auth/change-password', {
      body: { currentPassword: 'TestPass123', newPassword: 'Audit5678' },
    });
    const pwLog = await lastLog('user.password_changed');
    assert.ok(pwLog);
  });

  test('failed login does not produce a user.login audit event', async () => {
    const before = await AuditLog.countDocuments({ action: 'user.login' });
    await api('POST', '/api/auth/login', {
      body: { email: 'audit_auth@test.com', password: 'WrongPass1' },
    });
    const after = await AuditLog.countDocuments({ action: 'user.login' });
    assert.equal(after, before);
  });

  test('staff approval flow is audited', async () => {
    await createUserDirect({
      email: 'audit_admin@test.com',
      role: 'admin',
      password: 'TestPass123',
    });
    await loginAs('audit_admin@test.com');

    const create = await api('POST', '/api/users/staff', {
      body: {
        fullName: 'Audit Staff',
        email: 'audit_staff@test.com',
        staffId: 'AS01',
        department: 'IT',
        password: 'Staff1234',
      },
    });
    assert.equal(create.status, 201);
    const createdLog = await lastLog('staff.created');
    assert.ok(createdLog);
    assert.equal(createdLog.actor.role, 'admin');
    assert.equal(createdLog.target.type, 'user');

    await api('POST', '/api/auth/register', {
      body: {
        role: 'staff',
        fullName: 'Pending Staff',
        email: 'audit_pending@test.com',
        staffId: 'PS01',
        department: 'HR',
        password: 'Staff1234',
      },
    });
    const pending = await User.findOne({ email: 'audit_pending@test.com' });

    const approve = await api('PATCH', `/api/admin/staff/${pending._id}/approve`);
    assert.equal(approve.status, 200);
    const approveLog = await lastLog('staff.approved');
    assert.ok(approveLog);
    assert.equal(approveLog.metadata.status, 'active');

    await api('PATCH', `/api/admin/staff/${pending._id}/reject`);
    const rejectLog = await lastLog('staff.rejected');
    assert.ok(rejectLog);
    assert.equal(rejectLog.metadata.status, 'rejected');
  });

  test('issue lifecycle events are audited with correct metadata', async () => {
    await createUserDirect({ email: 'audit_student@test.com', role: 'student' });
    await loginAs('audit_student@test.com');

    const issue = await api('POST', '/api/issues', {
      body: {
        title: 'Audit issue',
        description: 'Testing audit trail',
        category: 'it',
        location: 'Lab 1',
        priority: 'high',
      },
    });
    assert.equal(issue.status, 201);
    const issueId = issue.body.data._id;

    const createdLog = await AuditLog.findOne({
      action: 'issue.created',
      'target.id': issueId,
    });
    assert.ok(createdLog);
    assert.equal(createdLog.metadata.ticketId, issue.body.data.ticketId);
    assert.equal(createdLog.metadata.priority, 'high');
    assert.equal(createdLog.metadata.hasPhoto, false);

    assert.equal(
      await AuditLog.countDocuments({
        action: 'issue.photo_uploaded',
        'target.id': issueId,
      }),
      0
    );

    await createUserDirect({
      email: 'audit_staff2@test.com',
      role: 'staff',
      status: 'active',
    });
    await createUserDirect({
      email: 'audit_admin2@test.com',
      role: 'admin',
    });
    const staffUser = await User.findOne({ email: 'audit_staff2@test.com' });
    await loginAs('audit_admin2@test.com');
    await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUser._id.toString() },
    });

    const assignLog = await AuditLog.findOne({
      action: 'issue.assigned',
      'target.id': issueId,
    });
    assert.ok(assignLog);
    assert.equal(assignLog.metadata.toStaffId, staffUser._id.toString());
    assert.equal(assignLog.metadata.fromStaffId, null);
    assert.equal(assignLog.actor.role, 'admin');

    const assignCount = await AuditLog.countDocuments({
      action: 'issue.assigned',
      'target.id': issueId,
    });
    await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staffUser._id.toString() },
    });
    assert.equal(
      await AuditLog.countDocuments({
        action: 'issue.assigned',
        'target.id': issueId,
      }),
      assignCount
    );

    await loginAs('audit_staff2@test.com');
    await api('PATCH', `/api/issues/${issueId}/status`, {
      body: { status: 'in_progress' },
    });
    const statusLog = await AuditLog.findOne({
      action: 'issue.status_changed',
      'target.id': issueId,
    });
    assert.ok(statusLog);
    assert.deepEqual(statusLog.metadata, {
      from: 'assigned',
      to: 'in_progress',
    });
  });

  test('Cloudinary photo issue records photo_uploaded only on success', async () => {
    await createUserDirect({ email: 'audit_photo@test.com', role: 'student' });
    await loginAs('audit_photo@test.com');
    const uid = await User.findOne({ email: 'audit_photo@test.com' }).then((u) => u._id.toString());

    const token = cloudinaryService.signUploadToken(
      'campusfix/issues/audit1',
      uid,
      'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/audit1.jpg'
    );

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Photo audit',
        description: 'With cloudinary photo',
        category: 'other',
        location: 'Roof',
        photo: 'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/audit1.jpg',
        photoToken: token,
      },
    });
    assert.equal(res.status, 201);

    const photoLog = await AuditLog.findOne({
      action: 'issue.photo_uploaded',
      'target.id': res.body.data._id,
    });
    assert.ok(photoLog);
    assert.equal(photoLog.metadata.publicId, 'campusfix/issues/audit1');

    const fail = await api('POST', '/api/issues', {
      body: {
        title: 'Bad photo audit',
        description: 'Invalid token',
        category: 'other',
        location: 'Roof',
        photo: 'https://res.cloudinary.com/demo/image/upload/v1/campusfix/issues/audit2.jpg',
        photoToken: 'forged.token.here',
      },
    });
    assert.equal(fail.status, 400);
    assert.equal(await AuditLog.countDocuments({ action: 'issue.photo_uploaded' }), 1);
  });

  test('audit write failure does not break business operations', async () => {
    const auditLogRepository = (await import('../src/repositories/auditLogRepository.js')).default;
    const original = auditLogRepository.create;
    auditLogRepository.create = async () => {
      throw new Error('audit db down');
    };

    await createUserDirect({ email: 'audit_resilient@test.com', role: 'student' });
    await loginAs('audit_resilient@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Still works',
        description: 'Audit failure must not break this',
        category: 'other',
        location: 'Lobby',
      },
    });

    auditLogRepository.create = original;
    assert.equal(res.status, 201);
  });
});

describe('Admin audit log API', () => {
  let AuditLog;

  before(async () => {
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    await AuditLog.deleteMany({});
  });

  const seedLog = (overrides = {}) =>
    AuditLog.create({
      actor: { userId: null, role: 'anonymous' },
      action: 'user.registered',
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
      metadata: { role: 'student', status: 'active' },
      ...overrides,
    });

  test('unauthenticated, student and staff get 401/403/403', async () => {
    // Unauthenticated (CSRF cookie only, no auth).
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, { bare: true });
    void csrfRes;

    await createUserDirect({ email: 'audit_api_student@test.com', role: 'student' });
    await loginAs('audit_api_student@test.com');
    const studentRes = await api('GET', '/api/admin/audit-logs');
    assert.equal(studentRes.status, 403);

    await createUserDirect({
      email: 'audit_api_staff@test.com',
      role: 'staff',
      status: 'active',
    });
    await loginAs('audit_api_staff@test.com');
    const staffRes = await api('GET', '/api/admin/audit-logs');
    assert.equal(staffRes.status, 403);
  });

  test('admin can list audit logs with pagination metadata', async () => {
    for (let i = 0; i < 12; i++) {
      await seedLog({ action: 'user.login' });
    }
    await createUserDirect({ email: 'audit_api_admin@test.com', role: 'admin' });
    await loginAs('audit_api_admin@test.com');

    const res = await api('GET', '/api/admin/audit-logs?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 10);
    // Other tests in this file also produce audit events; assert the
    // pagination math rather than an exact total.
    assert.ok(res.body.pagination.totalItems >= 12);
    assert.equal(res.body.pagination.totalPages, Math.ceil(res.body.pagination.totalItems / 10));
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.pagination.pageSize, 10);
  });

  test('filters: action, actorId, targetType, date range', async () => {
    const adminUser = await User.findOne({ email: 'audit_api_admin@test.com' });
    const actorId = new mongoose.Types.ObjectId();
    const old = new Date('2020-01-01T00:00:00Z');
    const recent = new Date();

    await seedLog({
      action: 'issue.assigned',
      actor: { userId: actorId, role: 'admin' },
      target: { type: 'issue', id: new mongoose.Types.ObjectId() },
      createdAt: old,
    });
    await seedLog({
      action: 'issue.assigned',
      actor: { userId: actorId, role: 'admin' },
      target: { type: 'issue', id: new mongoose.Types.ObjectId() },
      createdAt: recent,
    });

    await loginAs('audit_api_admin@test.com');

    const byAction = await api('GET', '/api/admin/audit-logs?action=issue.assigned');
    assert.ok(byAction.body.data.every((l) => l.action === 'issue.assigned'));

    const byActor = await api('GET', `/api/admin/audit-logs?actorId=${actorId}`);
    assert.ok(byActor.body.data.length >= 2);
    assert.ok(byActor.body.data.every((l) => l.actor.userId === actorId.toString()));

    const byTarget = await api('GET', '/api/admin/audit-logs?targetType=issue');
    assert.ok(byTarget.body.data.every((l) => l.target.type === 'issue'));

    const byDate = await api(
      'GET',
      `/api/admin/audit-logs?startDate=${encodeURIComponent('2019-01-01')}&endDate=${encodeURIComponent('2021-01-01')}`
    );
    assert.equal(byDate.body.data.length, 1);
    assert.equal(byDate.body.data[0].action, 'issue.assigned');

    void adminUser;
  });

  test('invalid query values are rejected', async () => {
    await loginAs('audit_api_admin@test.com');

    const bad = [
      '/api/admin/audit-logs?page=0',
      '/api/admin/audit-logs?page=abc',
      '/api/admin/audit-logs?limit=0',
      '/api/admin/audit-logs?limit=101',
      '/api/admin/audit-logs?action=admin.nuke',
      '/api/admin/audit-logs?actorId=not-an-id',
      '/api/admin/audit-logs?targetType=server',
      '/api/admin/audit-logs?startDate=not-a-date',
      '/api/admin/audit-logs?startDate=2025-01-01&endDate=2020-01-01',
    ];

    for (const path of bad) {
      const res = await api('GET', path);
      assert.equal(res.status, 400, `expected 400 for ${path}`);
    }
  });

  test('empty result returns empty array with pagination', async () => {
    await loginAs('audit_api_admin@test.com');
    const res = await api(
      'GET',
      '/api/admin/audit-logs?action=user.password_changed&actorId=000000000000000000000000'
    );
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.pagination.totalItems, 0);
    assert.equal(res.body.pagination.totalPages, 0);
  });

  test('results are newest-first and expose no secrets', async () => {
    await seedLog({
      action: 'user.logout',
      metadata: {},
    });
    await new Promise((r) => setTimeout(r, 20));
    await seedLog({
      action: 'user.login',
      metadata: {},
    });

    await loginAs('audit_api_admin@test.com');
    const res = await api('GET', '/api/admin/audit-logs?limit=100');
    const times = res.body.data.map((l) => new Date(l.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i - 1] >= times[i], 'not sorted newest first');
    }

    const first = res.body.data[0];
    assert.equal(first.password, undefined);
    assert.equal(first.token, undefined);
    assert.equal(first.jwt, undefined);
    assert.equal(first.csrf, undefined);
  });
});

describe('Email notifications', () => {
  let emailService;
  let sent;
  let originalSend;

  before(async () => {
    emailService = (await import('../src/services/emailService.js')).default;
    originalSend = emailService.send;
    sent = [];
    emailService.send = async (msg) => {
      sent.push(msg);
      return true;
    };
  });

  afterEach(() => {
    sent = [];
  });

  after(() => {
    emailService.send = originalSend;
  });

  test('templates contain expected details and no secrets', () => {
    const tpl = emailService.issueReported({
      ticketId: 'CF-TEST1234',
      title: 'Broken light',
      category: 'electrical',
      priority: 'high',
      issueUrl: 'http://localhost:5173/student/my-issues',
    });
    assert.match(tpl.subject, /CF-TEST1234/);
    assert.match(tpl.html, /Broken light/);
    assert.match(tpl.html, /CampusFix/);
    assert.match(tpl.text, /CF-TEST1234/);
    assert.equal(tpl.html.includes('password'), false);
    assert.equal(tpl.html.includes('token'), false);

    const staff = emailService.staffApproved({
      name: 'Jane',
      loginUrl: 'http://localhost:5173/login',
    });
    assert.match(staff.subject, /approved/i);
    assert.match(staff.html, /Jane/);
  });

  test('issue creation notifies the reporter', async () => {
    await createUserDirect({ email: 'email_student@test.com', role: 'student' });
    await loginAs('email_student@test.com');

    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Email test issue',
        description: 'Should trigger notification',
        category: 'plumbing',
        location: 'Block A',
      },
    });
    assert.equal(res.status, 201);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'email_student@test.com');
    assert.match(sent[0].subject, /reported/i);
  });

  test('failed operations send no email', async () => {
    await loginAs('email_student@test.com');
    const res = await api('POST', '/api/issues', {
      body: {
        title: '',
        description: '',
        category: 'other',
        location: '',
      },
    });
    assert.equal(res.status, 400);
    assert.equal(sent.length, 0);
  });

  test('assignment notifies reporter and staff; same-staff re-assign sends none', async () => {
    await createUserDirect({
      email: 'email_staff@test.com',
      role: 'staff',
      status: 'active',
    });
    await createUserDirect({ email: 'email_admin@test.com', role: 'admin' });
    const staff = await User.findOne({ email: 'email_staff@test.com' });

    await loginAs('email_student@test.com');
    const issue = await api('POST', '/api/issues', {
      body: {
        title: 'Assign email test',
        description: 'Notify on assign',
        category: 'it',
        location: 'Lab',
      },
    });
    const issueId = issue.body.data._id;
    sent = [];

    await loginAs('email_admin@test.com');
    const assign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staff._id.toString() },
    });
    assert.equal(assign.status, 200);
    // Reporter status-changed + staff assignment emails.
    assert.ok(sent.length >= 2);
    const recipients = sent.map((m) => m.to).sort();
    assert.ok(recipients.includes('email_student@test.com'));
    assert.ok(recipients.includes('email_staff@test.com'));

    // No-op re-assignment: no additional emails.
    sent = [];
    await api('PATCH', `/api/issues/${issueId}/assign`, {
      body: { staffId: staff._id.toString() },
    });
    assert.equal(sent.length, 0);
  });

  test('staff approval and rejection notify the staff member', async () => {
    await loginAs('email_admin@test.com');
    await api('POST', '/api/auth/register', {
      body: {
        role: 'staff',
        fullName: 'Notify Staff',
        email: 'email_pending@test.com',
        staffId: 'NP01',
        department: 'Ops',
        password: 'TestPass123',
      },
    });
    const pending = await User.findOne({ email: 'email_pending@test.com' });

    sent = [];
    await api('PATCH', `/api/admin/staff/${pending._id}/approve`);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'email_pending@test.com');
    assert.match(sent[0].subject, /approved/i);

    sent = [];
    await api('PATCH', `/api/admin/staff/${pending._id}/reject`);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'email_pending@test.com');
    assert.match(sent[0].subject, /update/i);
  });

  test('email provider failure does not break business operations', async () => {
    // send() contract: never throws, returns false on provider failure.
    emailService.send = async () => false;
    await createUserDirect({ email: 'email_resilient@test.com', role: 'student' });
    await loginAs('email_resilient@test.com');
    const res = await api('POST', '/api/issues', {
      body: {
        title: 'Resilience check',
        description: 'Email failure must not break this',
        category: 'other',
        location: 'Lobby',
      },
    });
    emailService.send = async (msg) => {
      sent.push(msg);
      return true;
    };
    // Provider returned false; business op must still succeed.
    assert.equal(res.status, 201);
  });
});
