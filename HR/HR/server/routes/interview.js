import express from 'express';
import multer from 'multer';
import { startInterview, getInterviewResult, getInterviews } from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/start', protect, upload.single('resume'), startInterview);
router.get('/result/:id', protect, getInterviewResult);
router.get('/', protect, getInterviews);

export default router;
