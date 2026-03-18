const axios = require("axios");
const { google } = require("googleapis");

const Account = require("../models/Account");
const Analytics = require("../models/Analytics");

function isUnauthorizedError(err) {
  return (
    err?.code === 401 ||
    err?.response?.status === 401 ||
    err?.status === 401 ||
    err?.message?.toLowerCase?.().includes("invalid credentials")
  );
}

/**
 * Fetch metrics for a single account and store analytics snapshot
 * @param {string} accountId - Account ID to sync
 * @returns {Promise<Object>} Sync result with success status and data
 */
async function syncAccountMetrics(accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      return {
        success: false,
        error: "Account not found",
        accountId
      };
    }

    // Check if account needs reconnection
    if (account.needsReconnection) {
      return {
        success: false,
        error: "Account needs reconnection",
        accountId,
        needsReconnection: true
      };
    }

    let tokens;
    try {
      tokens = account.getDecryptedTokens();
    } catch (decryptError) {
      return {
        success: false,
        error: "Failed to decrypt tokens",
        accountId
      };
    }

    const { apiToken } = tokens;
    const platform = account.platform;

    let metrics = {
      views: 0,
      followers: 0,
      engagement: 0,
      likes: 0,
    };

    // Try to refresh tokens if needed (for platforms that support it)
    if (platform === "YouTube" && account.needsRefresh) {
      try {
        await account.refreshTokens();
        const refreshedTokens = account.getDecryptedTokens();
        tokens.apiToken = refreshedTokens.apiToken;
      } catch (refreshError) {
        return {
          success: false,
          error: `Token refresh failed: ${refreshError.message}`,
          accountId,
          needsReconnection: true
        };
      }
    }

    if (platform === "YouTube") {
      if (!apiToken) {
        return {
          success: false,
          error: "Missing YouTube access token",
          accountId
        };
      }

      try {
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
          views: Number.isFinite(viewCount) ? viewCount : 0,
          followers: Number.isFinite(subscriberCount) ? subscriberCount : 0,
          engagement: Number.isFinite(videoCount) ? videoCount : 0,
          likes: 0,
        };
      } catch (apiError) {
        if (isUnauthorizedError(apiError)) {
          // Mark account as needing reconnection
          account.needsReconnection = true;
          await account.save();
          
          return {
            success: false,
            error: "YouTube API unauthorized. Account needs reconnection.",
            accountId,
            needsReconnection: true
          };
        }
        throw apiError;
      }
    } else if (platform === "TikTok") {
      if (!apiToken) {
        return {
          success: false,
          error: "Missing TikTok access token",
          accountId
        };
      }

      try {
        // Use the new TikTok API endpoint for user info
        const response = await axios.get("https://open.tiktokapis.com/v2/user/info/", {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
          params: {
            fields: "open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count",
          },
          timeout: 15000,
        });

        const userData = response?.data?.data?.user;
        if (!userData) {
          throw new Error('Invalid TikTok API response structure');
        }

        const followerCount = Number(userData.follower_count ?? 0);
        const likesCount = Number(userData.likes_count ?? 0);
        const followingCount = Number(userData.following_count ?? 0);

        metrics = {
          views: 0, // TikTok doesn't provide total views in user info
          followers: Number.isFinite(followerCount) ? followerCount : 0,
          engagement: Number.isFinite(likesCount) ? likesCount : 0,
          likes: Number.isFinite(likesCount) ? likesCount : 0,
        };
      } catch (apiError) {
        if (isUnauthorizedError(apiError)) {
          account.needsReconnection = true;
          await account.save();
          
          return {
            success: false,
            error: "TikTok API unauthorized. Account needs reconnection.",
            accountId,
            needsReconnection: true
          };
        }
        
        // Check for configuration errors
        if (apiError.message?.includes('configuration') || apiError.response?.status === 500) {
          return {
            success: false,
            error: "TikTok service not configured properly",
            accountId
          };
        }
        
        throw apiError;
      }
    } else if (platform === "Instagram") {
      if (!apiToken) {
        return {
          success: false,
          error: "Missing Instagram access token",
          accountId
        };
      }

      try {
        // Use Instagram Basic Display API
        const response = await axios.get("https://graph.instagram.com/me", {
          params: {
            fields: "id,username,account_type,media_count,followers_count,follows_count",
            access_token: apiToken,
          },
          timeout: 15000,
        });

        const userData = response?.data;
        if (!userData) {
          throw new Error('Invalid Instagram API response structure');
        }

        const mediaCount = Number(userData.media_count ?? 0);
        const followersCount = Number(userData.followers_count ?? 0);

        metrics = {
          views: 0, // Instagram doesn't provide total views in user info
          followers: Number.isFinite(followersCount) ? followersCount : 0,
          engagement: Number.isFinite(mediaCount) ? mediaCount : 0,
          likes: 0, // Would need to fetch media details for likes count
        };
      } catch (apiError) {
        if (isUnauthorizedError(apiError)) {
          account.needsReconnection = true;
          await account.save();
          
          return {
            success: false,
            error: "Instagram API unauthorized. Account needs reconnection.",
            accountId,
            needsReconnection: true
          };
        }
        
        // Check for configuration errors
        if (apiError.message?.includes('configuration') || apiError.response?.status === 500) {
          return {
            success: false,
            error: "Instagram service not configured properly",
            accountId
          };
        }
        
        throw apiError;
      }
    } else {
      return {
        success: false,
        error: `Unsupported platform: ${platform}`,
        accountId
      };
    }

    // Store analytics snapshot
    const analyticsDoc = await Analytics.create({
      creatorId: account.creatorId,
      accountId: String(account._id),
      platform: account.platform,
      metrics,
      timestamp: new Date(),
    });

    // Update account lastSynced
    account.lastSynced = new Date();
    await account.save();

    return {
      success: true,
      data: {
        accountId: String(account._id),
        platform: account.platform,
        lastSynced: account.lastSynced,
        metrics: analyticsDoc.metrics,
        analyticsId: String(analyticsDoc._id),
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      accountId
    };
  }
}

