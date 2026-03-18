const Creator = require('../models/Creator');
const Analytics = require('../models/Analytics');

const getCreatorAccounts = async (req, res) => {
  try {
    // Ensure only creators can access this endpoint
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creators only'
      });
    }

    // Find the Creator profile by userId
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    // Return creator accounts data
    return res.status(200).json({
      success: true,
      data: {
        id: creator._id,
        name: creator.name,
        bio: creator.bio,
        accounts: creator.accounts
      }
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
    // Ensure only creators can access this endpoint
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creators only'
      });
    }

    const { platform, accountId, accountName } = req.body;

    // Validate required fields
    if (!platform || !accountId || !accountName) {
      return res.status(400).json({
        success: false,
        message: 'Platform, accountId, and accountName are required'
      });
    }

    // Find creator profile by userId
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    // Check for duplicate account for this creator
    const existingAccount = creator.accounts.find(
      account => account.platform === platform && account.accountId === accountId
    );

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: `Account with platform ${platform} and accountId ${accountId} already exists`
      });
    }

    // Add new account to creator's accounts array
    const newAccount = {
      platform,
      accountId,
      accountName,
      connectedAt: new Date()
    };

    creator.accounts.push(newAccount);
    await creator.save();

    return res.status(201).json({
      success: true,
      data: creator
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getMetricsAggregated = async (req, res) => {
  try {
    // Ensure only creators can access this endpoint
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creators only'
      });
    }

    // Extract filter parameters
    const { platform, accountId } = req.query;

    // Find creator profile for the current user
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    // Compute date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build match stage with filters
    const matchStage = {
      creatorId: creator._id,
      timestamp: { $gte: thirtyDaysAgo }
    };

    // Add platform filter if specified and not "All"
    if (platform && platform !== 'All') {
      matchStage.platform = platform;
    }

    // Add account filter if specified and not "All"
    if (accountId && accountId !== 'All') {
      matchStage.accountId = accountId;
    }

    // Aggregation pipeline
    const results = await Analytics.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            platform: "$platform"
          },
          totalViews: { $sum: "$metrics.views" },
          avgFollowers: { $avg: "$metrics.followers" },
          avgEngagement: { $avg: "$metrics.engagement" }
        }
      },
      {
        $sort: { "_id.date": -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getPlatformStats = async (req, res) => {
  try {
    // Ensure only creators can access this endpoint
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creators only'
      });
    }

    // Extract filter parameters
    const { platform, accountId } = req.query;

    // Find creator profile
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    // Compute date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build match stage with filters
    const matchStage = {
      creatorId: creator._id,
      timestamp: { $gte: thirtyDaysAgo }
    };

    // Add platform filter if specified and not "All"
    if (platform && platform !== 'All') {
      matchStage.platform = platform;
    }

    // Add account filter if specified and not "All"
    if (accountId && accountId !== 'All') {
      matchStage.accountId = accountId;
    }

    // Aggregation pipeline
    const results = await Analytics.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: "$platform",
          totalViews: { $sum: "$metrics.views" },
          maxFollowers: { $max: "$metrics.followers" },
          avgEngagement: { $avg: "$metrics.engagement" }
        }
      },
      {
        $sort: { totalViews: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    // Ensure only creators can access this endpoint
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Creators only'
      });
    }

    const { accountId } = req.params;

    // Find creator profile by userId
    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    // Find the account to remove
    const accountIndex = creator.accounts.findIndex(
      account => account._id.toString() === accountId
    );

    if (accountIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Remove the account from the array
    creator.accounts.splice(accountIndex, 1);
    await creator.save();

    return res.status(200).json({
      success: true,
      message: 'Account removed',
      data: creator.accounts
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getCreatorAccounts,
  addAccount,
  getMetricsAggregated,
  getPlatformStats,
  deleteAccount
};

/*
EXAMPLE API REQUESTS:

1. GET /api/creator/accounts
   Headers: Authorization: Bearer <JWT_TOKEN>
   Response: Returns creator profile with accounts array

2. POST /api/creator/accounts
   Headers:
     Authorization: Bearer <JWT_TOKEN>
     Content-Type: application/json
   Body: {
     "platform": "YouTube",
     "accountId": "UC1234567890",
     "accountName": "MyYouTubeChannel"
   }
   Response: Returns updated creator profile

3. GET /api/creator/metrics-aggregated
   Headers: Authorization: Bearer <JWT_TOKEN>
   Response: Returns aggregated metrics by date and platform for last 30 days

4. GET /api/creator/platform-stats
   Headers: Authorization: Bearer <JWT_TOKEN>
   Response: Returns platform statistics sorted by total views for last 30 days

5. DELETE /api/creator/accounts/:accountId
   Headers: Authorization: Bearer <JWT_TOKEN>
   URL Params: accountId (the MongoDB _id of the account to delete)
   Response: Returns success message with remaining accounts array
*/
