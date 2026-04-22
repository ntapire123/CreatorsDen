const Creator = require('../models/Creator');
const Account = require('../models/Account');
const Analytics = require('../models/Analytics');

// @desc    Get all creators
// @route   GET /api/admin/all-creators
// @access  Private (Admin)
exports.getAllCreators = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const creators = await Creator.find().populate('userId', 'email role');
    res.json({ success: true, data: creators });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get top performing creators
// @route   GET /api/admin/top-performers
// @access  Private (Admin)
exports.getTopPerformers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const topPerformers = await Analytics.aggregate([
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      {
        $group: {
          _id: '$account.creatorId',
          totalViews: { $sum: '$totalViews' },
          totalFollowers: { $avg: '$followers' },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'creators',
          localField: '_id',
          foreignField: '_id',
          as: 'creator',
        },
      },
      { $unwind: '$creator' },
      {
        $lookup: {
          from: 'users',
          localField: 'creator.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          creatorId: '$_id',
          name: '$creator.name',
          email: '$user.email',
          totalViews: 1,
          totalLikes: { $literal: 0 },
          totalFollowers: 1,
        },
      },
    ]);
    res.json({ success: true, data: topPerformers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get specific creator's detailed metrics
// @route   GET /api/admin/creator/:creatorId
// @access  Private (Admin)
exports.getCreatorDetails = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const { creatorId } = req.params;
    
    const creator = await Creator.findById(creatorId)
      .populate('userId', 'email role')
      .populate('accounts')
      .lean();
    
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    // Self-healing: ensure embedded creator.accounts includes all Account records.
    try {
      const allAccounts = await Account.find({ creatorId: creatorId });
      const creatorAccountIds = creator.accounts.map(acc => acc.accountId);
      const missingAccounts = allAccounts.filter(account => 
        !creatorAccountIds.includes(account._id.toString())
      );

      if (missingAccounts.length > 0) {
        const missingEmbeds = missingAccounts.map((account) => ({
          platform: account.platform,
          accountId: account._id.toString(),
          accountName: account.username,
          connectedAt: account.createdAt || new Date()
        }));

        await Creator.findByIdAndUpdate(
          creatorId,
          { $push: { accounts: { $each: missingEmbeds } } },
          { new: false }
        );

        for (const account of missingAccounts) {
          creator.accounts.push({
            platform: account.platform,
            accountId: account._id.toString(),
            accountName: account.username,
            connectedAt: account.createdAt || new Date()
          });
        }
      }
    } catch (error) {
      console.error('Self-healing error:', error);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allAccounts = await Account.find({ creatorId }).lean();
    const accountIds = allAccounts.map((acc) => acc._id);
    const accountMap = new Map(allAccounts.map((acc) => [String(acc._id), acc]));

    const creatorAnalytics = await Analytics.find({
      accountId: { $in: accountIds },
      date: { $gte: thirtyDaysAgo }
    }).lean();

    const groupedMetrics = new Map();
    const platformRollup = new Map();

    creatorAnalytics.forEach((row) => {
      const account = accountMap.get(String(row.accountId));
      if (!account) return;

      const platform = account.platform || 'Unknown';
      const dateKey = new Date(row.date).toISOString().slice(0, 10);
      const metricKey = `${dateKey}|${String(row.accountId)}|${platform}`;

      if (!groupedMetrics.has(metricKey)) {
        groupedMetrics.set(metricKey, {
          _id: {
            date: dateKey,
            accountId: String(row.accountId),
            platform,
          },
          totalViews: 0,
          avgFollowers: 0,
          avgEngagement: 0,
          _followersCount: 0,
        });
      }

      const metric = groupedMetrics.get(metricKey);
      metric.totalViews += row.totalViews || 0;
      metric.avgFollowers += row.followers || 0;
      metric._followersCount += 1;

      if (!platformRollup.has(platform)) {
        platformRollup.set(platform, {
          _id: platform,
          totalViews: 0,
          maxFollowers: 0,
          avgEngagement: 0,
        });
      }

      const platformItem = platformRollup.get(platform);
      platformItem.totalViews += row.totalViews || 0;
      platformItem.maxFollowers = Math.max(platformItem.maxFollowers, row.followers || 0);
    });

    const metricsAggregated = Array.from(groupedMetrics.values())
      .map((item) => ({
        _id: item._id,
        totalViews: item.totalViews,
        avgFollowers: item._followersCount > 0 ? item.avgFollowers / item._followersCount : 0,
        avgEngagement: item.avgEngagement,
      }))
      .sort((a, b) => (a._id.date < b._id.date ? 1 : -1));

    const platformStats = Array.from(platformRollup.values()).sort((a, b) => b.totalViews - a.totalViews);

    let accountsWithAnalytics;
    try {
      if (!creator.accounts || creator.accounts.length === 0) {
        accountsWithAnalytics = [];
      } else {
        accountsWithAnalytics = await Promise.all(
          creator.accounts.map(async (account) => {
            try {
              const [latestAnalytics, liveAccount] = await Promise.all([
                Analytics.findOne({ accountId: account.accountId })
                  .sort({ date: -1 })
                  .limit(1)
                  .maxTimeMS(5000)
                  .lean(),
                Account.findById(account.accountId).lean()
              ]);
              
              if (!latestAnalytics) {
                const initialAnalytics = new Analytics({
                  accountId: account.accountId,
                  followers: 0,
                  totalViews: 0,
                  date: new Date()
                });
                
                try {
                  await initialAnalytics.save();
                } catch (error) {
                  console.error(`Failed to create initial analytics for account ${account.accountId}:`, error);
                }
              }
              
              const stats = latestAnalytics || {
                followers: 0,
                totalViews: 0,
                date: new Date()
              };
              const mergedFollowers = Math.max(stats.followers || 0, liveAccount?.followers || 0);
              const mergedViews = Math.max(stats.totalViews || 0, liveAccount?.totalViews || 0);
              const mergedDate = liveAccount?.updatedAt || liveAccount?.lastUpdated || stats.date;

              return {
                ...account,
                totalViews: mergedViews,
                followers: mergedFollowers,
                lastUpdated: mergedDate,
                latestStats: {
                  followers: mergedFollowers,
                  totalViews: mergedViews,
                  date: mergedDate
                }
              };
            } catch (error) {
              console.error(`Error fetching analytics for account ${account.accountId}:`, error.message);
              return {
                ...account,
                totalViews: 0,
                followers: 0,
                lastUpdated: new Date(),
                latestStats: { followers: 0, totalViews: 0, date: null }
              };
            }
          })
        );
      }
    } catch (error) {
      console.error("Error in analytics fetching:", error.message);
      accountsWithAnalytics = creator.accounts || [];
    }

    // Update creator object with accounts that have analytics
    creator.accounts = accountsWithAnalytics;

    res.status(200).json({
      success: true,
      data: {
        creator,
        metricsAggregated,
        platformStats
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
