const express = require('express');
const {
  getCreatorAccounts,
  addAccount,
  getMetricsAggregated,
  getPlatformStats,
  deleteAccount
} = require('../controllers/creatorController');

const router = express.Router();

// GET /api/creator/accounts - Get creator accounts
router.get('/accounts', getCreatorAccounts);

// POST /api/creator/accounts - Add new account
router.post('/accounts', addAccount);

// GET /api/creator/metrics-aggregated - Get aggregated metrics
router.get('/metrics-aggregated', getMetricsAggregated);

// GET /api/creator/platform-stats - Get platform statistics
router.get('/platform-stats', getPlatformStats);

// DELETE /api/creator/accounts/:accountId - Delete account
router.delete('/accounts/:accountId', deleteAccount);

module.exports = router;
