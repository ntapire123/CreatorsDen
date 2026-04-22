const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Creator',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['TikTok', 'Instagram', 'YouTube'],
    required: true
  },
  username: {
    type: String,
    required: true
  },
  profileUrl: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  totalViews: {
    type: Number,
    default: 0
  },
  followers: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Allow multiple accounts per platform, but prevent exact duplicates per creator.
accountSchema.index({ creatorId: 1, platform: 1, username: 1 }, { unique: true });

// Static method to find accounts by creator and platform
accountSchema.statics.findByCreatorAndPlatform = function(creatorId, platform) {
  return this.find({ creatorId, platform });
};

// Static method to get all accounts for a creator
accountSchema.statics.findByCreator = function(creatorId) {
  return this.find({ creatorId }).sort({ platform: 1 });
};

module.exports = mongoose.model('Account', accountSchema);
