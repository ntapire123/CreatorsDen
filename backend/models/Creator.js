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

const socialAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['Instagram', 'YouTube', 'TikTok', 'Twitter'],
    required: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  accountId: {
    type: String,
    default: null
  },
  accessToken: {
    type: String,
    default: null,
    select: false
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
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  bio: {
    type: String
  },
  accounts: [accountSchema],
  socialAccounts: [socialAccountSchema]
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

