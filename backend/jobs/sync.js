const cron = require('node-cron');
const Account = require('../models/Account');
const Analytics = require('../models/Analytics');
const { fetchAccountStats } = require('../utils/apiFetcher');

const SYNC_CRON_EXPRESSION = process.env.SYNC_CRON_EXPRESSION || '0 */3 * * *'; // every 3 hours
const SYNC_MIN_INTERVAL_MINUTES = Number.parseInt(process.env.SYNC_MIN_INTERVAL_MINUTES || '180', 10);

function shouldSyncAccount(account) {
  const baseline = account.lastUpdated || account.updatedAt || account.createdAt;
  if (!baseline) return true;
  const minutesSinceLastSync = (Date.now() - new Date(baseline).getTime()) / (60 * 1000);
  return minutesSinceLastSync >= SYNC_MIN_INTERVAL_MINUTES;
}

/**
 * Sync all accounts with their latest stats
 * Runs every day at midnight
 */
async function syncAllAccounts() {
  console.log('🔄 Starting nightly sync for all accounts...');
  
  try {
    // Get all accounts
    const accounts = await Account.find({});
    console.log(`📊 Found ${accounts.length} accounts to sync`);

    let successCount = 0;
    let errorCount = 0;

    // Process each account with a delay to avoid rate limits
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      try {
        console.log(`🔄 Syncing ${account.platform} account: ${account.username}`);
        
        if (!shouldSyncAccount(account)) {
          console.log(`⏭️ Skipping ${account.username} (synced recently)`);
          continue;
        }

        // Fetch latest stats
        const stats = await fetchAccountStats(
          account.platform,
          account.username,
          { includeEngagementAggregation: account.platform === 'Instagram' || account.platform === 'TikTok' }
        );
        
        // Update profile image if it changed
        if (stats.avatar && stats.avatar !== account.profileImage) {
          account.profileImage = stats.avatar;
          await account.save();
        }
        
        // Create intraday analytics snapshot
        await Analytics.createSnapshot(
          account._id,
          stats.followers,
          stats.totalViews || stats.views || 0,
          stats.totalLikes || stats.likes || 0
        );

        account.lastUpdated = new Date();
        account.followers = Number(stats.followers || account.followers || 0);
        account.totalViews = Number(stats.totalViews || stats.views || account.totalViews || 0);
        account.totalLikes = Number(stats.totalLikes || stats.likes || account.totalLikes || 0);
        await account.save();
        
        console.log(`✅ Successfully synced ${account.platform} account: ${account.username}`);
        successCount++;
        
        // Add delay between API calls to avoid rate limits
        if (i < accounts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
        
      } catch (error) {
        console.error(`❌ Failed to sync ${account.platform} account ${account.username}:`, error.message);
        errorCount++;
      }
    }

    console.log(`🎉 Sync completed. Success: ${successCount}, Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('💥 Critical error during nightly sync:', error);
  }
}

/**
 * Sync a single account (for manual triggering)
 */
async function syncSingleAccount(accountId) {
  try {
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    console.log(`🔄 Syncing single ${account.platform} account: ${account.username}`);
    
    const stats = await fetchAccountStats(
      account.platform,
      account.username,
      { includeEngagementAggregation: false }
    );
    
    // Update profile image if it changed
    if (stats.avatar && stats.avatar !== account.profileImage) {
      account.profileImage = stats.avatar;
      await account.save();
    }
    
    // Create intraday analytics snapshot
    await Analytics.createSnapshot(
      account._id,
      stats.followers,
      stats.totalViews || stats.views || 0,
      stats.totalLikes || stats.likes || 0
    );

    account.lastUpdated = new Date();
    account.followers = Number(stats.followers || account.followers || 0);
    account.totalViews = Number(stats.totalViews || stats.views || account.totalViews || 0);
    account.totalLikes = Number(stats.totalLikes || stats.likes || account.totalLikes || 0);
    await account.save();
    
    console.log(`✅ Successfully synced ${account.platform} account: ${account.username}`);
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error(`❌ Failed to sync account ${accountId}:`, error.message);
    throw error;
  }
}

/**
 * Start the cron job
 * Schedule: configurable cron, default every 3 hours
 */
function startSyncScheduler() {
  cron.schedule(SYNC_CRON_EXPRESSION, () => {
    console.log(`⏰ Running scheduled sync job (${SYNC_CRON_EXPRESSION})`);
    syncAllAccounts();
  });

  console.log(`🕐 Sync scheduler started - cron: ${SYNC_CRON_EXPRESSION}, min interval: ${SYNC_MIN_INTERVAL_MINUTES} min`);
  
  // Optional: Run a sync on startup (comment out if not needed)
  // setTimeout(() => {
  //   console.log('🚀 Running initial sync on startup');
  //   syncAllAccounts();
  // }, 5000); // Wait 5 seconds after server start
}

/**
 * Stop the cron job
 */
function stopSyncScheduler() {
  cron.getTasks().forEach(task => task.stop());
  console.log('⏹️ Sync scheduler stopped');
}

/**
 * Get next scheduled run time
 */
function getNextRunTime() {
  const tasks = cron.getTasks();
  if (tasks.size === 0) return null;
  
  const task = tasks.values().next().value;
  return task.nextDate();
}

module.exports = {
  syncAllAccounts,
  syncSingleAccount,
  startSyncScheduler,
  stopSyncScheduler,
  getNextRunTime
};
