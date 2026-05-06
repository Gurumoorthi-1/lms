import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobRole: { type: String, default: 'Resume Based Interview' },
  resumeText: { type: String },
  status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
  questions: [{
    questionText: String,
    userAnswer: String,
    feedback: String,
    score: Number
  }],
  overallScore: { type: Number },
  overallFeedback: { type: String },
  metrics: {
    communication: Number,
    confidence: Number,
    clarity: Number
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

export default mongoose.model('Interview', interviewSchema);
