const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Progress = require('../models/Progress');
const { protect } = require('../middleware/auth');
const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    // Create empty progress record
    await Progress.create({ user: user._id });

    res.status(201).json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, points: 0 }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    user.lastActive = Date.now();
    await user.save();

    const progress = await Progress.findOne({ user: user._id });

    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id, name: user.name, email: user.email,
        role: user.role,
        points: progress?.totalPoints || 0,
        solvedCount: progress?.solvedChallenges?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.user._id });
    res.json({
      user: {
        _id: req.user._id, name: req.user.name, email: req.user.email,
        role: req.user.role,
        points: progress?.totalPoints || 0,
        solvedCount: progress?.solvedChallenges?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
