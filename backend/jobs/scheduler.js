const cron = require('node-cron');
const { syncAllAccounts } = require('../services/syncService');

/**
 * Nightly scheduler for syncing all accounts
 * Runs every day at midnight (00:00)
 */
class SyncScheduler {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.job) {
      console.log('Sync scheduler is already running');
      return;
    }

    // Schedule job to run every day at midnight (00:00)
    this.job = cron.schedule('0 0 * * *', async () => {
      if (this.isRunning) {
        console.log('Sync job is already running, skipping this execution');
        return;
      }

      await this.runSyncJob();
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'UTC' // Use UTC timezone for consistency
    });

    this.job.start();
    console.log('Sync scheduler started - will run daily at midnight UTC');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('Sync scheduler stopped');
    }
  }

  /**
   * Run the sync job manually
   */
  async runSyncJob() {
    if (this.isRunning) {
      console.log('Sync job is already in progress');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();
    
    try {
      console.log(`\n🚀 Starting nightly sync job at ${startTime.toISOString()}`);
      
      const results = await syncAllAccounts();
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log(`\n📊 Nightly sync job completed in ${duration}ms`);
      console.log(`✅ Successfully synced: ${results.successful} accounts`);
      console.log(`❌ Failed to sync: ${results.failed} accounts`);
      console.log(`🔗 Need reconnection: ${results.needsReconnection} accounts`);
      console.log(`📈 Total accounts processed: ${results.total}`);
      
      if (results.needsReconnection > 0) {
        console.log(`\n⚠️  ${results.needsReconnection} accounts need reconnection. Consider notifying users.`);
      }
      
      return results;
    } catch (error) {
      console.error('💥 Nightly sync job failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
      console.log(`\n⏰ Sync job finished at ${new Date().toISOString()}\n`);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isScheduled: !!this.job,
      isRunning: this.isRunning,
      nextRun: this.job ? this.job.nextDates().toDate() : null
    };
  }
}

// Create singleton instance
const syncScheduler = new SyncScheduler();

// Auto-start scheduler if this file is run directly
if (require.main === module) {
  console.log('Starting sync scheduler in standalone mode...');
  syncScheduler.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping scheduler...');
    syncScheduler.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, stopping scheduler...');
    syncScheduler.stop();
    process.exit(0);
  });
  
  // Keep the process alive
  console.log('Scheduler is running. Press Ctrl+C to stop.');
}

module.exports = syncScheduler;
