import Interview from '../models/Interview.js';
import { generateQuestion, extractJobRole } from '../utils/ai.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

export const startInterview = async (req, res) => {
  try {
    let jobRole = req.body.jobRole || 'Resume Based Interview';
    let resumeText = '';

    if (req.file) {
      const pdfData = await pdf(req.file.buffer);
      resumeText = pdfData.text;
      
      // If jobRole is default, try to extract it from resume
      if (jobRole === 'Resume Based Interview' || !jobRole) {
        const extractedRole = await extractJobRole(resumeText);
        if (extractedRole && extractedRole !== 'Candidate') {
          jobRole = extractedRole;
        }
      }
    }

    // Create new interview session
    const interview = await Interview.create({
      user: req.user.id,
      jobRole,
      resumeText,
      status: 'in-progress'
    });

    // Generate first question
    const firstQuestion = await generateQuestion(jobRole, [], resumeText || "Introduction", 0);
    
    interview.questions.push({
      questionText: firstQuestion,
    });
    
    await interview.save();

    res.status(201).json({
      interviewId: interview._id,
      question: firstQuestion
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInterviewResult = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(interview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user.id }).sort('-createdAt');
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
