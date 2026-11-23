import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'issue_created',
        'issue_assigned',
        'issue_status_changed',
        'staff_approved',
        'staff_rejected',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
