const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['YouTube', 'Instagram', 'TikTok'],
    required: true
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    followers: {
      type: Number,
      default: 0
    },
    engagement: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
    expires: 365 * 24 * 60 * 60
  }
}, {
  timestamps: true
});

analyticsSchema.index({ creatorId: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
