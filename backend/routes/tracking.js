const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  addAccount,
  getAccountHistory,
  getAccounts,
  deleteAccount
} = require('../controllers/trackingController');

// All routes require authentication
router.use(auth);

// Add a new account for tracking (ADMIN ONLY)
router.post('/add', auth.isAdmin, addAccount);

// Get all accounts for the authenticated creator
router.get('/accounts', getAccounts);

// Get account history for the last 30 days
router.get('/history/:accountId', getAccountHistory);

// Delete an account
router.delete('/accounts/:accountId', deleteAccount);

module.exports = router;
