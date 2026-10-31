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

    const user = await userRepository.create({
      fullName,
      email,
      password: hashedPassword,
      // Never accept role from public registration.
      role: 'student',
    });

    const token = generateToken(user._id);

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

  async login(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = generateToken(user._id);

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
}

export default new AuthService();