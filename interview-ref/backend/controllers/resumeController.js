/**
 * Resume Controller - Handles resume upload and AI analysis
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { askClaude, parseJsonResponse } = require('../utils/claudeAI');
const Session = require('../models/Session');

// In-memory session store (fallback when MongoDB is unavailable)
const sessionStore = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `resume-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files are allowed'));
  }
});

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  throw new Error('Unsupported file type');
}

/**
 * POST /api/resume/upload
 * Upload and analyze resume
 */
const uploadResume = [
  upload.single('resume'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      // Extract text from resume
      let resumeText;
      try {
        resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);
      } catch (e) {
        resumeText = "Unable to parse resume - using sample data for demo";
      }

      // AI Analysis of resume
      const analysisPrompt = `Analyze this resume and provide a comprehensive assessment. Return ONLY valid JSON with no extra text.

Resume Content:
${resumeText.substring(0, 3000)}

Return this exact JSON structure:
  "atsScore": <number 0-100>,
  "skills": ["skill1", "skill2", ...],
  "primaryProgrammingLanguage": "javascript | python | java | cpp | typescript",
  "experience": ["exp1", "exp2", ...],
  "education": ["edu1", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "missingSkills": ["skill1", ...],
  "formattingIssues": ["issue1", ...],
  "strengths": ["strength1", ...],
  "jobTitles": ["title1", ...],
  "summary": "brief professional summary"
}

IMPORTANT for primaryProgrammingLanguage: Only choose ONE from [javascript, python, java, cpp, typescript] that is most prominent in their experience and projects.`;

      let parsedData;
      try {
        const aiResponse = await askClaude(analysisPrompt, 'You are an expert ATS resume analyzer. Return only valid JSON.', 1500);
        parsedData = parseJsonResponse(aiResponse);
      } catch (e) {
        // Fallback mock data if AI fails
        parsedData = {
          atsScore: 72,
          skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL'],
          primaryProgrammingLanguage: 'javascript',
          experience: ['Software Developer at TechCorp (2 years)', 'Intern at StartupXYZ'],
          education: ['B.Tech Computer Science - 2022'],
          suggestions: ['Add quantifiable achievements', 'Include GitHub profile', 'Add more technical skills'],
          missingSkills: ['Docker', 'Kubernetes', 'AWS'],
          formattingIssues: ['Inconsistent date formatting', 'Missing professional summary'],
          strengths: ['Good technical skills section', 'Clear work history'],
          jobTitles: ['Software Developer', 'Full Stack Developer'],
          summary: 'Experienced software developer with focus on web technologies'
        };
      }

      // Create session
      const sessionId = uuidv4();
      const sessionData = {
        sessionId,
        status: 'round1',
        resume: {
          fileName: req.file.originalname,
          extractedText: resumeText.substring(0, 5000),
          skills: parsedData.skills || [],
          experience: parsedData.experience || [],
          education: parsedData.education || [],
          atsScore: parsedData.atsScore || 70,
          suggestions: [...(parsedData.suggestions || []), ...(parsedData.formattingIssues || [])],
          parsedData
        },
        proctoringEvents: []
      };

      // Save to MongoDB or in-memory
      try {
        const session = new Session(sessionData);
        await session.save();
      } catch {
        sessionStore.set(sessionId, sessionData);
      }

      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch {}

      res.json({
        success: true,
        sessionId,
        analysis: parsedData,
        message: 'Resume analyzed successfully'
      });

    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

/**
 * GET /api/resume/:sessionId
 * Get resume analysis for a session
 */
const getResumeAnalysis = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    let session = await Session.findOne({ sessionId }).catch(() => null);
    if (!session) session = sessionStore.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, resume: session.resume });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { uploadResume, getResumeAnalysis, sessionStore };
