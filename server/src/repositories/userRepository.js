import User from '../models/User.js';

class UserRepository {
  async create(userData) {
    return User.create(userData);
  }

  async findByEmail(email) {
    return User.findOne({ email }).select('+password');
  }

  async findById(userId) {
    return User.findById(userId);
  }

  async findByIdWithPassword(userId) {
    return User.findById(userId).select('+password');
  }

  async emailExists(email) {
    return User.exists({ email });
  }

  async findActiveStaffById(userId) {
    return User.findOne({
      _id: userId,
      role: 'staff',
      isActive: true,
    }).select('fullName email');
  }

  async incrementTokenVersion(userId) {
    return User.findByIdAndUpdate(
      userId,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );
  }

  // Updates the password and bumps tokenVersion in one write so all
  // previously issued sessions are invalidated.
  async updatePasswordAndBumpVersion(userId, hashedPassword) {
    return User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );
  }
}

export default new UserRepository();