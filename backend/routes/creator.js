const express = require('express');
const auth = require('../middleware/auth');
const {
  getCreatorProfile,
  createCreatorProfile,
  getCreatorAccounts,
  addAccount,
  getMetricsAggregated,
  getPlatformStats,
  deleteAccount,
  deleteCreator
} = require('../controllers/creatorController');

const router = express.Router();

// Apply authentication to all routes
router.use(auth);

// GET /api/creator/accounts - Get creator accounts
router.get('/accounts', getCreatorAccounts);
router.get('/profile', getCreatorProfile);
router.post('/profile', createCreatorProfile);

// POST /api/creator/accounts - Add new account (Admin Only)
router.post('/accounts', auth.isAdmin, addAccount);

// GET /api/creator/metrics-aggregated - Get aggregated metrics
router.get('/metrics-aggregated', getMetricsAggregated);

// GET /api/creator/platform-stats - Get platform statistics
router.get('/platform-stats', getPlatformStats);

// DELETE /api/creator/accounts/:accountId - Delete account (Admin Only)
router.delete('/accounts/:accountId', auth.isAdmin, deleteAccount);

// POST /api/creator/:id/accounts - Add new account to specific creator (Admin Only)
router.post('/:id/accounts', auth.isAdmin, addAccount);

// DELETE /api/creator/:id - Delete creator and all data (Admin Only)
router.delete('/:id', auth.isAdmin, deleteCreator);

module.exports = router;
