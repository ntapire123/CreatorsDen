const { syncAccountMetrics } = require("../services/syncService");

/**
 * POST /api/sync/:accountId
 * Fetch fresh metrics for an account and store a daily snapshot.
 */
async function syncAccountStats(req, res) {
  const { accountId } = req.params;

  try {
    const result = await syncAccountMetrics(accountId);
    
    if (!result.success) {
      if (result.needsReconnection) {
        return res.status(401).json({
          success: false,
          code: "RECONNECT_REQUIRED",
          message: result.error,
        });
      }
      
      const statusCode = result.error.includes("not found") ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        message: result.error,
      });
    }

    return res.json({
      success: true,
      data: result.data,
    });
  } catch (err) {
    console.error("syncAccountStats error:", err);
    return res.status(500).json({ success: false, message: "Failed to sync account stats" });
  }
}

module.exports = {
  syncAccountStats,
};

