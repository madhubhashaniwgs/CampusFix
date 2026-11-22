import bcrypt from 'bcryptjs';

import userRepository from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';
import generateToken from '../utils/generateToken.js';

class AuthService {
  async register(userData) {
    const fullName = userData.fullName.trim();
    const email = userData.email.trim().toLowerCase();

    const existingUser = await userRepository.emailExists(email);

    if (existingUser) {
      throw new ApiError(409, 'Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Public registration allows student or staff only. Staff
    // self-registrations require admin approval before they can log in.
    const role = userData.role === 'staff' ? 'staff' : 'student';

    const user = await userRepository.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      status: role === 'staff' ? 'pending' : 'active',
      studentId:
        role === 'student' && userData.studentId
          ? String(userData.studentId).trim()
          : null,
      staffId:
        role === 'staff' && userData.staffId
          ? String(userData.staffId).trim()
          : null,
      department:
        role === 'staff' && userData.department
          ? String(userData.department).trim()
          : null,
    });

    const token = generateToken(user._id, user.tokenVersion ?? 0);

    return {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
    };
  }

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is inactive');
    }

    // Staff accounts created via public registration stay blocked
    // until an admin approves them.
    if (user.role === 'staff' && user.status === 'pending') {
      throw new ApiError(
        403,
        'Your staff account is pending admin approval.'
      );
    }

    if (user.role === 'staff' && user.status === 'rejected') {
      throw new ApiError(
        403,
        'Your staff registration request was rejected.'
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = generateToken(user._id, user.tokenVersion ?? 0);

    return {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User account not found or inactive');
    }

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  }

  // Increments the user's tokenVersion, which invalidates every
  // JWT issued before this point (i.e. all sessions for the user).
  async logout(userId) {
    await userRepository.incrementTokenVersion(userId);
  }

  // Verifies the current password, stores the new hash, and bumps
  // tokenVersion so every other session is invalidated. Returns a
  // fresh token so the caller's current session stays alive.
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new ApiError(401, 'User account not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const updated = await userRepository.updatePasswordAndBumpVersion(
      userId,
      hashedPassword
    );

    return {
      user: {
        id: updated._id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
      },
      token: generateToken(updated._id, updated.tokenVersion ?? 0),
    };
  }
}

export default new AuthService();
