const express = require('express');
const router = express.Router();
const { getAllCreators, getTopPerformers, getCreatorDetails } = require('../controllers/adminController');
const User = require('../models/User');
const Creator = require('../models/Creator');

// @route   GET api/admin/all-creators
// @desc    Get all creators
// @access  Private (Admin)
router.get('/all-creators', getAllCreators);

// @route   GET api/admin/top-performers
// @desc    Get top performing creators
// @access  Private (Admin)
router.get('/top-performers', getTopPerformers);

// @route   GET api/admin/creator/:creatorId
// @desc    Get specific creator's detailed metrics
// @access  Private (Admin)
router.get('/creator/:creatorId', getCreatorDetails);

// @route   POST api/admin/create-creator
// @desc    Create a new creator (Admin only)
// @access  Private (Admin)
router.post('/create-creator', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { email, name, password } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const creatorName = (name || '').trim();

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    if (!creatorName) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email exists' });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%^&*';
    const tempPassword =
      (password && String(password).trim().length >= 6)
        ? String(password).trim()
        : Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const user = new User({
      email: normalizedEmail,
      password: tempPassword,
      role: 'creator',
    });
    await user.save();

    const creator = new Creator({
      userId: user._id,
      name: creatorName,
      accounts: [],
    });
    await creator.save();

    return res.json({
      success: true,
      tempPassword,
      user: { id: user.id, email: user.email, role: user.role },
      creator: { id: creator.id, name: creator.name },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
