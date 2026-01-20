const Analytics = require('../models/Analytics');
const Creator = require('../models/Creator');

const recordMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only creators can record metrics'
      });
    }

    const { creatorId } = req.params;
    const { accountId, platform, metrics } = req.body;

    const creator = await Creator.findOne({ _id: creatorId, userId: req.user.id });
    if (!creator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to record metrics for this creator'
      });
    }

    const analyticsData = new Analytics({
      creatorId,
      accountId,
      platform,
      metrics
    });

    const savedDoc = await analyticsData.save();

    res.status(201).json({
      success: true,
      message: 'Metrics recorded successfully',
      data: savedDoc
    });

  } catch (error) {
    console.error('Error recording metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getCreatorMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only creators can view metrics'
      });
    }

    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metricsArray = await Analytics.find({
      creatorId: creator._id,
      timestamp: { $gte: thirtyDaysAgo }
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: metricsArray
    });

  } catch (error) {
    console.error('Error fetching creator metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAccountMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only creators can view metrics'
      });
    }

    const { accountId } = req.params;

    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metricsArray = await Analytics.find({
      creatorId: creator._id,
      accountId,
      timestamp: { $gte: thirtyDaysAgo }
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: metricsArray
    });

  } catch (error) {
    console.error('Error fetching account metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only creators can delete metrics'
      });
    }

    const { metricsId } = req.params;

    const creator = await Creator.findOne({ userId: req.user.id });
    if (!creator) {
      return res.status(404).json({
        success: false,
        message: 'Creator profile not found'
      });
    }

    const analyticsDoc = await Analytics.findById(metricsId);
    if (!analyticsDoc) {
      return res.status(404).json({
        success: false,
        message: 'Metrics entry not found'
      });
    }

    if (analyticsDoc.creatorId.toString() !== creator._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this metrics entry'
      });
    }

    await Analytics.findByIdAndDelete(metricsId);

    res.status(200).json({
      success: true,
      message: 'Metrics entry deleted'
    });

  } catch (error) {
    console.error('Error deleting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  recordMetrics,
  getCreatorMetrics,
  getAccountMetrics,
  deleteMetrics
};
