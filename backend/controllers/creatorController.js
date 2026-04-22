const mongoose = require('mongoose');
const User = require('../models/User');
const Creator = require('../models/Creator');
const Account = require('../models/Account');
const Analytics = require('../models/Analytics');
const {
  fetchAccountStats,
  parseSocialUrl,
  extractYouTubeVideoId,
  fetchYouTubeVideoViewCount
} = require('../utils/apiFetcher');

const resolveCreatorScope = async (userId) => {
  const creatorDoc = await Creator.findOne({ userId }).select('_id');
  const scope = [userId];
  if (creatorDoc?._id) {
    scope.push(creatorDoc._id);
  }
  return scope;
};

const getCreatorProfile = async (req, res) => {
  try {
    const creator = await Creator.findOne({ userId: req.user.id });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: creator
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch creator profile'
    });
  }
};

const createCreatorProfile = async (req, res) => {
  try {
    const existing = await Creator.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(200).json({
        success: true,
        data: existing
      });
    }

    const user = await User.findById(req.user.id).select('email');
    const { name, bio } = req.body || {};

    const creator = await Creator.create({
      userId: req.user.id,
      name: (name || user?.email?.split('@')?.[0] || 'Creator').trim(),
      bio: bio || '',
      email: user?.email || undefined
    });

    return res.status(201).json({
      success: true,
      data: creator
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create creator profile'
    });
  }
};

