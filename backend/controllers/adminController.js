const Creator = require('../models/Creator');
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
        $group: {
          _id: '$creatorId',
          totalViews: { $sum: '$metrics.views' },
          totalLikes: { $sum: '$metrics.likes' },
          totalFollowers: { $avg: '$metrics.followers' },
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
          totalLikes: 1,
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
    
    const creator = await Creator.findById(creatorId).populate('userId', 'email role');
    if (!creator) {
      return res.status(404).json({ success: false, message: 'Creator not found' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metricsAggregated = await Analytics.aggregate([
      {
        $match: {
          creatorId: creator._id,
          timestamp: { $gte: thirtyDaysAgo }
        }
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

    const platformStats = await Analytics.aggregate([
      {
        $match: {
          creatorId: creator._id,
          timestamp: { $gte: thirtyDaysAgo }
        }
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

    res.json({
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
