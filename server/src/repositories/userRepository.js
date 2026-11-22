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
      // Treat missing status (pre-migration docs) as active.
      $or: [{ status: 'active' }, { status: { $exists: false } }],
    }).select('fullName email');
  }

  // Admin user management: filterable user listing.
  async findUsers({ role, status } = {}) {
    const filter = {};

    if (role) filter.role = role;
    if (status === 'active') {
      // Pre-migration users have no status field; count them active.
      filter.$or = [{ status: 'active' }, { status: { $exists: false } }];
    } else if (status) {
      filter.status = status;
    }

    return User.find(filter)
      .select(
        'fullName email role status studentId staffId department isActive createdAt'
      )
      .sort({ createdAt: -1 });
  }

  async findStaffById(userId) {
    return User.findById(userId).select(
      'fullName email role status staffId department'
    );
  }

  async setUserStatus(userId, status) {
    return User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('fullName email role status staffId department');
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