const getCreatorAccounts = async (req, res) => {
  try {
    const creatorScope = await resolveCreatorScope(req.user.id);
    // Get all accounts for the authenticated creator
    const accounts = await Account.find({ creatorId: { $in: creatorScope } })
      .sort({ createdAt: -1 });

    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    const refreshedAccounts = await Promise.all(
      accounts.map(async (account) => {
        // Only refresh YouTube records on demand.
        if (account.platform !== 'YouTube') {
          return account;
        }

        const lastUpdated = account.updatedAt || account.lastUpdated || account.createdAt;
        const isStale = !lastUpdated || (now - new Date(lastUpdated).getTime()) > oneHourMs;

        if (!isStale) {
          return account;
        }

        try {
          const videoId = extractYouTubeVideoId(account.profileUrl);
          let latestViews = account.totalViews;

          if (videoId) {
            // Requested strategy: refresh via YouTube Data API videos statistics endpoint.
            latestViews = await fetchYouTubeVideoViewCount(videoId);
          } else {
            // Fallback for channel/profile URLs already used in this project.
            const latestStats = await fetchAccountStats('YouTube', account.username);
            latestViews = latestStats.views || 0;
            account.followers = latestStats.followers || account.followers;
            account.profileImage = latestStats.avatar || account.profileImage;
          }

          account.totalViews = latestViews || 0;
          account.lastUpdated = new Date();
          await account.save();
        } catch (refreshError) {
          console.error('Failed to refresh YouTube account stats:', {
            accountId: account._id,
            profileUrl: account.profileUrl,
            message: refreshError.message,
            data: refreshError.response?.data
          });
        }

        const [todaySnapshot, latestSnapshot, growth24h] = await Promise.all([
          Analytics.getTodaySnapshot(account._id),
          Analytics.findOne({ accountId: account._id }).sort({ date: -1 }).lean(),
          Analytics.get24HourGrowth(account._id)
        ]);

        const effectiveSnapshot = todaySnapshot || latestSnapshot;

        return {
          ...account.toObject(),
          todayStats: effectiveSnapshot
            ? {
                followers: effectiveSnapshot.followers || 0,
                totalViews: effectiveSnapshot.totalViews || 0,
                totalLikes: effectiveSnapshot.totalLikes || 0,
                growth24h,
              }
            : {
                followers: account.followers || 0,
                totalViews: account.totalViews || 0,
                totalLikes: account.totalLikes || 0,
                growth24h: 0,
              },
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: refreshedAccounts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const addAccount = async (req, res) => {
  try {
    const { profileUrl } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ID format' 
      });
    }

    // Verify creator exists
    const creator = await Creator.findById(req.params.id);
    if (!creator) {
      return res.status(404).json({ 
        success: false, 
        message: 'Creator not found' 
      });
    }

    // URL validation
    if (!profileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Profile URL is required'
      });
    }

    // Check if profileUrl is a valid string
    if (typeof profileUrl !== 'string' || profileUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Profile URL must be a valid string'
      });
    }

    // Basic URL format validation
    const urlRegex = /^https?:\/\/(www\.)?(youtube\.com|tiktok\.com|instagram\.com|youtu\.be)\/.+/i;
    if (!urlRegex.test(profileUrl.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format. Please provide a valid YouTube, TikTok, or Instagram URL'
      });
    }

    // Parse URL to extract platform and username
    let platform, username;
    try {
      const parsed = parseSocialUrl(profileUrl);
      platform = parsed.platform;
      username = parsed.username;
      
      // Normalize platform to handle case sensitivity
      const platformKey = platform.toLowerCase();
      const normalizedPlatforms = {
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'instagram': 'Instagram'
      };
      
      platform = normalizedPlatforms[platformKey] || platform;
      
    } catch (error) {
      console.error('URL parsing error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Use parsed username/handle as provider account identifier in socialAccounts.
    const providerAccountId = username;
    const creatorSocialAccounts = Array.isArray(creator.socialAccounts) ? creator.socialAccounts : [];
    const duplicateSocialAccount = creatorSocialAccounts.some((account) => {
      return account.platform === platform && String(account.accountId) === String(providerAccountId);
    });

    if (duplicateSocialAccount) {
      return res.status(400).json({
        success: false,
        message: `This ${platform} account is already connected for this creator`
      });
    }

    // Verify account exists and get initial stats
    let stats;
    try {
      stats = await fetchAccountStats(platform, username);
    } catch (error) {
      if (error?.response?.status === 429 || String(error.message || '').toLowerCase().includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please wait a moment before trying again.'
        });
      }
      return res.status(404).json({
        success: false,
        message: `Failed to fetch ${platform} stats: ${error.message}`,
        details: error.response?.data || null
      });
    }

    const targetCreatorId = req.params.id; // Use ID from URL params

    // Create new account
    const account = new Account({
      creatorId: targetCreatorId, // Use ID from URL params
      platform,
      username,
      profileUrl,
      profileImage: stats.avatar,
      totalViews: stats.views || 0,
      followers: stats.followers || 0,
      totalLikes: stats.likes || 0,
      lastUpdated: new Date()
    });

    await account.save();

    // Also add account to Creator embedded arrays and save explicitly.
    creator.accounts.push({
      platform: platform,
      accountId: account._id.toString(),
      accountName: username,
      connectedAt: new Date(),
      totalViews: stats.views || 0,
      followers: stats.followers || 0,
      totalLikes: stats.likes || 0
    });
    creator.socialAccounts.push({
      platform: platform,
      accountName: username,
      accountId: providerAccountId,
      accessToken: null
    });
    await creator.save();

    // Create first analytics snapshot (intraday point)
    try {
      await Analytics.createSnapshot(
        account._id,
        stats.followers || 0,
        stats.views || stats.totalViews || 0,
        stats.likes || stats.totalLikes || 0
      );
    } catch (analyticsError) {
      console.error('Failed to create initial analytics snapshot:', analyticsError);
    }

    res.status(201).json({
      success: true,
      message: `${platform} account added successfully`,
      data: {
        account,
        currentStats: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add account'
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { accountId } = req.params;

    // Find the account to delete
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if user owns the account or is an admin
    if (req.user.role !== 'admin' && account.creatorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own accounts.'
      });
    }

    // Delete the account and its analytics simultaneously
    await Promise.all([
      Account.findByIdAndDelete(accountId),
      Analytics.deleteMany({ accountId: accountId })
    ]);

    res.status(200).json({
      success: true,
      message: 'Account and its analytics deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};

const deleteCreator = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the Creator document first
    const creator = await Creator.findById(id);
    
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    // Get all accounts for this creator from both models
    const accounts = await Account.find({ creatorId: id });
    const accountIds = accounts.map(acc => acc._id);
    
    const deletionPromises = [
      // Delete the Creator document
      Creator.findByIdAndDelete(id),
      
      // Delete all accounts
      Account.deleteMany({ creatorId: id }),
      
      // Delete all analytics snapshots
      Analytics.deleteMany({ accountId: { $in: accountIds } })
    ];

    // If Creator has a userId, try to delete the User too
    if (creator.userId) {
      deletionPromises.push(
        User.findByIdAndDelete(creator.userId).catch(() => null)
      );
    }

    await Promise.all(deletionPromises);

    res.status(200).json({
      success: true,
      message: 'Creator deleted'
    });
  } catch (error) {
    console.error('Delete Creator Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete creator',
      error: error.message
    });
  }
};

