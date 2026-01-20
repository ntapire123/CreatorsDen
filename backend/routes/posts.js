const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Posts = require('../models/Posts');

// GET /api/posts/account/:accountId/recent - Get recent posts for an account
router.get('/account/:accountId/recent', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { days = 30 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const posts = await Posts.find({
      accountId,
      publishedAt: { $gte: daysAgo }
    }).sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching recent posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/stats - Get aggregated stats across all posts
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { days = 30, platform } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const matchStage = {
      publishedAt: { $gte: daysAgo }
    };

    if (platform) {
      matchStage.platform = platform;
    }

    const stats = await Posts.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: { $add: ['$views', '$view_count', '$impressions'] } },
          totalLikes: { $sum: '$likes' },
          avgEngagement: {
            $avg: {
              $divide: [
                '$likes',
                { $add: ['$views', '$view_count', '$impressions', 1] }
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        avgEngagement: 0
      }
    });
  } catch (error) {
    console.error('Error fetching post stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/trending - Get trending posts by platform
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const { platform, limit = 10 } = req.query;

    const matchStage = {};
    if (platform) {
      matchStage.platform = platform;
    }

    // Get posts from last 7 days, sorted by engagement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    matchStage.publishedAt = { $gte: sevenDaysAgo };

    const trendingPosts = await Posts.find(matchStage)
      .sort({
        likes: -1,
        views: -1,
        view_count: -1,
        impressions: -1
      })
      .limit(parseInt(limit))
      .populate('accountId');

    res.json({
      success: true,
      data: trendingPosts
    });
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// GET /api/posts/timeline - Get posts timeline data for charts
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const { days = 30, platform, accountId } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const matchStage = {
      publishedAt: { $gte: daysAgo }
    };

    if (platform) {
      matchStage.platform = platform;
    }

    if (accountId) {
      matchStage.accountId = accountId;
    }

    const timeline = await Posts.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$publishedAt"
            }
          },
          totalViews: { $sum: { $add: ['$views', '$view_count', '$impressions'] } },
          totalLikes: { $sum: '$likes' },
          postCount: { $sum: 1 },
          avgEngagement: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    '$likes',
                    { $add: ['$views', '$view_count', '$impressions', 1] }
                  ]
                },
                100
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
