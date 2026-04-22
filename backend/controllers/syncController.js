const { google } = require("googleapis");

const Account = require("../models/Account");
const Analytics = require("../models/Analytics");
const { fetchAccountStats } = require("../utils/apiFetcher");

function isUnauthorizedError(err) {
  return (
    err?.code === 401 ||
    err?.response?.status === 401 ||
    err?.status === 401 ||
    err?.message?.toLowerCase?.().includes("invalid credentials")
  );
}

/**
 * POST /api/sync/:accountId
 * Fetch fresh metrics for an account and store a daily snapshot.
 */
async function syncAccountStats(req, res) {
  const { accountId } = req.params;

  try {
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const apiToken = typeof account.getDecryptedTokens === "function"
      ? account.getDecryptedTokens()?.apiToken
      : account.apiToken;
    const platform = account.platform;

    let metrics = {
      totalViews: 0,
      followers: 0,
      likes: 0,
    };

    if (platform === "YouTube") {
      if (!apiToken) {
        return res.status(400).json({ success: false, message: "Missing YouTube access token" });
      }

      // "mine=true" requires an OAuth access token, not just an API key.
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: apiToken });

      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      const response = await youtube.channels.list({
        mine: true,
        part: ["statistics"],
      });

      const stats = response?.data?.items?.[0]?.statistics;
      const viewCount = Number(stats?.viewCount ?? 0);
      const subscriberCount = Number(stats?.subscriberCount ?? 0);
      const videoCount = Number(stats?.videoCount ?? 0);

      metrics = {
        totalViews: Number.isFinite(viewCount) ? viewCount : 0,
        followers: Number.isFinite(subscriberCount) ? subscriberCount : 0,
        // Keep likes as 0 because YouTube channel stats endpoint does not provide it directly.
        likes: 0,
      };
    } else if (platform === "TikTok") {
      const stats = await fetchAccountStats("TikTok", account.username);

      metrics = {
        totalViews: Number.isFinite(Number(stats?.views)) ? Number(stats.views) : 0,
        followers: Number.isFinite(Number(stats?.followers)) ? Number(stats.followers) : 0,
        likes: Number.isFinite(Number(stats?.likes)) ? Number(stats.likes) : 0,
      };
    } else if (platform === "Instagram") {
      const stats = await fetchAccountStats("Instagram", account.username);

      metrics = {
        totalViews: Number.isFinite(Number(stats?.views)) ? Number(stats.views) : 0,
        followers: Number.isFinite(Number(stats?.followers)) ? Number(stats.followers) : 0,
        likes: Number.isFinite(Number(stats?.likes)) ? Number(stats.likes) : 0,
      };
    } else {
      return res.status(400).json({ success: false, message: `Unsupported platform: ${platform}` });
    }

    const analyticsDoc = await Analytics.createSnapshot(
      account._id,
      metrics.followers,
      metrics.totalViews,
      metrics.likes
    );

    account.lastUpdated = new Date();
    account.followers = metrics.followers;
    account.totalViews = metrics.totalViews;
    account.totalLikes = metrics.likes;
    await account.save();

    return res.json({
      success: true,
      data: {
        accountId: String(account._id),
        platform: account.platform,
        lastSynced: account.lastUpdated,
        metrics,
        analyticsId: String(analyticsDoc._id),
      },
    });
  } catch (err) {
    if (err?.response?.status === 429 || String(err.message || '').toLowerCase().includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please wait a moment before trying again."
      });
    }
    if (isUnauthorizedError(err)) {
      return res.status(401).json({
        success: false,
        code: "RECONNECT_REQUIRED",
        message: "Token expired or invalid. Please reconnect this account.",
      });
    }

    console.error("syncAccountStats error:", err);
    return res.status(500).json({ success: false, message: "Failed to sync account stats" });
  }
}

module.exports = {
  syncAccountStats,
};

