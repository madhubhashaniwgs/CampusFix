import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import userRepository from '../repositories/userRepository.js';
import auditService from './auditService.js';
import emailService from './emailService.js';
import notificationService from './notificationService.js';
import { emitToRole, emitToUser } from '../socket/socketServer.js';
import ApiError from '../utils/ApiError.js';

class UserService {
  async createStaff(userData, actor = null) {
    const fullName = userData.fullName.trim();
    const email = userData.email.trim().toLowerCase();

    const existingUser = await userRepository.emailExists(email);

    if (existingUser) {
      throw new ApiError(409, 'Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Role is always forced to 'staff'; any role sent in the
    // request body is ignored. Admin-created accounts are active
    // immediately (no approval needed).
    const user = await userRepository.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'staff',
      status: 'active',
      staffId:
        userData.staffId && String(userData.staffId).trim()
          ? String(userData.staffId).trim()
          : null,
      department:
        userData.department && String(userData.department).trim()
          ? String(userData.department).trim()
          : null,
    });

    await auditService.record({
      action: 'staff.created',
      actor: actor
        ? { userId: actor.id ?? actor._id, role: actor.role }
        : { userId: null, role: 'anonymous' },
      target: { type: 'user', id: user._id },
      metadata: { role: 'staff' },
    });

    emitToRole('admin', 'staff:created', { userId: user._id.toString() });
    emitToRole('staff', 'dashboard:stats_updated', { reason: 'staff_created' });

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  async listUsers({ role, status, page = 1, limit = 10 } = {}) {
    const { users, totalItems } = await userRepository.findUsers({
      role,
      status,
      page,
      limit,
    });

    return {
      users: users.map((u) => ({
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        // Pre-migration users have no status field; treat as active.
        status: u.status || 'active',
        studentId: u.studentId || null,
        staffId: u.staffId || null,
        department: u.department || null,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        pageSize: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async approveStaff(userId, actor = null) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, 'Invalid staff member ID');
    }

    const user = await userRepository.findStaffById(userId);

    if (!user) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (user.role !== 'staff') {
      throw new ApiError(400, 'User is not a staff member');
    }

    // A rejected registration must not be silently reactivated;
    // approving an already-active account is a safe no-op.
    if (user.status === 'rejected') {
      throw new ApiError(400, 'Cannot approve a rejected staff account');
    }

    if (user.status === 'active') {
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    }

    const updated = await userRepository.setUserStatus(userId, 'active');

    await auditService.record({
      action: 'staff.approved',
      actor: actor
        ? { userId: actor.id ?? actor._id, role: actor.role }
        : { userId: null, role: 'anonymous' },
      target: { type: 'user', id: userId },
      metadata: { status: 'active' },
    });

    emitToRole('admin', 'staff:approved', { userId: updated._id.toString() });
    emitToRole('staff', 'dashboard:stats_updated', { reason: 'staff_approved' });
    await notificationService.create({
      userId: updated._id,
      type: 'staff_approved',
      title: 'Staff account approved',
      message: 'Your staff account has been approved. You can now log in.',
    });

    if (updated.email) {
      const tpl = emailService.staffApproved({
        name: updated.fullName,
        loginUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
      });
      await emailService.send({ to: updated.email, ...tpl });
    }

    return {
      id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }

  async rejectStaff(userId, actor = null) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(400, 'Invalid staff member ID');
    }

    const user = await userRepository.findStaffById(userId);

    if (!user) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (user.role !== 'staff') {
      throw new ApiError(400, 'User is not a staff member');
    }

    // Rejecting an already-rejected account is a safe no-op;
    // rejecting an active staff account revokes their access.
    if (user.status === 'rejected') {
      return {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    }

    const updated = await userRepository.setUserStatus(userId, 'rejected');

    await auditService.record({
      action: 'staff.rejected',
      actor: actor
        ? { userId: actor.id ?? actor._id, role: actor.role }
        : { userId: null, role: 'anonymous' },
      target: { type: 'user', id: userId },
      metadata: { status: 'rejected' },
    });

    emitToRole('admin', 'staff:rejected', { userId: updated._id.toString() });
    await notificationService.create({
      userId: updated._id,
      type: 'staff_rejected',
      title: 'Staff registration update',
      message: 'Your staff registration was not approved.',
    });

    if (updated.email) {
      const tpl = emailService.staffRejected({ name: updated.fullName });
      await emailService.send({ to: updated.email, ...tpl });
    }

    return {
      id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }
}

export default new UserService();
