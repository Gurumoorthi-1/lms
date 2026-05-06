const express = require('express');
const router = express.Router();
const { generateQuestions, analyzeResponse, completeInterview } = require('../controllers/interviewController');
router.post('/generate-questions', generateQuestions);
router.post('/analyze-response', analyzeResponse);
router.post('/complete', completeInterview);
module.exports = router;
