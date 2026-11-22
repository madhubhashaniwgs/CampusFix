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
      enum: ['electrical', 'plumbing', 'it', 'furniture', 'other'],
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

    // Optional photo attached to the report, stored as a
    // compressed JPEG data URL (validated to a bounded size).
    photo: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ['reported', 'assigned', 'in_progress', 'resolved', 'rejected'],
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
          enum: ['reported', 'assigned', 'in_progress', 'resolved', 'rejected'],
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

// Indexes matching the actual query patterns in issueRepository.findAll:
// students filter by reportedBy, staff by assignedTo, and all listings
// sort by createdAt descending. Detail lookups use the default _id index.
issueSchema.index({ reportedBy: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, createdAt: -1 });
issueSchema.index({ createdAt: -1 });

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
