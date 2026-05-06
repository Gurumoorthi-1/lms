const express = require('express');
const router = express.Router();
const { generateQuestions, submitTest } = require('../controllers/aptitudeController');
router.post('/generate', generateQuestions);
router.post('/submit', submitTest);
module.exports = router;
