/**
 * Aptitude Controller - Manages aptitude test generation and submission
 */

const { askClaude, parseJsonResponse } = require('../utils/claudeAI');
const Session = require('../models/Session');
const { sessionStore } = require('./resumeController');

/**
 * Helper to get session from DB or memory
 */
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
 * Fisher-Yates Shuffle
 */
function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * POST /api/aptitude/generate
 * Generate aptitude questions based on resume
 */
const generateQuestions = async (req, res) => {
  try {
    const { sessionId, totalQuestions = 10 } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const numQuestions = Math.min(Math.max(parseInt(totalQuestions), 5), 50);
    const aptitudeCount = Math.round(numQuestions * 0.7);
    const resumeCount = numQuestions - aptitudeCount;
    const skills = (session.resume?.skills || ['Programming', 'Problem Solving']).slice(0, 5).join(', ');

    const prompt = `Generate ${numQuestions} multiple-choice questions for an interview aptitude test.
    
Candidate skills: ${skills}
- ${aptitudeCount} General Aptitude questions (logical reasoning, math, verbal, data interpretation)
- ${resumeCount} Technical/Resume-based questions on: ${skills}

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "question": "question text",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctAnswer": 0,
    "hint": "helpful hint",
    "category": "aptitude",
    "difficulty": "medium",
    "explanation": "why this answer is correct"
  }
]

correctAnswer is 0-indexed. Make questions realistic and varied.`;

    let questions;
    try {
      const aiResponse = await askClaude(prompt, 'You are an expert test designer. Return only valid JSON array.', 3000);
      questions = parseJsonResponse(aiResponse);
    } catch (e) {
      // Fallback questions
      questions = generateFallbackQuestions(numQuestions, aptitudeCount);
    }

    // Validate and fix questions
    questions = questions.slice(0, numQuestions).map((q, i) => ({
      id: q.id || `q${i + 1}`,
      question: q.question,
      options: q.options || ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      hint: q.hint || 'Think carefully about the fundamentals.',
      category: i < aptitudeCount ? 'aptitude' : 'resume-based',
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation || ''
    }));

    // Shuffle questions and their options
    questions = shuffle(questions).map(q => {
      const originalCorrect = q.options[q.correctAnswer];
      const shuffledOptions = shuffle(q.options);
      return {
        ...q,
        options: shuffledOptions,
        correctAnswer: shuffledOptions.indexOf(originalCorrect)
      };
    });

    // Save to session
    if (session.aptitude === undefined) session.aptitude = {};
    session.aptitude.totalQuestions = numQuestions;
    session.aptitude.questions = questions;
    await saveSession(session);

    res.json({
      success: true,
      questions,
      totalQuestions: numQuestions,
      aptitudeCount,
      resumeCount,
      timeLimit: numQuestions * 60 // 1 minute per question
    });

  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/aptitude/submit
 * Submit aptitude test answers
 */
const submitTest = async (req, res) => {
  try {
    const { sessionId, answers, timeSpent } = req.body;
    
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const questions = session.aptitude?.questions || [];
    let rawScore = 0;
    let maxScore = questions.length;
    const processedAnswers = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;
      
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      const hintPenalty = answer.usedHint ? 0.5 : 0;
      const questionScore = isCorrect ? Math.max(1 - hintPenalty, 0.5) : 0;
      
      rawScore += questionScore;
      processedAnswers.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        usedHint: answer.usedHint || false,
        score: questionScore,
        explanation: question.explanation
      });
    }

    const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;
    const passed = percentage >= 50;

    // Update session
    session.aptitude.answers = processedAnswers;
    session.aptitude.score = Math.round(rawScore * 10) / 10;
    session.aptitude.maxScore = maxScore;
    session.aptitude.passed = passed;
    session.aptitude.completedAt = new Date();
    session.status = 'round2';
    await saveSession(session);

    res.json({
      success: true,
      score: Math.round(rawScore * 10) / 10,
      maxScore,
      percentage: Math.round(percentage),
      passed,
      processedAnswers,
      message: passed ? '🎉 Congratulations! You passed Round 1!' : '❌ You did not pass Round 1. Better luck next time!'
    });

  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fallback question generator
 */
function generateFallbackQuestions(total, aptitudeCount) {
  const aptitudeQs = [
    { question: "If a train travels 120 km in 2 hours, what is its speed?", options: ["A) 50 km/h", "B) 60 km/h", "C) 70 km/h", "D) 80 km/h"], correctAnswer: 1, hint: "Speed = Distance / Time", category: "aptitude" },
    { question: "Choose the odd one: Apple, Mango, Carrot, Banana", options: ["A) Apple", "B) Mango", "C) Carrot", "D) Banana"], correctAnswer: 2, hint: "Think about categories", category: "aptitude" },
    { question: "What comes next: 2, 4, 8, 16, ?", options: ["A) 24", "B) 30", "C) 32", "D) 36"], correctAnswer: 2, hint: "Look at the pattern of multiplication", category: "aptitude" },
    { question: "If 5 workers complete a task in 10 days, how many days for 10 workers?", options: ["A) 3", "B) 4", "C) 5", "D) 6"], correctAnswer: 2, hint: "More workers = less time (inverse proportion)", category: "aptitude" },
    { question: "Choose the synonym of 'Verbose': ", options: ["A) Silent", "B) Wordy", "C) Brief", "D) Concise"], correctAnswer: 1, hint: "Verbose means using too many words", category: "aptitude" },
  ];
  
  const techQs = [
    { question: "What does REST stand for in web development?", options: ["A) Representational State Transfer", "B) Remote Server Technology", "C) Real-time Event Streaming", "D) Resource State Transaction"], correctAnswer: 0, hint: "It's an architectural style for APIs", category: "resume-based" },
    { question: "Which data structure uses LIFO (Last In First Out)?", options: ["A) Queue", "B) Array", "C) Stack", "D) Linked List"], correctAnswer: 2, hint: "Think of a stack of plates", category: "resume-based" },
    { question: "What is the time complexity of binary search?", options: ["A) O(n)", "B) O(n²)", "C) O(log n)", "D) O(1)"], correctAnswer: 2, hint: "It halves the search space each time", category: "resume-based" },
  ];

  const questions = [];
  for (let i = 0; i < total; i++) {
    const isAptitude = i < aptitudeCount;
    const source = isAptitude ? aptitudeQs : techQs;
    const q = source[i % source.length];
    questions.push({ ...q, id: `q${i + 1}`, difficulty: 'medium', explanation: '', hint: q.hint || 'Think carefully' });
  }
  return questions;
}

module.exports = { generateQuestions, submitTest };
