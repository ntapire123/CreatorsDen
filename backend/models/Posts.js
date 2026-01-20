const mongoose = require('mongoose');

const postsSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  postId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['YouTube', 'Instagram', 'TikTok'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  // YouTube metrics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  subscribers: {
    type: Number,
    default: 0
  },
  // Instagram metrics
  impressions: {
    type: Number,
    default: 0
  },
  reach: {
    type: Number,
    default: 0
  },
  // TikTok metrics
  view_count: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for accountId + postId uniqueness
postsSchema.index({ accountId: 1, postId: 1 }, { unique: true });

// Index for date-based queries
postsSchema.index({ publishedAt: -1 });

// Index for platform-based queries
postsSchema.index({ platform: 1 });

module.exports = mongoose.model('Posts', postsSchema);
