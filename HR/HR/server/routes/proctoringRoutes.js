import express from 'express';
import { logWarning } from '../controllers/proctoringController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/log', protect, logWarning);

export default router;
