/**
 * Interview Controller - AI HR Interview Round
 */

const { askClaude, parseJsonResponse } = require('../utils/claudeAI');
const Session = require('../models/Session');
const { sessionStore } = require('./resumeController');

async function getSession(sessionId) {
  let session = await Session.findOne({ sessionId }).catch(() => null);
  if (!session) session = sessionStore.get(sessionId);
  return session;
}

async function saveSession(session) {
  if (session.save) {
    await session.save().catch(() => sessionStore.set(session.sessionId, session));
  } else {
    sessionStore.set(session.sessionId, session);
  }
}

/**
 * POST /api/interview/generate-questions
 * Generate HR interview questions
 */
const generateQuestions = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const skills = (session.resume?.skills || []).slice(0, 5).join(', ');
    const experience = (session.resume?.experience || []).slice(0, 3).join('; ');

    const prompt = `Generate 8 HR interview questions for a candidate with these details:
Skills: ${skills}
Experience: ${experience}

Create a mix of:
- 1 Self-introduction prompt
- 2 Experience-based questions
- 2 Behavioral questions (STAR format)
- 2 Resume/skills-specific questions
- 1 Future goals question

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "question": "Tell me about yourself and your background.",
    "type": "intro",
    "expectedDuration": 120,
    "followUps": ["What are your key achievements?", "Why are you interested in this role?"],
    "evaluationCriteria": "Communication, self-awareness, relevance"
  }
]`;

    let questions;
    try {
      const aiResponse = await askClaude(prompt, 'You are an expert HR interviewer. Return only valid JSON array.', 2000);
      questions = parseJsonResponse(aiResponse);
    } catch (e) {
      questions = getFallbackQuestions(skills);
    }

    questions = questions.slice(0, 8).map((q, i) => ({
      id: q.id || `iq${i + 1}`,
      question: q.question,
      type: q.type || 'behavioral',
      expectedDuration: q.expectedDuration || 90,
      followUps: q.followUps || [],
      evaluationCriteria: q.evaluationCriteria || 'Clarity, relevance, examples'
    }));

    if (!session.interview) session.interview = {};
    session.interview.questions = questions;
    session.interview.responses = [];
    await saveSession(session);

    res.json({ success: true, questions });

  } catch (error) {
    console.error('Generate interview questions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/interview/analyze-response
 * Analyze a candidate's spoken/typed response
 */
const analyzeResponse = async (req, res) => {
  try {
    const { sessionId, questionId, answer, question } = req.body;

    if (!answer || answer.trim().length < 10) {
      return res.json({
        success: true,
        score: 0,
        analysis: 'No meaningful response provided.',
        followUp: 'Could you please elaborate on your answer?',
        strengths: [],
        improvements: ['Provide a detailed response', 'Use the STAR method for behavioral questions']
      });
    }

    const prompt = `Analyze this interview response and provide feedback. Return ONLY valid JSON.

Question: ${question}
Answer: ${answer}

Return JSON:
{
  "score": <0-10>,
  "analysis": "detailed analysis paragraph",
  "followUp": "relevant follow-up question",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "keywords": ["key concepts mentioned"]
}`;

    let analysis;
    try {
      const aiResponse = await askClaude(prompt, 'You are an expert HR interviewer evaluating candidates. Return only valid JSON.', 800);
      analysis = parseJsonResponse(aiResponse);
    } catch (e) {
      analysis = {
        score: 6,
        analysis: 'The candidate provided a reasonable response with relevant information.',
        followUp: 'Can you provide a specific example from your experience?',
        strengths: ['Clear communication', 'Relevant experience mentioned'],
        improvements: ['Add more specific examples', 'Quantify achievements'],
        keywords: []
      };
    }

    // Save response
    const session = await getSession(sessionId);
    if (session) {
      if (!session.interview) session.interview = { questions: [], responses: [] };
      if (!session.interview.responses) session.interview.responses = [];
      
      session.interview.responses = session.interview.responses.filter(r => r.questionId !== questionId);
      session.interview.responses.push({
        questionId,
        answer,
        aiAnalysis: analysis.analysis,
        score: analysis.score
      });
      await saveSession(session);
    }

    res.json({ success: true, ...analysis });

  } catch (error) {
    console.error('Analyze response error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/interview/complete
 * Complete interview and calculate final score
 */
const completeInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const responses = session.interview?.responses || [];
    const avgScore = responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.score || 0), 0) / responses.length
      : 5;

    const passed = avgScore >= 5;

    session.interview.overallScore = Math.round(avgScore * 10) / 10;
    session.interview.passed = passed;
    session.interview.completedAt = new Date();
    session.status = 'completed';
    await saveSession(session);

    res.json({
      success: true,
      overallScore: Math.round(avgScore * 10) / 10,
      maxScore: 10,
      passed,
      message: passed ? '🎉 Interview completed successfully!' : 'Interview completed. Keep practicing!'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getFallbackQuestions(skills) {
  return [
    { id: 'iq1', question: 'Tell me about yourself and your professional background.', type: 'intro', expectedDuration: 120, followUps: ['What motivates you?'], evaluationCriteria: 'Communication, clarity' },
    { id: 'iq2', question: `How have you used ${skills || 'your technical skills'} in your previous projects?`, type: 'experience', expectedDuration: 90, followUps: ['What challenges did you face?'], evaluationCriteria: 'Technical depth, examples' },
    { id: 'iq3', question: 'Describe a situation where you had to work under pressure to meet a deadline.', type: 'behavioral', expectedDuration: 120, followUps: ['What was the outcome?'], evaluationCriteria: 'Problem-solving, stress management' },
    { id: 'iq4', question: 'Tell me about a time you disagreed with a team member. How did you handle it?', type: 'behavioral', expectedDuration: 90, followUps: ['What did you learn?'], evaluationCriteria: 'Communication, conflict resolution' },
    { id: 'iq5', question: 'What is your greatest professional achievement so far?', type: 'experience', expectedDuration: 90, followUps: ['How did it impact your team?'], evaluationCriteria: 'Impact, initiative' },
    { id: 'iq6', question: `Walk me through a complex problem you solved using ${skills?.split(',')[0] || 'your skills'}.`, type: 'resume-based', expectedDuration: 120, followUps: ['What alternatives did you consider?'], evaluationCriteria: 'Technical thinking, communication' },
    { id: 'iq7', question: 'How do you stay updated with new technologies and industry trends?', type: 'resume-based', expectedDuration: 60, followUps: [], evaluationCriteria: 'Learning mindset, curiosity' },
    { id: 'iq8', question: 'Where do you see yourself professionally in the next 3-5 years?', type: 'goals', expectedDuration: 60, followUps: [], evaluationCriteria: 'Ambition, alignment' }
  ];
}

module.exports = { generateQuestions, analyzeResponse, completeInterview };
