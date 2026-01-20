const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  recordMetrics,
  getCreatorMetrics,
  getAccountMetrics,
  deleteMetrics
} = require('../controllers/analyticsController');

router.post('/record/:creatorId', authenticateToken, recordMetrics);
router.get('/creator', authenticateToken, getCreatorMetrics);
router.get('/account/:accountId', authenticateToken, getAccountMetrics);
router.delete('/:metricsId', authenticateToken, deleteMetrics);

module.exports = router;
