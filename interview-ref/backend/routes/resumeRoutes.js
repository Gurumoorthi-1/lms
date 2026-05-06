// routes/resumeRoutes.js
const express = require('express');
const router = express.Router();
const { uploadResume, getResumeAnalysis } = require('../controllers/resumeController');
router.post('/upload', uploadResume);
router.get('/:sessionId', getResumeAnalysis);
module.exports = router;
