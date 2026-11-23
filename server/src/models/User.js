import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: ['student', 'staff', 'admin'],
      default: 'student',
    },

    // Account lifecycle. Students are active immediately; staff who
    // self-register start as 'pending' until an admin approves them.
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected'],
      default: 'active',
    },

    studentId: {
      type: String,
      trim: true,
      default: null,
    },

    staffId: {
      type: String,
      trim: true,
      default: null,
    },

    department: {
      type: String,
      trim: true,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Incremented on logout to invalidate all previously issued JWTs.
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
