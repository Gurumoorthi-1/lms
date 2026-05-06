const express = require('express');
const router = express.Router();
const { generateProblems, runCode, submitSolution, completeRound } = require('../controllers/codingController');
router.post('/generate', generateProblems);
router.post('/run', runCode);
router.post('/submit', submitSolution);
router.post('/complete', completeRound);
module.exports = router;