const getMetricsAggregated = async (req, res) => {
  try {
    const creatorScope = await resolveCreatorScope(req.user.id);
    // Get all accounts for the creator
    const accounts = await Account.find({ creatorId: { $in: creatorScope } });
    const accountIds = accounts.map(acc => acc._id);

    // Get analytics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await Analytics.find({
      accountId: { $in: accountIds },
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    // Aggregate data by date
    const aggregatedData = {};
    analytics.forEach(record => {
      const dateStr = record.date.toISOString().split('T')[0];
      if (!aggregatedData[dateStr]) {
        aggregatedData[dateStr] = {
          date: dateStr,
          totalFollowers: 0,
          totalViews: 0,
          platforms: {}
        };
      }

      aggregatedData[dateStr].totalFollowers += record.followers;
      aggregatedData[dateStr].totalViews += record.totalViews;

      // Get platform info
      const account = accounts.find(acc => acc._id.toString() === record.accountId.toString());
      if (account) {
        if (!aggregatedData[dateStr].platforms[account.platform]) {
          aggregatedData[dateStr].platforms[account.platform] = {
            followers: 0,
            views: 0
          };
        }
        aggregatedData[dateStr].platforms[account.platform].followers += record.followers;
        aggregatedData[dateStr].platforms[account.platform].views += record.totalViews;
      }
    });

    res.status(200).json({
      success: true,
      data: Object.values(aggregatedData)
    });
  } catch (error) {
    console.error('Error getting aggregated metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get aggregated metrics'
    });
  }
};

const getPlatformStats = async (req, res) => {
  try {
    const creatorScope = await resolveCreatorScope(req.user.id);
    // Get all accounts for the creator
    const accounts = await Account.find({ creatorId: { $in: creatorScope } });
    const accountIds = accounts.map(acc => acc._id);

    // Get the latest analytics for each account
    const latestAnalytics = await Promise.all(
      accountIds.map(async (accountId) => {
        const latest = await Analytics.findOne({ accountId })
          .sort({ date: -1 })
          .limit(1);
        return latest;
      })
    );

    // Aggregate by platform
    const platformStats = {};
    accounts.forEach((account, index) => {
      const latest = latestAnalytics[index];
      if (!platformStats[account.platform]) {
        platformStats[account.platform] = {
          platform: account.platform,
          totalFollowers: 0,
          totalViews: 0,
          accountCount: 0
        };
      }

      if (latest) {
        platformStats[account.platform].totalFollowers += latest.followers;
        platformStats[account.platform].totalViews += latest.totalViews;
      }
      platformStats[account.platform].accountCount += 1;
    });

    res.status(200).json({
      success: true,
      data: Object.values(platformStats).sort((a, b) => b.totalViews - a.totalViews)
    });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform stats'
    });
  }
};

module.exports = {
  getCreatorProfile,
  createCreatorProfile,
  getCreatorAccounts,
  addAccount,
  deleteAccount,
  deleteCreator,
  getMetricsAggregated,
  getPlatformStats
};
