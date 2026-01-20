const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  linkAccount,
  handleCallback,
  manualLink,
  syncPosts,
  refreshTokens,
} = require("../controllers/accountsController");
const Account = require("../models/Account");

// GET /api/accounts - Get all accounts for dashboard
router.get("/", authenticateToken, async (req, res) => {
  try {
    const accounts = await Account.find({}).populate("creatorId");
    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// GET /api/accounts/link?platform=YouTube
router.get("/link", authenticateToken, linkAccount);

// GET /api/accounts/callback
router.get("/callback", handleCallback);

// POST /api/accounts/manual-link
router.post("/manual-link", authenticateToken, requireAdmin, manualLink);

// POST /api/accounts/sync/:accountId
router.post("/sync/:accountId", authenticateToken, syncPosts);

// POST /api/accounts/refresh/:accountId
router.post("/refresh/:accountId", authenticateToken, refreshTokens);

module.exports = router;