/**
 * Sync all accounts for batch processing (used by scheduler)
 * @returns {Promise<Object>} Summary of sync results
 */
async function syncAllAccounts() {
  try {
    const accounts = await Account.find({});
    const results = {
      total: accounts.length,
      successful: 0,
      failed: 0,
      needsReconnection: 0,
      details: []
    };

    console.log(`Starting sync for ${accounts.length} accounts`);

    for (const account of accounts) {
      try {
        const syncResult = await syncAccountMetrics(String(account._id));
        
        if (syncResult.success) {
          results.successful++;
          console.log(`✓ Synced ${account.platform} account ${account.username}`);
        } else {
          results.failed++;
          if (syncResult.needsReconnection) {
            results.needsReconnection++;
          }
          console.log(`✗ Failed to sync ${account.platform} account ${account.username}: ${syncResult.error}`);
        }
        
        results.details.push({
          accountId: String(account._id),
          platform: account.platform,
          username: account.username,
          success: syncResult.success,
          error: syncResult.error,
          needsReconnection: syncResult.needsReconnection || false
        });
      } catch (error) {
        results.failed++;
        console.log(`✗ Unexpected error syncing ${account.platform} account ${account.username}: ${error.message}`);
        results.details.push({
          accountId: String(account._id),
          platform: account.platform,
          username: account.username,
          success: false,
          error: error.message,
          needsReconnection: false
        });
      }
    }

    console.log(`Sync completed: ${results.successful} successful, ${results.failed} failed, ${results.needsReconnection} need reconnection`);
    
    return results;
  } catch (error) {
    console.error("syncAllAccounts error:", error);
    throw error;
  }
}

module.exports = {
  syncAccountMetrics,
  syncAllAccounts,
  isUnauthorizedError
};
