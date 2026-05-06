const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  challengeId: { type: Number, required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: { type: String, enum: ['accepted', 'wrong_answer', 'error'], required: true },
  output: { type: String },
  executionTime: { type: Number },
  submittedAt: { type: Date, default: Date.now }
});

const progressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  solvedChallenges: [{ type: Number }],
  submissions: [submissionSchema],
  totalPoints: { type: Number, default: 0 },
  freeRunCount: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
