const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['YouTube', 'Instagram', 'TikTok'],
    required: true
  },
  accountId: {
    type: String,
    required: true
  },
  accountName: {
    type: String
  },
  connectedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const creatorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  bio: {
    type: String
  },
  accounts: [accountSchema]
}, {
  timestamps: true
});

// Index on userId
creatorSchema.index({ userId: 1 });

// Compound index for uniqueness at query level
creatorSchema.index(
  { userId: 1, 'accounts.accountId': 1, 'accounts.platform': 1 },
  { unique: true }
);

module.exports = mongoose.model('Creator', creatorSchema);

