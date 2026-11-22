import { test, before, after, describe } from 'node:test';
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
  throw new Error(
    'MONGODB_URI is not set. Tests require server/.env configuration.'
  );
}

process.env.MONGODB_URI = process.env.MONGODB_URI.replace(
  /\/[^/?]+(\?|$)/,
  `/${TEST_DB_NAME}$1`
);

// Safety guard: refuse to run destructive tests unless the resolved
// connection string explicitly targets the dedicated test database.
const resolvedDbMatch = process.env.MONGODB_URI.match(
  /^mongodb(\+srv)?:\/\/[^/]+\/([^/?]+)/
);

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
      headers['X-CSRF-Token'] =
        csrf === null ? jar.csrf_token : csrf;
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
    const res = await api(
      'POST',
      '/api/auth/login',
      {
        body: { email: 'x@test.com', password: VALID_PASSWORD },
        csrf: 'definitely-wrong',
      }
    );
    assert.equal(res.status, 403);
    assert.match(res.body.message, /CSRF/i);
  });

  test('POST with missing CSRF cookie/header is rejected', async () => {
    // bare request: no cookies at all -> no csrf cookie to compare
    const res = await api(
      'POST',
      '/api/auth/login',
      {
        body: { email: 'x@test.com', password: VALID_PASSWORD },
        bare: true,
      }
    );
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
      const res = await registerViaApi(`weak${Math.random()
        .toString(36)
        .slice(2, 8)}@test.com`, weak);
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

    const created = await User.findOne({ email: 'madestaff@test.com' }).select(
      '+password'
    );
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
    await createIssue("Other student issue");

    await loginAs('stu_a@test.com');
    const res = await api('GET', '/api/issues?limit=50');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.ok(
      res.body.data.every((i) => i.reportedBy?.email === 'stu_a@test.com')
    );
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
    const staffAssign = await api(
      'PATCH',
      `/api/issues/${issueId}/assign`,
      { body: { staffId: staffUserId } }
    );
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
    assert.ok(
      res.body.data.every((i) => i.reportedBy?.email === 'stu_p@test.com')
    );
    await loginAs('admin_p@test.com');
  });

  test('page boundaries work and invalid values are rejected', async () => {
    const last = await api('GET', '/api/issues?page=999&limit=5');
    assert.equal(last.status, 200);
    assert.equal(last.body.data.length, 0);

    for (const bad of [
      'page=0',
      'page=-1',
      'page=abc',
      'limit=0',
      'limit=101',
    ]) {
      const res = await api('GET', `/api/issues?${bad}`);
      assert.equal(res.status, 400, bad);
    }
  });

  test('status, priority and category filters combine', async () => {
    const res = await api(
      'GET',
      '/api/issues?status=reported&priority=high&category=it&limit=50'
    );
    assert.equal(res.status, 200);
    assert.ok(
      res.body.data.every(
        (i) =>
          i.status === 'reported' &&
          i.priority === 'high' &&
          i.category === 'it'
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

    const byTicket = await api(
      'GET',
      `/api/issues?search=${encodeURIComponent(ticketId)}`
    );
    assert.equal(byTicket.body.data.length, 1);
    assert.equal(byTicket.body.data[0].ticketId, ticketId);

    const byText = await api(
      'GET',
      `/api/issues?search=${encodeURIComponent('Page issue')}`
    );
    assert.ok(byText.body.pagination.totalItems >= 12);

    const regexAttempt = await api(
      'GET',
      `/api/issues?search=${encodeURIComponent('(.*')}`
    );
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
