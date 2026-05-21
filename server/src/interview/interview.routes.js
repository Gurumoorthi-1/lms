import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireStage } from '../middlewares/progress.middleware.js';
import { ProgressService } from '../progress/progress.service.js';
import { PerformanceAnalysisService } from './performance-analysis.service.js';
import { examsGateway } from '../exams/exams.gateway.js';
import { User } from '../auth/user.schema.js';
import { InterviewSession } from './InterviewSession.schema.js';

const router = express.Router();
const progressService = new ProgressService();
const perfService = new PerformanceAnalysisService();

router.get('/performance', requireAuth, async (req, res) => {
  try {
    const profile = await perfService.getFullProfile(req.user.userId);
    res.json({ success: true, profile });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/start', requireAuth, requireStage('HR_INTERVIEW'), async (req, res) => {
  try {
    console.log("BACKEND: Starting new HR interview session for user:", req.user.userId);
    
    // Resume integration from LMS progress
    const progress = await progressService.getUserProgress(req.user.userId);
    const skills = progress.context?.resume?.skills || ['General'];
    
    const questions = [
      { questionText: "Tell me about yourself." },
      { questionText: `Explain your experience with ${skills[0] || 'your core technologies'}.` },
      { questionText: `How does ${skills[1] || 'backend architecture'} work in a modern application?` },
      { questionText: `Can you explain the difference between relational databases and NoSQL, in the context of ${skills[2] || 'your projects'}?` },
      { questionText: "What is your greatest strength?" },
      { questionText: "Why should we hire you?" },
      { questionText: "Are you ready to learn new technologies and adapt yourself?" },
    ];

    const session = await InterviewSession.create({
      user: req.user.userId,
      questions: questions,
      status: 'in-progress'
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/answer', requireAuth, requireStage('HR_INTERVIEW'), async (req, res) => {
  try {
    const { sessionId, questionIndex, answerText } = req.body;
    
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.questions[questionIndex]) {
      session.questions[questionIndex].answerText = answerText;
    }

    await session.save();
    
    // Simulate AI thinking and sending a professional HR response
    const responses = [
      "Good answer.", 
      "Interesting perspective.", 
      "That's a solid point.", 
      "I appreciate your detailed explanation.",
      "Very well explained."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    res.json({ message: 'Answer saved successfully', session, feedback: randomResponse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/finish', requireAuth, requireStage('HR_INTERVIEW'), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await InterviewSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Mock Evaluation Logic based on transcript length
    let communication = 40, technical = 40, confidence = 40, resumeMatch = 40; // baseline for testing
    let answeredQuestions = 0;

    session.questions.forEach((q, index) => {
      if (q.answerText && q.answerText.trim().length > 0) {
        answeredQuestions++;
        communication += Math.min(10 + (q.answerText.length / 2), 60);
        if (index > 0 && index < 4) technical += Math.min(15 + (q.answerText.length / 2), 60);
        confidence += 10; 
      }
    });

    if (answeredQuestions > 0) {
      communication = Math.min(communication, 100);
      technical = Math.min(technical, 100);
      confidence = Math.min(confidence, 100);
      resumeMatch = Math.min(resumeMatch + (answeredQuestions * 5), 100);
    }

    session.scores = {
      communication,
      technical,
      confidence,
      resumeMatch,
      overall: Math.floor((communication + technical + confidence + resumeMatch) / 4)
    };
    
    session.status = 'completed';
    session.feedback = "Overall good performance. You communicated clearly but could go deeper into technical explanations.";
    await session.save();

    // Now INTEGRATE with LMS existing reports:
    const totalMarksObtained = Math.round((session.scores.overall / 100) * 14); // out of 14 for LMS compatibility
    const totalPossibleMarks = 14;
    const percentScore = session.scores.overall;

    await perfService.recordHRPerformance(req.user.userId, {
      score: percentScore,
      marksObtained: totalMarksObtained,
      totalMarks: totalPossibleMarks,
      feedback: session.feedback,
      strengths: ['Communication', 'Confidence'],
      improvements: ['Technical depth'],
      status: 'COMPLETED'
    });

    // Format responses for the LMS AI Report generator so it can generate Key Strengths
    const formattedResponses = {};
    session.questions.forEach((q, i) => {
      formattedResponses[`q${i}`] = {
        question: q.questionText,
        answer: q.answerText || 'No answer provided',
        score: (percentScore / 100) * 2
      };
    });

    await progressService.updateContext(req.user.userId, 'interview.responses', formattedResponses);
    await progressService.updateContext(req.user.userId, 'interview.percentScore', percentScore);
    await progressService.updateContext(req.user.userId, 'interview.status', 'completed');

    const stageResult = await progressService.moveToNextStage(req.user.userId, 'HR_INTERVIEW');

    // Trigger real-time update for instructor
    const user = await User.findById(req.user.userId).lean();
    if (user?.institutionId) {
      examsGateway.emitAnalyticsUpdate(user.institutionId);
    }

    res.json({
      success: true,
      message: 'Interview completed successfully!',
      session,
      percentScore,
      newToken: stageResult.newToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
