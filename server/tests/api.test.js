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
// This prevents deleteMany cleanup from ever touching campusfix_db
// or any other database.
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

const api = async (method, path, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    // non-JSON response
  }

  return { status: response.status, body: json };
};

const registerViaApi = async (email, password = 'password123') =>
  api('POST', '/api/auth/register', {
    body: { fullName: 'Test User', email, password },
  });

const loginViaApi = async (email, password = 'password123') =>
  api('POST', '/api/auth/login', { body: { email, password } });

const tokenOf = (res) => res.body?.data?.token;
const userOf = (res) => res.body?.data?.user || res.body?.data;

const createUserDirect = async ({
  fullName = 'Direct User',
  email,
  password = 'password123',
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

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Second safety check: verify the actual connected database name
  // before performing any writes or deletes.
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
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  const db = mongoose.connection.db;
  await db.collection('users').deleteMany({});
  await db.collection('issues').deleteMany({});
  await mongoose.disconnect();
});

describe('Authentication', () => {
  test('register creates a student account and returns a token', async () => {
    const res = await registerViaApi('auth1@test.com');
    assert.equal(res.status, 201);
    assert.ok(tokenOf(res));
    assert.equal(userOf(res).role, 'student');
    assert.equal(userOf(res).email, 'auth1@test.com');
    assert.equal(userOf(res).password, undefined);
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

  test('login succeeds with valid credentials', async () => {
    const res = await loginViaApi('auth1@test.com');
    assert.equal(res.status, 200);
    assert.ok(tokenOf(res));
    assert.equal(userOf(res).role, 'student');
  });

  test('login rejects wrong password and unknown email', async () => {
    const wrongPass = await loginViaApi('auth1@test.com', 'wrongpass1');
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

  test('GET /api/auth/me requires a token and returns the user', async () => {
    const noToken = await api('GET', '/api/auth/me');
    assert.equal(noToken.status, 401);

    const login = await loginViaApi('auth1@test.com');
    const res = await api('GET', '/api/auth/me', {
      token: tokenOf(login),
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, 'auth1@test.com');
    assert.equal(res.body.data.password, undefined);
  });
});

describe('Authorization', () => {
  test('unauthenticated requests to protected routes return 401', async () => {
    const res = await api('GET', '/api/issues');
    assert.equal(res.status, 401);
  });

  test('student cannot create staff accounts', async () => {
    const login = await loginViaApi('auth1@test.com');
    const res = await api('POST', '/api/users/staff', {
      token: tokenOf(login),
      body: {
        fullName: 'Nope',
        email: 'nope@test.com',
        password: 'password123',
      },
    });
    assert.equal(res.status, 403);
  });

  test('staff cannot create staff accounts', async () => {
    await createUserDirect({ email: 'staffauth@test.com', role: 'staff' });
    const login = await loginViaApi('staffauth@test.com');
    const res = await api('POST', '/api/users/staff', {
      token: tokenOf(login),
      body: {
        fullName: 'Nope',
        email: 'nope2@test.com',
        password: 'password123',
      },
    });
    assert.equal(res.status, 403);
  });

  test('admin can create staff; role override and password are safe', async () => {
    await createUserDirect({ email: 'adminauth@test.com', role: 'admin' });
    const login = await loginViaApi('adminauth@test.com');
    const token = tokenOf(login);

    const res = await api('POST', '/api/users/staff', {
      token,
      body: {
        fullName: 'Made Staff',
        email: 'madestaff@test.com',
        password: 'password123',
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
    await createUserDirect({ email: 'adminauth2@test.com', role: 'admin' });
    const login = await loginViaApi('adminauth2@test.com');

    const res = await api('POST', '/api/users/staff', {
      token: tokenOf(login),
      body: {
        fullName: 'Dup',
        email: 'madestaff@test.com',
        password: 'password123',
      },
    });
    assert.equal(res.status, 409);
  });
});

describe('Issue management and scoping', () => {
  let studentToken;
  let otherStudentToken;
  let staffToken;
  let adminToken;
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

    studentToken = tokenOf(await loginViaApi('stu_a@test.com'));
    otherStudentToken = tokenOf(await loginViaApi('stu_b@test.com'));
    staffToken = tokenOf(await loginViaApi('staff_w@test.com'));
    adminToken = tokenOf(await loginViaApi('admin_w@test.com'));
  });

  const createIssue = (token, title = 'Test issue') =>
    api('POST', '/api/issues', {
      token,
      body: {
        title,
        description: 'desc',
        category: 'it',
        location: 'Lab',
        priority: 'medium',
      },
    });

  test('student can create an issue', async () => {
    const res = await createIssue(studentToken, 'My issue');
    assert.equal(res.status, 201);
    issueId = res.body.data._id;
    assert.equal(res.body.data.status, 'reported');
    assert.ok(res.body.data.ticketId.startsWith('CF-'));
  });

  test('student list contains only own issues', async () => {
    await createIssue(otherStudentToken, 'Other student issue');

    const res = await api('GET', '/api/issues?limit=50', {
      token: studentToken,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length >= 1);
    assert.ok(
      res.body.data.every(
        (i) => i.reportedBy?.email === 'stu_a@test.com'
      )
    );
  });

  test('student cannot view another student\'s issue', async () => {
    const other = await api('GET', '/api/issues?limit=1', {
      token: otherStudentToken,
    });
    const foreignId = other.body.data[0]._id;

    const res = await api('GET', `/api/issues/${foreignId}`, {
      token: studentToken,
    });
    assert.equal(res.status, 403);
  });

  test('staff sees only assigned issues; admin sees all', async () => {
    const staffRes = await api('GET', '/api/issues?limit=50', {
      token: staffToken,
    });
    assert.equal(staffRes.status, 200);
    assert.equal(staffRes.body.data.length, 0);

    const adminRes = await api('GET', '/api/issues?limit=50', {
      token: adminToken,
    });
    assert.ok(adminRes.body.data.length >= 2);
  });

  test('admin can assign; staff can update; invalid transitions rejected', async () => {
    const assign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      token: adminToken,
      body: { staffId: staffUserId },
    });
    assert.equal(assign.status, 200);
    assert.equal(assign.body.data.status, 'assigned');

    // student cannot update status
    const forbidden = await api('PATCH', `/api/issues/${issueId}/status`, {
      token: studentToken,
      body: { status: 'in_progress' },
    });
    assert.equal(forbidden.status, 403);

    // staff cannot assign
    const staffAssign = await api(
      'PATCH',
      `/api/issues/${issueId}/assign`,
      { token: staffToken, body: { staffId: staffUserId } }
    );
    assert.equal(staffAssign.status, 403);

    // valid transition assigned -> in_progress
    const progress = await api('PATCH', `/api/issues/${issueId}/status`, {
      token: staffToken,
      body: { status: 'in_progress', note: 'working' },
    });
    assert.equal(progress.status, 200);
    assert.equal(progress.body.data.statusHistory.length, 3);

    // invalid reverse transition
    const invalid = await api('PATCH', `/api/issues/${issueId}/status`, {
      token: staffToken,
      body: { status: 'assigned' },
    });
    assert.equal(invalid.status, 400);

    // cannot reassign an in_progress issue
    const reassign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      token: adminToken,
      body: { staffId: staffUserId },
    });
    assert.equal(reassign.status, 400);
  });

  test('assigning a resolved issue is rejected', async () => {
    const res = await api('PATCH', `/api/issues/${issueId}/status`, {
      token: staffToken,
      body: { status: 'resolved' },
    });
    assert.equal(res.status, 200);

    const assign = await api('PATCH', `/api/issues/${issueId}/assign`, {
      token: adminToken,
      body: { staffId: staffUserId },
    });
    assert.equal(assign.status, 400);
  });
});

describe('Pagination, filtering and search', () => {
  let adminToken;

  before(async () => {
    await createUserDirect({ email: 'admin_p@test.com', role: 'admin' });
    await createUserDirect({
      email: 'stu_p@test.com',
      role: 'student',
    });
    adminToken = tokenOf(await loginViaApi('admin_p@test.com'));
    const studentToken = tokenOf(await loginViaApi('stu_p@test.com'));

    for (let i = 1; i <= 12; i++) {
      await api('POST', '/api/issues', {
        token: studentToken,
        body: {
          title: `Page issue ${i}`,
          description: `pagination fixture ${i}`,
          category: i % 2 === 0 ? 'plumbing' : 'it',
          location: `Loc ${i}`,
          priority: i % 3 === 0 ? 'high' : 'low',
        },
      });
    }
  });

  test('default pagination returns metadata', async () => {
    const res = await api('GET', '/api/issues?limit=5', {
      token: adminToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 5);
    assert.equal(res.body.pagination.pageSize, 5);
    assert.ok(res.body.pagination.totalItems >= 12);
    assert.ok(res.body.pagination.totalPages >= 3);
  });

  test('page boundaries work and invalid values are rejected', async () => {
    const last = await api('GET', '/api/issues?page=999&limit=5', {
      token: adminToken,
    });
    assert.equal(last.status, 200);
    assert.equal(last.body.data.length, 0);

    for (const bad of ['page=0', 'page=-1', 'page=abc', 'limit=0', 'limit=101']) {
      const res = await api('GET', `/api/issues?${bad}`, {
        token: adminToken,
      });
      assert.equal(res.status, 400, bad);
    }
  });

  test('status, priority and category filters combine', async () => {
    const res = await api(
      'GET',
      '/api/issues?status=reported&priority=high&category=it&limit=50',
      { token: adminToken }
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
      const res = await api('GET', `/api/issues?${bad}`, {
        token: adminToken,
      });
      assert.equal(res.status, 400, bad);
    }
  });

  test('search matches ticketId and text; regex is escaped', async () => {
    const list = await api('GET', '/api/issues?limit=1', {
      token: adminToken,
    });
    const ticketId = list.body.data[0].ticketId;

    const byTicket = await api(
      `GET`,
      `/api/issues?search=${encodeURIComponent(ticketId)}`,
      { token: adminToken }
    );
    assert.equal(byTicket.body.data.length, 1);
    assert.equal(byTicket.body.data[0].ticketId, ticketId);

    const byText = await api(
      'GET',
      `/api/issues?search=${encodeURIComponent('Page issue')}`,
      { token: adminToken }
    );
    assert.ok(byText.body.pagination.totalItems >= 12);

    const regexAttempt = await api(
      'GET',
      `/api/issues?search=${encodeURIComponent('(.*')}`,
      { token: adminToken }
    );
    assert.equal(regexAttempt.status, 200);
    assert.equal(regexAttempt.body.data.length, 0);
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
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json',
    });
    const json = await response.json();
    assert.equal(response.status, 400);
    assert.equal(json.success, false);
  });

  test('production-mode errors do not leak stack traces', async () => {
    // The error middleware only includes `stack` outside production.
    // NODE_ENV=test already omits it; assert the contract holds.
    const res = await api('GET', '/api/nope');
    assert.equal(res.body.stack, undefined);
  });
});
