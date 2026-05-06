/**
 * Session Model - Extended for Features 1, 2, 3
 */
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  status: {
    type: String,
    enum: ['active', 'round1', 'round2', 'round3', 'completed'],
    default: 'active',
  },

  resume: {
    fileName: String,
    extractedText: String,
    skills: [String],
    experience: [String],
    education: [String],
    atsScore: Number,
    suggestions: [String],
    parsedData: mongoose.Schema.Types.Mixed,
  },

  aptitude: {
    totalQuestions: Number,
    questions: [{
      id: String, question: String, options: [String],
      correctAnswer: Number, hint: String, category: String, difficulty: String,
    }],
    answers: [{
      questionId: String, selectedAnswer: Number, usedHint: Boolean, timeSpent: Number,
    }],
    score: Number, maxScore: Number, passed: Boolean, completedAt: Date,
  },

  // Feature 2 extended: detectedLanguage stored
  coding: {
    questions: [{
      id: String, title: String, description: String,
      examples: [{ input: String, output: String, explanation: String }],
      constraints: [String], difficulty: String, tags: [String],
      starterCode: mongoose.Schema.Types.Mixed,
      testCases: [{ input: String, expectedOutput: String, isHidden: Boolean }],
      resumeRelevance: String,  // Feature 2
    }],
    submissions: [{
      questionId: String, language: String, code: String,
      passed: Boolean, testResults: mongoose.Schema.Types.Mixed, submittedAt: Date,
    }],
    score: Number, passed: Boolean, completedAt: Date,
    detectedLanguage: String,  // Feature 2: auto-detected from resume
  },

  interview: {
    questions: [{ id: String, question: String, type: String, followUps: [String] }],
    responses: [{ questionId: String, answer: String, aiAnalysis: String, score: Number }],
    overallScore: Number, passed: Boolean, completedAt: Date,
  },

  analytics: {
    overallScore: Number, overallPassed: Boolean,
    roundScores: { round1: Number, round2: Number, round3: Number },
    strengths: [String], weaknesses: [String], improvements: [String],
    skillGaps: [String], aiFeedback: String,
    recommendedResources: [String], nextSteps: [String],
    generatedAt: Date,
  },

  // Feature 1: proctoring events (object detection violations stored here)
  proctoringEvents: [{
    eventType: String,      // e.g. 'phone', 'multi_person', 'no_face', 'book', 'tab_switch'
    message: String,
    severity: String,  // 'warning' | 'critical' | 'error'
    timestamp: Date,
    round: String,
  }],

  // Feature 3: emotion report stored at end of HR interview
  emotionReport: {
    avgConf: Number,
    avgNerv: Number,
    dominantOverall: String,
    nervTrend: String,
    suggestions: [String],
    totalSamples: Number,
    savedAt: Date,
  },

}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
