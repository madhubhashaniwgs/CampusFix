import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';
dotenv.config();

const TEST_DB_NAME = 'campusfix_test';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set. Tests require server/.env configuration.');
}

// Point the connection at the dedicated test database — never run
// destructive test cleanup against campusfix_db or production.
process.env.MONGODB_URI = process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, `/${TEST_DB_NAME}$1`);

const resolvedDbMatch = process.env.MONGODB_URI.match(/^mongodb(\+srv)?:\/\/[^/]+\/([^/?]+)/);
if (!resolvedDbMatch || resolvedDbMatch[2] !== TEST_DB_NAME) {
  throw new Error(`Test database name could not be resolved to "${TEST_DB_NAME}". Aborting.`);
}

let AuditLog;
let auditLogRepository;
let auditService;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const connectedDbName = mongoose.connection.db.databaseName;
  assert.equal(
    connectedDbName,
    TEST_DB_NAME,
    `Connected to "${connectedDbName}" instead of "${TEST_DB_NAME}". Aborting.`
  );

  // Only the auditlogs collection is touched — users/issues belong to
  // api.test.js which runs in a parallel process on the same DB.
  await mongoose.connection.db.collection('auditlogs').deleteMany({});

  AuditLog = (await import('../src/models/AuditLog.js')).default;
  auditLogRepository = (await import('../src/repositories/auditLogRepository.js')).default;
  auditService = (await import('../src/services/auditService.js')).default;
});

after(async () => {
  await mongoose.connection.db.collection('auditlogs').deleteMany({});
  await mongoose.disconnect();
});

describe('AuditLog model and repository', () => {
  test('valid event is persisted with expected fields', async () => {
    const userId = new mongoose.Types.ObjectId();

    const result = await auditService.record({
      action: 'user.login',
      actor: { userId, role: 'student' },
      target: { type: 'user', id: userId },
    });

    assert.equal(result, true);

    const logs = await AuditLog.find({});
    assert.equal(logs.length, 1);
    assert.equal(logs[0].action, 'user.login');
    assert.equal(logs[0].actor.userId.toString(), userId.toString());
    assert.equal(logs[0].actor.role, 'student');
    assert.equal(logs[0].target.type, 'user');
    assert.ok(logs[0].createdAt instanceof Date);
  });

  test('anonymous registration event works without userId', async () => {
    const result = await auditService.record({
      action: 'user.registered',
      actor: { userId: null, role: 'anonymous' },
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
      metadata: { role: 'student', status: 'active', secret: 'drop-me' },
    });

    assert.equal(result, true);

    const log = await AuditLog.findOne({ action: 'user.registered' });
    assert.equal(log.actor.userId, null);
    assert.equal(log.actor.role, 'anonymous');
    assert.equal(log.metadata.role, 'student');
    assert.equal(log.metadata.status, 'active');
    assert.equal(log.metadata.secret, undefined);
  });

  test('unsupported action is rejected', async () => {
    const result = await auditService.record({
      action: 'admin.nuke_database',
      actor: { userId: null, role: 'anonymous' },
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
    });

    assert.equal(result, null);
    assert.equal(await AuditLog.countDocuments({}), 2); // unchanged
  });

  test('invalid actor role and invalid target are rejected', async () => {
    const bad1 = await auditService.record({
      action: 'user.login',
      actor: { userId: new mongoose.Types.ObjectId(), role: 'superuser' },
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
    });
    assert.equal(bad1, null);

    const bad2 = await auditService.record({
      action: 'user.login',
      actor: { userId: new mongoose.Types.ObjectId(), role: 'student' },
      target: { type: 'server', id: new mongoose.Types.ObjectId() },
    });
    assert.equal(bad2, null);

    const bad3 = await auditService.record({
      action: 'user.login',
      actor: { userId: 'not-an-objectid', role: 'student' },
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
    });
    assert.equal(bad3, null);
  });

  test('metadata allowlist drops disallowed and secret fields', async () => {
    await auditService.record({
      action: 'issue.status_changed',
      actor: { userId: new mongoose.Types.ObjectId(), role: 'admin' },
      target: { type: 'issue', id: new mongoose.Types.ObjectId() },
      metadata: {
        from: 'reported',
        to: 'in_progress',
        password: 'hunter2',
        jwt: 'secret.token',
        csrf: 'csrf-value',
        body: { everything: 'here' },
      },
    });

    const log = await AuditLog.findOne({ action: 'issue.status_changed' });
    assert.deepEqual(log.metadata, { from: 'reported', to: 'in_progress' });
  });

  test('audit write failure is handled safely and never throws', async () => {
    const originalCreate = auditLogRepository.create;
    auditLogRepository.create = async () => {
      throw new Error('db write failed');
    };

    const result = await auditService.record({
      action: 'user.logout',
      actor: { userId: null, role: 'anonymous' },
      target: { type: 'user', id: new mongoose.Types.ObjectId() },
    });

    auditLogRepository.create = originalCreate;
    assert.equal(result, false);
  });
});

describe('AuditLog repository pagination', () => {
  test('paginated retrieval returns correct pages and metadata', async () => {
    // Seed 25 records directly.
    const docs = Array.from({ length: 25 }, () => ({
      actor: { userId: null, role: 'anonymous' },
      action: 'user.login',
      target: {
        type: 'user',
        id: new mongoose.Types.ObjectId(),
      },
      metadata: {},
    }));
    await AuditLog.insertMany(docs);

    const page1 = await auditLogRepository.findPaginated({ page: 1, limit: 10 });
    const page3 = await auditLogRepository.findPaginated({ page: 3, limit: 10 });

    assert.equal(page1.logs.length, 10);
    // Page 3 holds whatever remains after two full pages.
    assert.equal(page3.logs.length, Math.max(0, page1.totalItems - 20));
    assert.ok(page1.totalItems >= 25);

    const filtered = await auditLogRepository.findPaginated({
      page: 1,
      limit: 10,
      action: 'user.login',
    });
    assert.ok(filtered.logs.every((l) => l.action === 'user.login'));
  });
});
