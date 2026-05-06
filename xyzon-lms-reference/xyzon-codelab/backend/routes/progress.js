const express = require('express');
const { protect } = require('../middleware/auth');
const Progress = require('../models/Progress');
const User = require('../models/User');
const { executeCode } = require('./compiler');
const { challenges } = require('./challenges');
const router = express.Router();

// POST /api/progress/submit  - submit a challenge
router.post('/submit', protect, async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const challenge = challenges.find(c => c.id === parseInt(challengeId));
    if (!challenge) return res.status(404).json({ message: 'Challenge not found' });

    const startTime = Date.now();
    const result = await executeCode(challenge.language, code, '');
    const execTime = Date.now() - startTime;

    const actualOutput = (result.stdout || '').trim();
    const isCorrect = challenge.validate(actualOutput);
    const status = result.code !== 0 ? 'error' : isCorrect ? 'accepted' : 'wrong_answer';

    let progress = await Progress.findOne({ user: req.user._id });
    if (!progress) progress = new Progress({ user: req.user._id });

    // Add submission record
    progress.submissions.push({
      challengeId: challenge.id,
      code,
      language: challenge.language,
      status,
      output: result.stdout?.slice(0, 500),
      executionTime: execTime
    });

    // Award points on first accepted
    let pointsEarned = 0;
    if (isCorrect && !progress.solvedChallenges.includes(challenge.id)) {
      progress.solvedChallenges.push(challenge.id);
      const pts = { Easy: 10, Medium: 20, Hard: 30 }[challenge.difficulty] || 10;
      progress.totalPoints += pts;
      pointsEarned = pts;
      await User.findByIdAndUpdate(req.user._id, { $inc: { points: pts } });
    }

    progress.lastActivity = Date.now();
    await progress.save();

    res.json({
      status,
      isCorrect,
      output: result.stdout || '',
      error: result.stderr || '',
      exitCode: result.code,
      execTime,
      pointsEarned,
      expectedOutput: isCorrect ? undefined : challenge.expectedOutput,
      totalSolved: progress.solvedChallenges.length,
      totalPoints: progress.totalPoints
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/progress/me
router.get('/me', protect, async (req, res) => {
  try {
    const progress = await Progress.findOne({ user: req.user._id });
    if (!progress) return res.json({ solvedChallenges: [], totalPoints: 0, submissions: [] });
    res.json({
      solvedChallenges: progress.solvedChallenges,
      totalPoints: progress.totalPoints,
      freeRunCount: progress.freeRunCount,
      recentSubmissions: progress.submissions.slice(-20).reverse()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/progress/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const top = await Progress.find({})
      .sort({ totalPoints: -1, 'solvedChallenges.length': -1 })
      .limit(10)
      .populate('user', 'name email');
    res.json(top.map((p, i) => ({
      rank: i + 1,
      name: p.user?.name || 'Unknown',
      email: p.user?.email,
      points: p.totalPoints,
      solved: p.solvedChallenges.length
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
