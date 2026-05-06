const express = require('express');
const router = express.Router();
const { getAnalytics, logProctoringEvent, saveEmotionReport } = require('../controllers/analyticsController');
router.get('/:sessionId', getAnalytics);
router.post('/proctoring-event', logProctoringEvent);
router.post('/emotion-report', saveEmotionReport);   // Feature 3
module.exports = router;
