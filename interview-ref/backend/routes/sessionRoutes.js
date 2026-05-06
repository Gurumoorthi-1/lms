// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const { getSession, createSession } = require('../controllers/sessionController');
router.get('/:sessionId', getSession);
router.post('/create', createSession);
module.exports = router;
