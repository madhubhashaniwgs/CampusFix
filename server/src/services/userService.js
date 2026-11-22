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
    // request body is ignored.
    const user = await userRepository.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'staff',
    });

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  }
}

export default new UserService();
