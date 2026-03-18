const express = require("express");
const router = express.Router();

const authenticateToken = require("../middleware/auth");
const { syncAccountStats } = require("../controllers/syncController");

// POST /api/sync/:accountId (protected)
router.post("/:accountId", authenticateToken, syncAccountStats);

module.exports = router;

