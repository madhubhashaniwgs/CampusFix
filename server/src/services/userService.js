import bcrypt from 'bcryptjs';

import userRepository from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';

class UserService {
  async createStaff(userData) {
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

  async approveStaff(userId) {
    const user = await userRepository.findStaffById(userId);

    if (!user) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (user.role !== 'staff') {
      throw new ApiError(400, 'User is not a staff member');
    }

    const updated = await userRepository.setUserStatus(userId, 'active');

    return {
      id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }

  async rejectStaff(userId) {
    const user = await userRepository.findStaffById(userId);

    if (!user) {
      throw new ApiError(404, 'Staff member not found');
    }

    if (user.role !== 'staff') {
      throw new ApiError(400, 'User is not a staff member');
    }

    const updated = await userRepository.setUserStatus(
      userId,
      'rejected'
    );

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
