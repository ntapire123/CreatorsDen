const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  followers: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Additional indexes for performance
analyticsSchema.index({ accountId: 1, date: -1 });

// Static method to get analytics for last 30 days
analyticsSchema.statics.getLast30Days = function(accountId) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.find({
    accountId,
    date: { $gte: thirtyDaysAgo }
  }).sort({ date: 1 });
};

// Static method to get today's snapshot
analyticsSchema.statics.getTodaySnapshot = function(accountId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.findOne({
    accountId,
    date: { $gte: today, $lt: tomorrow }
  }).sort({ date: -1 });
};

// Static method to create or update daily snapshot
analyticsSchema.statics.upsertDailySnapshot = function(accountId, followers, totalViews, totalLikes = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.findOneAndUpdate(
    {
      accountId,
      date: { $gte: today, $lt: tomorrow }
    },
    {
      accountId,
      date: today,
      followers,
      totalViews,
      totalLikes
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

// Static method to append an intraday snapshot point
analyticsSchema.statics.createSnapshot = function(accountId, followers, totalViews, totalLikes = 0) {
  return this.create({
    accountId,
    date: new Date(),
    followers: Number(followers || 0),
    totalViews: Number(totalViews || 0),
    totalLikes: Number(totalLikes || 0)
  });
};

// Static method to calculate account growth in the last 24 hours
analyticsSchema.statics.get24HourGrowth = async function(accountId) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const latest = await this.findOne({ accountId }).sort({ date: -1 }).lean();
  if (!latest) {
    return 0;
  }

  // Baseline: latest snapshot at or before cutoff; fallback to earliest snapshot.
  const baseline =
    await this.findOne({ accountId, date: { $lte: cutoff } }).sort({ date: -1 }).lean() ||
    await this.findOne({ accountId }).sort({ date: 1 }).lean();

  const latestViews = Number(latest.totalViews || 0);
  const baselineViews = Number(baseline?.totalViews || 0);
  return Math.max(0, latestViews - baselineViews);
};

module.exports = mongoose.model('Analytics', analyticsSchema);
