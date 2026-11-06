import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    },

    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: [
        'electrical',
        'plumbing',
        'it',
        'furniture',
        'other',
      ],
      required: true,
    },

    location: {
      type: String,
      required: [true, 'Issue location is required'],
      trim: true,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: [
        'reported',
        'assigned',
        'in_progress',
        'resolved',
        'rejected',
      ],
      default: 'reported',
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'reported',
            'assigned',
            'in_progress',
            'resolved',
            'rejected',
          ],
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: {
          type: String,
          trim: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;