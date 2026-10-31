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
}

export default new UserRepository();