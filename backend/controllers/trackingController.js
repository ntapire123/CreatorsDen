const Account = require('../models/Account');
const Analytics = require('../models/Analytics');
const Creator = require('../models/Creator');
const { fetchAccountStats, parseSocialUrl } = require('../utils/apiFetcher');

const resolveCreatorScope = async (userId) => {
  const creatorDoc = await Creator.findOne({ userId }).select('_id');
  const scope = [userId];
  if (creatorDoc?._id) {
    scope.push(creatorDoc._id);
  }
  return scope;
};

/**
 * Add a new account for tracking
 * POST /api/tracking/add
 */
async function addAccount(req, res) {
  try {
    const { profileUrl, creatorId } = req.body;
    
    if (!profileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Profile URL is required'
      });
    }

    const targetCreatorId = creatorId || req.user.id;

    // Parse URL to extract platform and username
    let platform, username;
    try {
      const parsed = parseSocialUrl(profileUrl);
      platform = parsed.platform;
      username = parsed.username;
      
      // Normalize platform to handle case sensitivity
      const platformKey = platform.toLowerCase();
      
      // Ensure we always use the capitalized version for consistency
      const normalizedPlatforms = {
        'youtube': 'YouTube',
        'tiktok': 'TikTok',
        'instagram': 'Instagram'
      };
      
      platform = normalizedPlatforms[platformKey] || platform;
      
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
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
        message: `Failed to fetch ${platform} stats: ${error.message}`
      });
    }

    // Check if account already exists for this creator
    const creatorDoc = await Creator.findById(targetCreatorId);
    if (!creatorDoc) {
      return res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
    }

    const providerAccountId = username;
    const socialAccounts = Array.isArray(creatorDoc.socialAccounts) ? creatorDoc.socialAccounts : [];
    const duplicateSocialAccount = socialAccounts.some((account) => {
      return account.platform === platform && String(account.accountId) === String(providerAccountId);
    });

    if (duplicateSocialAccount) {
      return res.status(400).json({
        success: false,
        message: `This ${platform} account is already connected for this creator`
      });
    }

    // Create new account
    const account = new Account({
      creatorId: targetCreatorId,
      platform,
      username,
      profileUrl,
      profileImage: stats.avatar
    });

    await account.save();

    creatorDoc.socialAccounts.push({
      platform,
      accountName: username,
      accountId: providerAccountId,
      accessToken: null
    });
    await creatorDoc.save();

    const analyticsResult = await Analytics.createSnapshot(
      account._id,
      stats.followers,
      stats.views,
      stats.likes || 0
    );

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
}

/**
 * Get account history for the last 30 days
 * GET /api/tracking/history/:accountId
 */
async function getAccountHistory(req, res) {
  try {
    const { accountId } = req.params;
    const creatorScope = await resolveCreatorScope(req.user.id);

    // Verify account belongs to the authenticated creator
    const account = await Account.findOne({
      _id: accountId,
      creatorId: { $in: creatorScope }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Get analytics for the last 30 days
    const history = await Analytics.getLast30Days(accountId);

    res.json({
      success: true,
      data: {
        account,
        history: history.map(item => ({
          date: item.date,
          followers: item.followers,
          totalViews: item.totalViews
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching account history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account history'
    });
  }
}

/**
 * Get all accounts for the authenticated creator
 * GET /api/tracking/accounts
 */
async function getAccounts(req, res) {
  try {
    const creatorScope = await resolveCreatorScope(req.user.id);
    const accounts = await Account.find({ creatorId: { $in: creatorScope } })
      .sort({ createdAt: -1 });

    // Get today's stats for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const [todayStats, latestStats, growth24h] = await Promise.all([
          Analytics.getTodaySnapshot(account._id),
          Analytics.findOne({ accountId: account._id }).sort({ date: -1 }).lean(),
          Analytics.get24HourGrowth(account._id),
        ]);
        const effectiveStats = todayStats || latestStats;

        return {
          ...account.toObject(),
          todayStats: effectiveStats ? {
            followers: effectiveStats.followers,
            totalViews: effectiveStats.totalViews,
            totalLikes: effectiveStats.totalLikes || 0,
            growth24h
          } : {
            followers: account.followers || 0,
            totalViews: account.totalViews || 0,
            totalLikes: account.totalLikes || 0,
            growth24h: 0
          }
        };
      })
    );

    res.json({
      success: true,
      data: accountsWithStats
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts'
    });
  }
}

/**
 * Delete an account
 * DELETE /api/tracking/accounts/:accountId
 */
async function deleteAccount(req, res) {
  try {
    const { accountId } = req.params;
    const creatorScope = await resolveCreatorScope(req.user.id);

    // Verify account belongs to the authenticated creator
    const account = await Account.findOne({
      _id: accountId,
      creatorId: { $in: creatorScope }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Delete account and all associated analytics
    await Promise.all([
      Account.findByIdAndDelete(accountId),
      Analytics.deleteMany({ accountId })
    ]);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
}

module.exports = {
  addAccount,
  getAccountHistory,
  getAccounts,
  deleteAccount
};
