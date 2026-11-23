import mongoose from 'mongoose';

// Immutable audit trail entries. No update/delete paths exist;
// records are append-only and contain no secrets, passwords,
// tokens, request bodies or unnecessary personal data.
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      role: {
        type: String,
        enum: ['student', 'staff', 'admin', 'anonymous'],
        default: 'anonymous',
      },
    },

    action: {
      type: String,
      required: true,
    },

    target: {
      type: {
        type: String,
        enum: ['issue', 'user'],
        required: true,
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
    },

    // Safe, event-specific fields only — populated through the
    // audit service allowlist, never raw request data.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.userId': 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1 });

export default mongoose.model('AuditLog', auditLogSchema);
