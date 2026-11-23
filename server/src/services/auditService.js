import mongoose from 'mongoose';

import auditLogRepository from '../repositories/auditLogRepository.js';
import { emitToRole } from '../socket/socketServer.js';

// Explicit allowlist of supported audit actions. Anything else is
// rejected so callers cannot invent arbitrary event names.
const SUPPORTED_ACTIONS = new Set([
  'user.registered',
  'user.login',
  'user.logout',
  'user.password_changed',
  'staff.created',
  'staff.approved',
  'staff.rejected',
  'issue.created',
  'issue.assigned',
  'issue.status_changed',
  'issue.photo_uploaded',
]);

const VALID_ROLES = new Set(['student', 'staff', 'admin', 'anonymous']);
const VALID_TARGET_TYPES = new Set(['issue', 'user']);

// Per-action metadata allowlists. Only these keys may be persisted;
// everything else (including secrets, tokens, bodies) is dropped.
const METADATA_ALLOWLIST = {
  'user.registered': ['role', 'status'],
  'user.login': [],
  'user.logout': [],
  'user.password_changed': [],
  'staff.created': ['role'],
  'staff.approved': ['status'],
  'staff.rejected': ['status'],
  'issue.created': ['ticketId', 'category', 'priority', 'hasPhoto'],
  'issue.assigned': ['fromStaffId', 'toStaffId'],
  'issue.status_changed': ['from', 'to'],
  'issue.photo_uploaded': ['publicId'],
};

const pickAllowed = (action, metadata = {}) => {
  const allowed = METADATA_ALLOWLIST[action] || [];
  const result = {};
  for (const key of allowed) {
    if (metadata[key] !== undefined) {
      result[key] = metadata[key];
    }
  }
  return result;
};

class AuditService {
  // Best-effort recording: validates the event, writes it, and
  // swallows/logs failures so business workflows are never affected.
  // Always awaited by callers (no floating promises) but never throws.
  async record(event) {
    try {
      const validated = this.validate(event);
      if (!validated) return null;

      await auditLogRepository.create(validated);
      emitToRole('admin', 'audit:new', {
        action: validated.action,
        targetType: validated.target?.type,
        targetId: validated.target?.id?.toString(),
        createdAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      // Never expose internals; audit failure must not surface to
      // the business operation that triggered it.
      console.error(
        `[${new Date().toISOString()}] Audit log write failed for action "${event?.action}": ${error.message}`
      );
      return false;
    }
  }

  // Read-only listing for the admin audit view. Returns only the
  // approved fields — actor id/role, action, target, metadata and
  // timestamp; never secrets.
  async listAuditLogs(query = {}) {
    const { page = 1, limit = 20, ...filters } = query;

    const { logs, totalItems } = await auditLogRepository.findPaginated({
      page,
      limit,
      ...filters,
    });

    return {
      logs: logs.map((log) => ({
        id: log._id,
        actor: log.actor,
        action: log.action,
        target: log.target,
        metadata: log.metadata || {},
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        pageSize: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  validate(event) {
    if (!event || typeof event !== 'object') return null;

    const { action, actor, target, metadata } = event;

    if (!SUPPORTED_ACTIONS.has(action)) return null;

    // actor: userId may be null only for anonymous registration;
    // role must be one of the known roles.
    const actorUserId = actor?.userId ?? null;
    const actorRole = actor?.role ?? 'anonymous';

    if (actorUserId !== null && !mongoose.isValidObjectId(actorUserId)) {
      return null;
    }
    if (!VALID_ROLES.has(actorRole)) return null;

    // target is required for all current event types.
    if (!target || !VALID_TARGET_TYPES.has(target.type)) return null;
    if (!mongoose.isValidObjectId(target.id)) return null;

    return {
      actor: { userId: actorUserId, role: actorRole },
      action,
      target: { type: target.type, id: target.id },
      metadata: pickAllowed(action, metadata),
    };
  }
}

export default new AuditService();
